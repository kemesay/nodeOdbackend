/**
 * Safety net for Square's silent authorization-hold expiry.
 *
 * Root cause this exists to close: production runs PAYMENT_MODE=
 * authorize_capture, so every Square booking sits as an authorization hold
 * until an admin manually clicks "Take Payment" — there was previously no
 * tracking, reminder, or automation of any kind for this, and Square
 * auto-cancels a hold that isn't captured within its own window (documented
 * as up to ~6 days). If nobody happened to click in time, the hold died
 * silently, and recharging afterward only works if a genuine saved card
 * exists (see the wrong-gate fix in chargeSavedCardForBooking).
 *
 * This job finds every booking whose LATEST payment transaction is still
 * AUTHORIZED and old enough to be at real risk. What it does next depends on
 * how far away the trip actually is:
 *  - Trip is soon (within RENEW_IF_TRIP_MORE_THAN_DAYS_AWAY days): capture
 *    now, through the exact same paymentStatusUpdate() path the admin's
 *    "Take Payment" button uses — so every recovery rule already proven
 *    there (saved-card fallback, paymentMethod back-fill, customer
 *    notification email) applies here too.
 *  - Trip is still well in the future (e.g. booked 2+ weeks out): capturing
 *    now would bill the customer 10+ days before their ride, which is the
 *    wrong default — instead, renew the hold (cancel the stale one, open a
 *    fresh one for the same amount against a real saved card) and leave the
 *    actual capture for a later run of this same job, closer to the trip.
 *    Falls back to capturing early only when there's truly no saved card to
 *    renew against (see renewAuthorizationForBooking's own doc comment).
 *
 * Deliberately opt-in (ENABLE_PAYMENT_EXPIRY_GUARD=true) rather than
 * always-on — this is the one place in the app where money can move
 * without a human clicking a button first, and that's a decision this app's
 * operators should make consciously rather than inherit silently from a
 * code change.
 *
 * Usage: require and call registerPaymentAuthExpiryGuard() once at server
 * boot (see src/app.js). Does nothing unless the env var is set.
 */
const cron = require("node-cron");
const { Op } = require("sequelize");
const logger = require("../config/logging.js");
const { PaymentTransaction } = require("../models/PaymentTransaction.js");
const {
  paymentStatusUpdate,
  getBooking,
} = require("../services/admin/bookingService.js");
const {
  renewAuthorizationForBooking,
} = require("../services/payments/bookingSquarePayment.js");

// Square's own limit is documented as up to ~6 days; capturing a day early
// leaves a full day of safety margin against clock drift, job-run timing,
// and weekend/holiday gaps in admin coverage.
const CAPTURE_BEFORE_DAYS = 5;

// Below this many days-until-trip, capture now rather than renew — close
// enough to the ride that billing now is the normal, expected timing anyway,
// and there'd be little runway left to renew again before the trip happens.
const RENEW_IF_TRIP_MORE_THAN_DAYS_AWAY = 2;

// Every 6 hours — frequent enough that a booking is never more than a few
// hours past its capture-by threshold, without hammering Square or the DB.
const SCHEDULE = "0 */6 * * *";

/**
 * Every (bookingType, bookingId) whose truly-latest transaction is still
 * AUTHORIZED and older than the capture-by threshold. A booking can
 * accumulate more than one transaction row over its lifetime (e.g. a fare
 * change reconciles into a new one) — only the latest reflects its real
 * current state, so candidates are re-checked against it rather than acted
 * on directly from the initial scan.
 */
async function findAtRiskBookings() {
  const cutoff = new Date(Date.now() - CAPTURE_BEFORE_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await PaymentTransaction.findAll({
    where: { status: "AUTHORIZED", createdAt: { [Op.lte]: cutoff } },
    attributes: ["bookingType", "bookingId"],
    group: ["bookingType", "bookingId"],
  });

  const atRisk = [];
  for (const { bookingType, bookingId } of candidates) {
    const latest = await PaymentTransaction.findOne({
      where: { bookingType, bookingId },
      order: [["createdAt", "DESC"]],
    });
    if (latest?.status === "AUTHORIZED" && latest.createdAt <= cutoff) {
      atRisk.push({ bookingType, bookingId });
    }
  }
  return atRisk;
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
}

/**
 * Trip still well in the future: try to renew the hold instead of capturing
 * early. Returns true if the renewal actually happened (nothing more to do
 * this run — the next run, closer to the trip, will capture normally),
 * false if there was no saved card to renew against (caller should fall
 * back to capturing now).
 */
async function tryRenew({ booking, bookingType, bookingId }) {
  const tx = await PaymentTransaction.findOne({
    where: { bookingType, bookingId },
    order: [["createdAt", "DESC"]],
  });
  if (tx?.status !== "AUTHORIZED") {
    // Already resolved by something else since the scan — nothing to renew.
    return true;
  }

  const renewed = await renewAuthorizationForBooking({
    booking,
    ledgerBookingType: bookingType,
    bookingId,
    amount: booking.totalTripFeeInDollars,
    tx,
  });

  return Boolean(renewed);
}

async function runPaymentAuthExpiryGuard() {
  let atRisk;
  try {
    atRisk = await findAtRiskBookings();
  } catch (err) {
    logger.error(
      `[paymentAuthExpiryGuard] Failed to query at-risk bookings: ${err.message}`
    );
    return;
  }

  if (atRisk.length === 0) return;

  logger.info(
    `[paymentAuthExpiryGuard] ${atRisk.length} booking(s) at risk of an expiring Square hold.`
  );

  for (const { bookingType, bookingId } of atRisk) {
    try {
      const booking = await getBooking(bookingId, bookingType);
      const tripDaysAway = daysUntil(booking?.pickupDateTime);

      if (tripDaysAway != null && tripDaysAway > RENEW_IF_TRIP_MORE_THAN_DAYS_AWAY) {
        const renewed = await tryRenew({ booking, bookingType, bookingId });
        if (renewed) {
          logger.info(
            `[paymentAuthExpiryGuard] Renewed hold for ${bookingType} #${bookingId} — trip is still ${Math.round(tripDaysAway)} day(s) away, not captured early.`
          );
          continue;
        }
        logger.info(
          `[paymentAuthExpiryGuard] No saved card to renew ${bookingType} #${bookingId} — capturing early as a fallback even though the trip is ${Math.round(tripDaysAway)} day(s) away.`
        );
      }

      await paymentStatusUpdate({ bookingId, bookingType });
      logger.info(
        `[paymentAuthExpiryGuard] Captured ${bookingType} #${bookingId} ahead of hold expiry.`
      );
    } catch (err) {
      // Same dead end the admin "Take Payment" button hits manually (e.g. a
      // guest booking with no saved card to fall back to) — logged loudly so
      // an admin can follow up with the customer while the booking is still
      // fresh, rather than discovering it only after the trip.
      logger.error(
        `[paymentAuthExpiryGuard] Could not resolve ${bookingType} #${bookingId}: ${err.message}`
      );
    }
  }
}

function registerPaymentAuthExpiryGuard() {
  if (String(process.env.ENABLE_PAYMENT_EXPIRY_GUARD || "").toLowerCase() !== "true") {
    logger.info(
      "[paymentAuthExpiryGuard] Disabled (set ENABLE_PAYMENT_EXPIRY_GUARD=true to enable)."
    );
    return;
  }

  cron.schedule(SCHEDULE, () => {
    runPaymentAuthExpiryGuard().catch((err) =>
      logger.error(`[paymentAuthExpiryGuard] Unexpected failure: ${err.message}`)
    );
  });
  logger.info(
    `[paymentAuthExpiryGuard] Enabled — checking every 6 hours for holds older than ${CAPTURE_BEFORE_DAYS} days.`
  );
}

module.exports = {
  registerPaymentAuthExpiryGuard,
  runPaymentAuthExpiryGuard,
  findAtRiskBookings,
};
