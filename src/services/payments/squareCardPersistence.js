const { Op } = require("sequelize");
const { PaymentDetail } = require("../../models/PaymentDetail.js");
const {
  createSquareCustomer,
  createCardOnFile,
  getPayment,
} = require("./squarePaymentService.js");
const logger = require("../../config/logging.js");

function asString(value) {
  if (value == null || value === "") return null;
  return String(value);
}

function formatExpirationDate(expMonth, expYear) {
  if (expMonth == null || expYear == null) return null;
  const mm = String(expMonth).padStart(2, "0");
  const yy = String(expYear).slice(-2);
  return `${mm}/${yy}`;
}

/**
 * Normalize card metadata from a Square Payment API object (camelCase or snake_case).
 */
function extractCardMetaFromPayment(payment) {
  const details = payment?.cardDetails || payment?.card_details;
  const card = details?.card;
  if (!card) return null;

  return {
    cardBrand: card.cardBrand || card.card_brand || null,
    last4: card.last4 || card.last_4 || null,
    expMonth: card.expMonth ?? card.exp_month ?? null,
    expYear: card.expYear ?? card.exp_year ?? null,
    cardholderName: card.cardholderName || card.cardholder_name || null,
    billingPostalCode:
      card.billingAddress?.postalCode ||
      card.billing_address?.postal_code ||
      null,
    fingerprint: card.fingerprint || null,
    squareCardId: card.id && String(card.id).startsWith("ccof:") ? card.id : null,
  };
}

async function findExistingSquareCardRow({
  userId,
  squareCardId,
  last4,
  expMonth,
  expYear,
}) {
  if (squareCardId) {
    const bySquareId = await PaymentDetail.findOne({ where: { squareCardId } });
    if (bySquareId) return bySquareId;
  }

  if (userId && last4 && expMonth != null && expYear != null) {
    return PaymentDetail.findOne({
      where: { userId, last4, expMonth, expYear },
      order: [["updatedAt", "DESC"]],
    });
  }

  return null;
}

async function ensureSquareCustomerForUser(userId, hints = {}) {
  if (!userId) return null;

  const existingWithCustomer = await PaymentDetail.findOne({
    where: { userId, squareCustomerId: { [Op.ne]: null } },
    order: [["updatedAt", "DESC"]],
  });
  if (existingWithCustomer?.squareCustomerId) {
    return existingWithCustomer.squareCustomerId;
  }

  const ownerName =
    hints.cardOwnerName || hints.passengerFullName || "Cardholder";
  const nameParts = String(ownerName).trim().split(/\s+/);

  return createSquareCustomer({
    emailAddress:
      hints.email ||
      hints.passengerEmail ||
      `user${userId}@guest.odatransportation.local`,
    givenName: nameParts[0] || "Cardholder",
    familyName: nameParts.slice(1).join(" ") || "User",
    referenceId: userId,
  });
}

function buildCardOwnerName(meta, cardHints, existingPaymentDetail) {
  return (
    cardHints.cardOwnerName ||
    meta?.cardholderName ||
    cardHints.passengerFullName ||
    existingPaymentDetail?.cardOwnerName ||
    "Cardholder"
  );
}

function buildZipCode(meta, cardHints, existingPaymentDetail) {
  return (
    cardHints.zipCode ||
    meta?.billingPostalCode ||
    existingPaymentDetail?.zipCode ||
    "00000"
  );
}

/**
 * Shared tail end of both "save a card" paths below: given whatever card
 * metadata and Square ids are known, upsert the local PaymentDetail row —
 * matching an existing row by squareCardId first, then by
 * userId+last4+expiry, falling back to a brand-new row. Pulled out so
 * persistSquareCardFromPayment (after-the-fact, best-effort) and
 * persistSquareCardFromNonce (up-front, deterministic — see below) don't
 * duplicate this matching/upsert logic.
 */
async function upsertPaymentDetailFromCard({
  userId,
  squareCustomerId,
  squareCardId,
  meta,
  cardHints = {},
  existingPaymentDetail = null,
}) {
  const payload = {
    squareCustomerId,
    squareCardId: squareCardId || existingPaymentDetail?.squareCardId || null,
    cardBrand: meta?.cardBrand || existingPaymentDetail?.cardBrand || null,
    last4: meta?.last4 || existingPaymentDetail?.last4 || null,
    expMonth: meta?.expMonth ?? existingPaymentDetail?.expMonth ?? null,
    expYear: meta?.expYear ?? existingPaymentDetail?.expYear ?? null,
    expirationDate:
      formatExpirationDate(
        meta?.expMonth ?? existingPaymentDetail?.expMonth,
        meta?.expYear ?? existingPaymentDetail?.expYear
      ) || existingPaymentDetail?.expirationDate,
    cardOwnerName: buildCardOwnerName(meta, cardHints, existingPaymentDetail),
    zipCode: buildZipCode(meta, cardHints, existingPaymentDetail),
    creditCardNumber: null,
    securityCode: null,
  };

  if (existingPaymentDetail?.paymentDetailId) {
    await existingPaymentDetail.update(payload);
    return existingPaymentDetail;
  }

  const matched = await findExistingSquareCardRow({
    userId,
    squareCardId: payload.squareCardId,
    last4: payload.last4,
    expMonth: payload.expMonth,
    expYear: payload.expYear,
  });
  if (matched) {
    await matched.update(payload);
    return matched;
  }

  if (!userId && !payload.squareCardId) {
    return existingPaymentDetail;
  }

  return PaymentDetail.create({
    userId: userId || null,
    isPrimary: false,
    ...payload,
  });
}

/**
 * After any successful Square payment — an authorization (the normal booking
 * path, PAYMENT_MODE=authorize_capture) or an immediate capture alike —
 * persist card-on-file metadata locally, so a one-time SQUARE_NEW_CARD
 * booking already has a real, chargeable saved card the moment it's placed.
 * This is what lets both the recharge fallback (chargeSavedCardForBooking)
 * and the hold-renewal job (paymentAuthExpiryGuard's renewAuthorizationForBooking,
 * for a trip still days away) work silently, with no customer action, instead
 * of hitting a dead end. A failure here is now logged loudly (not just a
 * console.warn) precisely because of that new dependency — a quiet failure
 * used to just mean "no saved card as a nice-to-have fallback"; now it means
 * "this booking's hold can't be renewed and will bill early as a fallback."
 *
 * This is now the FALLBACK save path (after the charge), kept for payment
 * methods other than a fresh nonce (e.g. recovering a card from an old
 * transaction) — see persistSquareCardFromNonce for the up-front path that
 * now handles the common SQUARE_NEW_CARD-at-booking-time case instead.
 *
 * Uses payment.id as source_id for Create Card when the original charge was a nonce.
 */
async function persistSquareCardFromPayment({
  payment,
  userId,
  existingPaymentDetail = null,
  cardHints = {},
}) {
  if (!payment?.id) return existingPaymentDetail;

  const meta = extractCardMetaFromPayment(payment);
  if (!meta && !existingPaymentDetail?.squareCardId) {
    return existingPaymentDetail;
  }

  let squareCustomerId =
    existingPaymentDetail?.squareCustomerId ||
    payment.customer_id ||
    payment.customerId ||
    null;

  if (!squareCustomerId && userId) {
    squareCustomerId = await ensureSquareCustomerForUser(userId, cardHints);
  }

  let squareCardId =
    existingPaymentDetail?.squareCardId || meta?.squareCardId || null;

  if (!String(squareCardId || "").startsWith("ccof:") && squareCustomerId) {
    try {
      const card = await createCardOnFile({
        customerId: squareCustomerId,
        sourceId: payment.id,
        cardholderName: buildCardOwnerName(meta, cardHints, existingPaymentDetail),
        postalCode: buildZipCode(meta, cardHints, existingPaymentDetail),
        referenceId: userId,
      });
      squareCardId = card.squareCardId;
      meta.cardBrand = meta.cardBrand || card.cardBrand;
      meta.last4 = meta.last4 || card.last4;
      meta.expMonth = meta.expMonth ?? card.expMonth;
      meta.expYear = meta.expYear ?? card.expYear;
    } catch (err) {
      logger.warn(
        `[squareCardPersistence] Could not create card on file from payment ${payment.id}: ${err.message}`
      );
    }
  }

  return upsertPaymentDetailFromCard({
    userId,
    squareCustomerId,
    squareCardId,
    meta,
    cardHints,
    existingPaymentDetail,
  });
}

/**
 * Saves a freshly-tokenized card BEFORE it's ever charged, for a signed-in
 * customer paying with "add new card" — the up-front counterpart to
 * persistSquareCardFromPayment's after-the-fact best effort. This is
 * Square's own recommended order for "charge now, keep this card for later":
 * create the Card on File from the nonce first, then charge the resulting
 * ccof: id, rather than charging the raw nonce and hoping the save succeeds
 * afterward. Guarantees a real saved card exists before the FIRST
 * authorization is even attempted — which is exactly what the payment-hold
 * renewal job and the recharge fallback both depend on, closing off the rare
 * "no saved card to fall back to" case at the source instead of patching
 * around it after the fact.
 *
 * Returns null (never throws) on any failure — a card that genuinely can't
 * be saved (rare, but possible) must never block the booking itself; the
 * caller falls back to charging the raw nonce directly, exactly like before
 * this existed.
 */
/**
 * Thrown when a Square card nonce was already sent to Square's /v2/cards
 * endpoint and must be treated as spent, win or lose — Square consumes a
 * nonce as soon as it's submitted to any source_id-accepting endpoint,
 * regardless of whether that call itself succeeds. A caller must never
 * retry a charge with this same sourceId after catching this error.
 */
class SquareNonceConsumedError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "SquareNonceConsumedError";
    this.cause = cause;
  }
}

async function persistSquareCardFromNonce({ userId, sourceId, cardHints = {} }) {
  if (!userId || !sourceId) return null;

  let customerId;
  try {
    // Pure customer-record lookup/creation — never touches sourceId, so a
    // failure here leaves the nonce untouched and still chargeable.
    customerId = await ensureSquareCustomerForUser(userId, cardHints);
  } catch (err) {
    logger.warn(
      `[squareCardPersistence] Could not resolve Square customer for user ${userId}: ${err.message} — falling back to charging the nonce directly.`
    );
    return null;
  }
  if (!customerId) return null;

  let card;
  try {
    card = await createCardOnFile({
      customerId,
      sourceId,
      cardholderName: buildCardOwnerName(null, cardHints, null),
      postalCode: buildZipCode(null, cardHints, null),
      referenceId: userId,
    });
  } catch (err) {
    // The nonce was just submitted to Square's /v2/cards endpoint and is
    // now spent, whether or not that call succeeded. Charging it again
    // (even via a fresh idempotency key) will always fail with Square's
    // CARD_TOKEN_USED — so this must surface as a hard failure instead of
    // falling back to "charge the raw nonce," which used to guarantee a
    // second, doomed Square call.
    throw new SquareNonceConsumedError(
      `Could not save new card up front for user ${userId}: ${err.message}`,
      err
    );
  }

  const meta = {
    cardBrand: card.cardBrand,
    last4: card.last4,
    expMonth: card.expMonth,
    expYear: card.expYear,
  };

  try {
    return await upsertPaymentDetailFromCard({
      userId,
      squareCustomerId: customerId,
      squareCardId: card.squareCardId,
      meta,
      cardHints,
    });
  } catch (err) {
    // The card was already created successfully at Square by this point —
    // only our own local bookkeeping failed. Don't throw away a perfectly
    // good card id; charge it, and let the existing after-the-fact
    // persistSquareCardFromPayment path reconcile the DB row once the
    // payment itself completes.
    logger.warn(
      `[squareCardPersistence] Card ${card.squareCardId} was created at Square but saving it locally failed for user ${userId}: ${err.message}`
    );
    return {
      squareCardId: card.squareCardId,
      squareCustomerId: customerId,
      ...meta,
    };
  }
}

/**
 * Rebuild a chargeable PaymentDetail from a ledger row (e.g. canceled authorization).
 */
async function recoverPaymentDetailFromTransaction(tx, { userId, cardHints } = {}) {
  if (!tx?.squarePaymentId) return null;

  let payment = tx.rawResponse;
  if (!payment?.cardDetails && !payment?.card_details) {
    try {
      payment = await getPayment(tx.squarePaymentId);
    } catch (err) {
      logger.warn(
        `[squareCardPersistence] Could not fetch payment ${tx.squarePaymentId}: ${err.message}`
      );
      payment = tx.rawResponse;
    }
  }

  if (!payment?.id) return null;

  const meta = extractCardMetaFromPayment(payment);
  const existing = await findExistingSquareCardRow({
    userId,
    squareCardId: meta?.squareCardId,
    last4: meta?.last4,
    expMonth: meta?.expMonth,
    expYear: meta?.expYear,
  });

  return persistSquareCardFromPayment({
    payment,
    userId,
    existingPaymentDetail: existing,
    cardHints,
  });
}

// Square auto-cancels an authorization hold once its capture window elapses
// (documented as up to ~6 days for a card authorization) — there's no
// separate structured error code for this in the response text this app
// preserves (squareFetch() only keeps the joined detail/code string, not
// Square's raw machine-readable error code), so recognizing it is
// necessarily a message-text match. Widened beyond a bare "canceled"
// substring to also catch Square's other common phrasings for the same
// underlying situation (an authorization that can no longer be captured),
// so a slightly different wording doesn't leak a raw Square error to the
// admin instead of falling through to the saved-card retry path.
function isCanceledSquarePaymentError(err) {
  const msg = String(err?.message || "").toLowerCase();
  // Deliberately does NOT match "already captured"/"already completed" —
  // that means the charge actually succeeded, and treating it as
  // cancel-and-retry would double-charge the customer.
  return (
    msg.includes("canceled") ||
    msg.includes("cancelled") ||
    msg.includes("expired")
  );
}

module.exports = {
  extractCardMetaFromPayment,
  ensureSquareCustomerForUser,
  persistSquareCardFromPayment,
  persistSquareCardFromNonce,
  recoverPaymentDetailFromTransaction,
  isCanceledSquarePaymentError,
  SquareNonceConsumedError,
};
