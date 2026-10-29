const {
  WalletCredit,
  WalletCreditRedemption,
  WalletCashOutRequest,
} = require("../models/WalletCredit.js");
const { ReferralReward } = require("../models/PromoCode.js");
const { User } = require("../models/user/User.js");
const { ValidationError, ResourceNotFoundError } = require("../errors/CustomErrors.js");

function round(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Ledger bookingType ("P2P"/"AIRPORT"/"HOURLY", see paymentBookingType.js) -> the
 * display-style bookingType used by PromoCode/ReferralReward/WalletCreditRedemption
 * ("Point to point"/"Airport Service"/"Hourly Charter"). The payments layer and the
 * promo/referral/wallet layer have always used two different vocabularies for the
 * same three booking types; this is the one place they need to cross. */
const LEDGER_TO_DISPLAY_BOOKING_TYPE = {
  P2P: "Point to point",
  AIRPORT: "Airport Service",
  HOURLY: "Hourly Charter",
};

/** Sum of everything still spendable across this user's lots. */
async function getWalletBalance(userId) {
  const lots = await WalletCredit.findAll({
    where: { userId, status: "active" },
    attributes: ["remainingAmount"],
  });
  return round(lots.reduce((sum, lot) => sum + Number(lot.remainingAmount), 0));
}

/** Balance + lifetime totals + lot history, for the account page and admin view. */
async function getWalletSummary(userId) {
  const lots = await WalletCredit.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });

  let balance = 0;
  let lifetimeEarned = 0;
  for (const lot of lots) {
    if (lot.status === "active") balance += Number(lot.remainingAmount);
    if (lot.sourceType === "referral_reward" || Number(lot.amount) > 0) {
      lifetimeEarned += Number(lot.amount);
    }
  }

  return {
    balance: round(balance),
    lifetimeEarned: round(lifetimeEarned),
    lots: lots.map((lot) => ({
      walletCreditId: lot.walletCreditId,
      amount: Number(lot.amount),
      remainingAmount: Number(lot.remainingAmount),
      sourceType: lot.sourceType,
      status: lot.status,
      note: lot.note,
      createdAt: lot.createdAt,
    })),
  };
}

/** Creates a new active lot — a referral-earned credit, a loyalty-milestone credit, or a manual admin credit. */
async function creditWallet({
  userId,
  amount,
  sourceType,
  sourceReferralRewardId = null,
  sourceBookingId = null,
  sourceBookingType = null,
  note = null,
  createdByAdminId = null,
}) {
  const rounded = round(amount);
  if (rounded <= 0) {
    throw new ValidationError("Wallet credit amount must be greater than zero.");
  }
  return WalletCredit.create({
    userId,
    amount: rounded,
    remainingAmount: rounded,
    sourceType,
    sourceReferralRewardId,
    sourceBookingId,
    sourceBookingType,
    status: "active",
    note,
    createdByAdminId,
  });
}

/**
 * Draws down up to `amount` from this user's active lots, oldest first
 * (FIFO by createdAt — credit never expires, so there's no soonest-expiry
 * ordering to prefer instead). Spends across as many lots as it takes,
 * creating one WalletCreditRedemption row per lot drawn from. Returns
 * `{ amountApplied }`, which is LESS than the requested `amount` whenever the
 * balance can't fully cover it (the "partial application" case) — callers
 * must use the returned amount, never assume the full request was honored.
 */
async function redeemWalletCredit({ userId, bookingId = null, bookingType = null, amount }) {
  let remaining = round(amount);
  if (remaining <= 0) return { amountApplied: 0 };

  const lots = await WalletCredit.findAll({
    where: { userId, status: "active" },
    order: [["createdAt", "ASC"]],
  });

  let amountApplied = 0;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const available = Number(lot.remainingAmount);
    if (available <= 0) continue;

    const draw = round(Math.min(available, remaining));
    await WalletCreditRedemption.create({
      walletCreditId: lot.walletCreditId,
      userId,
      amountApplied: draw,
      bookingId,
      bookingType,
      status: "confirmed",
    });

    lot.remainingAmount = round(available - draw);
    lot.status = lot.remainingAmount <= 0 ? "fully_redeemed" : "active";
    await lot.save();

    amountApplied = round(amountApplied + draw);
    remaining = round(remaining - draw);
  }

  return { amountApplied };
}

/**
 * Voluntary removal — the customer unticks "use wallet credit" on a booking
 * that already had some applied (at create or update time), before that
 * booking's status does anything else. Restores the drawn amount back onto
 * each lot it came from and marks the redemption rows reversed. Distinct
 * from reverseWalletCreditForReferredBooking below, which claws back a
 * REFERRER's earned lot when the REFERRED booking that earned it is refunded.
 */
async function reverseRedemptionForBooking({ bookingId, bookingType }) {
  const redemptions = await WalletCreditRedemption.findAll({
    where: { bookingId, bookingType, status: "confirmed" },
    include: [{ model: WalletCredit }],
  });

  for (const redemption of redemptions) {
    const lot = redemption.WalletCredit;
    if (lot) {
      lot.remainingAmount = round(Number(lot.remainingAmount) + Number(redemption.amountApplied));
      lot.status = "active";
      await lot.save();
    }
    redemption.status = "reversed";
    await redemption.save();
  }
}

/**
 * The refund clawback. Called when a booking that already triggered a
 * credited referral reward gets refunded/cancelled by an admin (see
 * handleAdminBookingPayment's reject/cancel branch). Only the UNSPENT
 * remainder of the referrer's lot is clawed back — if the referrer already
 * spent some or all of it on their own bookings, that spend is never undone
 * (the money already paid for a real ride). A no-op if this booking never
 * credited anyone, or if the lot has already been fully spent.
 */
async function reverseWalletCreditForReferredBooking({ bookingType, bookingId }) {
  const displayBookingType = LEDGER_TO_DISPLAY_BOOKING_TYPE[bookingType] || bookingType;

  const reward = await ReferralReward.findOne({
    where: {
      triggeringBookingType: displayBookingType,
      triggeringBookingId: bookingId,
      rewardStatus: "credited",
    },
  });
  if (!reward) return null;

  const lot = await WalletCredit.findOne({
    where: { sourceReferralRewardId: reward.referralRewardId, sourceType: "referral_reward" },
  });

  if (lot && Number(lot.remainingAmount) > 0) {
    lot.remainingAmount = 0;
    lot.status = "reversed";
    await lot.save();
  }

  reward.rewardStatus = "reversed";
  await reward.save();

  return lot;
}

/**
 * Admin support tool: `amount > 0` issues a goodwill credit; `amount < 0`
 * debits the balance (e.g. correcting a dispute), spending oldest-lot-first
 * exactly like a booking redemption would, just with no booking attached.
 * `reason` is required and stored for audit (on the new lot for a credit, or
 * folded into each drawn-from lot's note for a debit, since a debit can span
 * several lots).
 */
async function adminAdjustWallet({ userId, amount, reason, adminId }) {
  const rounded = round(amount);
  if (rounded === 0) {
    throw new ValidationError("Adjustment amount must not be zero.");
  }

  if (rounded > 0) {
    return creditWallet({
      userId,
      amount: rounded,
      sourceType: "manual_admin_credit",
      note: reason,
      createdByAdminId: adminId,
    });
  }

  const balance = await getWalletBalance(userId);
  const debit = round(Math.min(Math.abs(rounded), balance));
  if (debit <= 0) {
    throw new ValidationError("This customer has no wallet balance to debit.");
  }
  return redeemWalletCredit({ userId, amount: debit });
}

/**
 * Logs that a customer asked to cash out some of their balance — e.g. a
 * power-referrer (a hotel contact sending lots of guests, say) who's
 * accumulated more credit than they can spend on rides and wants real money
 * instead. This never moves money by itself — the payout happens outside the
 * app (Zelle/check/ACH) and is then reconciled here via resolveCashOutRequest
 * — it just makes the ask visible/auditable instead of living only in a
 * phone call. Rejects a request for more than the customer currently has.
 */
async function createCashOutRequest({ userId, amountRequested, note = null, requestedByAdminId = null }) {
  const rounded = round(amountRequested);
  if (rounded <= 0) {
    throw new ValidationError("Cash-out amount must be greater than zero.");
  }
  const balance = await getWalletBalance(userId);
  if (rounded > balance) {
    throw new ValidationError(
      `This customer only has $${balance.toFixed(2)} in wallet credit — can't request more than that.`
    );
  }

  return WalletCashOutRequest.create({
    userId,
    amountRequested: rounded,
    status: "pending",
    note,
    requestedByAdminId,
  });
}

/**
 * `userId` scopes to one customer's requests (newest first); omit for every
 * customer's — the global "who's waiting for cash" view, which is why the
 * customer's name/email is always joined in rather than just their id.
 */
async function listCashOutRequests({ userId = null, status = null } = {}) {
  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  const requests = await WalletCashOutRequest.findAll({
    where,
    order: [["createdAt", "DESC"]],
    include: [{ model: User, attributes: ["fullName", "email", "phoneNumber"] }],
  });
  return requests.map((request) => ({
    ...request.toJSON(),
    customerName: request.User?.fullName ?? null,
    customerEmail: request.User?.email ?? null,
    customerPhone: request.User?.phoneNumber ?? null,
  }));
}

/**
 * Settles a logged request. "cancelled" just records that it didn't happen
 * (e.g. the customer changed their mind) — no wallet change. "fulfilled"
 * means the cash was actually paid outside the app, so this also debits the
 * wallet for real, through the exact same adminAdjustWallet path a
 * standalone manual debit would use (oldest-lot-first, clamped to balance),
 * so the ledger and this request's history can never drift apart.
 * `finalAmount` lets the debited amount differ from what was originally
 * asked for; defaults to the request's own amountRequested.
 */
async function resolveCashOutRequest({
  walletCashOutRequestId,
  status,
  resolutionNote,
  resolvedByAdminId,
  finalAmount = null,
}) {
  const request = await WalletCashOutRequest.findByPk(walletCashOutRequestId);
  if (!request) {
    throw new ResourceNotFoundError("Cash-out request not found.");
  }
  if (request.status !== "pending") {
    throw new ValidationError("This cash-out request has already been resolved.");
  }

  if (status === "fulfilled") {
    const amount = round(finalAmount != null ? finalAmount : request.amountRequested);
    await adminAdjustWallet({
      userId: request.userId,
      amount: -amount,
      reason: resolutionNote,
      adminId: resolvedByAdminId,
    });
  }

  request.status = status;
  request.resolutionNote = resolutionNote;
  request.resolvedByAdminId = resolvedByAdminId;
  request.resolvedAt = new Date();
  await request.save();

  return request;
}

module.exports = {
  getWalletBalance,
  getWalletSummary,
  creditWallet,
  redeemWalletCredit,
  reverseRedemptionForBooking,
  reverseWalletCreditForReferredBooking,
  adminAdjustWallet,
  createCashOutRequest,
  listCashOutRequests,
  resolveCashOutRequest,
};
