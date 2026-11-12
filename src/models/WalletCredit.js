const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");
const { User } = require("./user/User.js");
const { BOOKING_TYPES } = require("./PromoCode.js");

/** Where the admin should actually send cash-out money — set by the
 * customer (or an admin logging on their behalf) at request time, so
 * resolving a request doesn't depend on a separate phone call to ask. */
const PAYOUT_METHODS = [
  "zelle",
  "venmo",
  "cashapp",
  "paypal",
  "bank_transfer",
  "check",
  "other",
];

/**
 * One row per earned "lot" of wallet credit. A lot is created when a
 * referral reward is credited (see promoCodeService.creditReferralRewardIfCompleted,
 * which calls walletService.creditWallet instead of minting a one-time
 * reward promo code), when a loyalty ride-count milestone is hit (see
 * loyaltyService.creditLoyaltyMilestoneIfEligible), or when an admin
 * manually adjusts a customer's balance. `remainingAmount` is drawn down
 * (possibly across several lots, FIFO by `createdAt`) as the customer spends
 * it on future bookings — see walletService.redeemWalletCredit. Credit never
 * expires, so there is no `expiresAt` column.
 */
const WalletCredit = sequelize.define(
  "WalletCredit",
  {
    walletCreditId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    amount: {
      // Original lot amount, frozen at creation — never changed afterward.
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    remainingAmount: {
      // Starts equal to `amount`; drawn down as this lot is spent or
      // zeroed out entirely if the lot is reversed (clawback/voluntary undo).
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    sourceType: {
      type: DataTypes.ENUM("referral_reward", "manual_admin_credit", "loyalty_milestone"),
      allowNull: false,
    },
    sourceReferralRewardId: {
      // Set only for sourceType "referral_reward" — the ReferralReward this
      // lot was credited for, so a later refund of the triggering booking can
      // find and claw back this exact lot (see reverseWalletCreditForReferredBooking).
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    sourceBookingId: {
      // Set only for sourceType "loyalty_milestone" — the booking whose
      // completion hit the milestone, so crediting is idempotent (never
      // double-credits the same booking) and the lot's origin is auditable.
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    sourceBookingType: {
      type: DataTypes.ENUM(...BOOKING_TYPES),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "fully_redeemed", "reversed"),
      allowNull: false,
      defaultValue: "active",
    },
    note: {
      // Admin-entered reason for a manual credit/debit lot; null for
      // referral-earned lots.
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdByAdminId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "WalletCredit",
    tableName: "wallet_credits",
  }
);

/**
 * Audit trail of every time a lot was spent (confirmed) or that spend was
 * undone (reversed) — either because the customer voluntarily removed wallet
 * credit from a booking before it was charged, or because an admin reversed
 * a manual debit. `bookingId`/`bookingType` are null for a manual admin debit
 * (not tied to any booking).
 */
const WalletCreditRedemption = sequelize.define(
  "WalletCreditRedemption",
  {
    walletCreditRedemptionId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    walletCreditId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    userId: {
      // Denormalized for quick "all of this user's spend history" lookups
      // without joining through WalletCredit.
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    amountApplied: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    bookingId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    bookingType: {
      type: DataTypes.ENUM(...BOOKING_TYPES),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("confirmed", "reversed"),
      allowNull: false,
      defaultValue: "confirmed",
    },
  },
  {
    sequelize,
    modelName: "WalletCreditRedemption",
    tableName: "wallet_credit_redemptions",
  }
);

/**
 * A logged ask to cash out some of a customer's wallet balance — the actual
 * money always moves outside the app (Zelle, check, ACH — see
 * walletService.resolveCashOutRequest), this is just an auditable record that
 * someone asked and whether/how it was settled, so a pending ask is visible
 * on the customer's wallet instead of living only in a phone call or a text
 * thread. Resolving one as "fulfilled" also debits the wallet for real (via
 * the same adminAdjustWallet path a standalone manual debit would use), so
 * the ledger and the cash-out history never drift apart.
 */
const WalletCashOutRequest = sequelize.define(
  "WalletCashOutRequest",
  {
    walletCashOutRequestId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    amountRequested: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    status: {
      type: DataTypes.ENUM("pending", "fulfilled", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    note: {
      // Why/how the request came in, e.g. "Asked by phone 2026-03-10".
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    requestedByAdminId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    resolvedByAdminId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    resolutionNote: {
      // e.g. "Paid via Zelle 2026-03-12, conf #1234" or "Customer withdrew the ask".
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    payoutMethod: {
      // e.g. "zelle" | "bank_transfer" | ... — see PAYOUT_METHODS. Nullable:
      // an admin logging a request over the phone may not have this yet.
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: { isIn: [PAYOUT_METHODS] },
    },
    payoutDetails: {
      // Shape depends on payoutMethod — see validateCreateCashOutRequest
      // for exactly which fields each method requires. Never a raw card
      // number; at most a bank account/routing number, which is not a
      // Square-tokenizable value in the first place.
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "WalletCashOutRequest",
    tableName: "wallet_cash_out_requests",
  }
);

User.hasMany(WalletCredit, { foreignKey: "userId" });
WalletCredit.belongsTo(User, { foreignKey: "userId" });

WalletCredit.hasMany(WalletCreditRedemption, { foreignKey: "walletCreditId" });
WalletCreditRedemption.belongsTo(WalletCredit, { foreignKey: "walletCreditId" });

User.hasMany(WalletCashOutRequest, { foreignKey: "userId" });
WalletCashOutRequest.belongsTo(User, { foreignKey: "userId" });

/** Admin issuing a manual goodwill credit or correcting a balance with a debit. */
const validateAdminAdjustWallet = Joi.object({
  amount: Joi.number().invalid(0).required(),
  reason: Joi.string().trim().min(3).max(255).required(),
});

/** Shape of `payoutDetails`, keyed by `payoutMethod` — never a raw card
 * number; bank_transfer is the only one with account-numeric fields. */
const PAYOUT_DETAILS_SCHEMAS = {
  zelle: Joi.object({
    zelleEmailOrPhone: Joi.string().trim().min(3).max(100).required(),
  }),
  venmo: Joi.object({
    venmoUsername: Joi.string().trim().min(2).max(60).required(),
  }),
  cashapp: Joi.object({
    cashtag: Joi.string().trim().min(2).max(60).required(),
  }),
  paypal: Joi.object({
    paypalEmail: Joi.string().trim().email().required(),
  }),
  bank_transfer: Joi.object({
    accountHolderName: Joi.string().trim().min(2).max(100).required(),
    bankName: Joi.string().trim().min(2).max(100).required(),
    routingNumber: Joi.string()
      .trim()
      .pattern(/^\d{9}$/)
      .required()
      .messages({ "string.pattern.base": "Routing number must be exactly 9 digits." }),
    accountNumber: Joi.string()
      .trim()
      .pattern(/^\d{4,17}$/)
      .required()
      .messages({ "string.pattern.base": "Account number must be 4 to 17 digits." }),
  }),
  check: Joi.object({
    mailingAddress: Joi.string().trim().min(5).max(255).required(),
  }),
  other: Joi.object({
    instructions: Joi.string().trim().min(3).max(255).required(),
  }),
};

/** Admin logging that a customer asked to cash out some of their balance. */
const validateCreateCashOutRequest = Joi.object({
  amountRequested: Joi.number().min(0.01).required(),
  note: Joi.string().trim().max(255).allow("", null),
  // Optional — an admin logging a request by phone may not have this yet.
  // When the customer submits it themselves, the website/app always sends
  // it, so admin knows exactly where to send money without calling first.
  payoutMethod: Joi.string().valid(...PAYOUT_METHODS),
  payoutDetails: Joi.when("payoutMethod", {
    is: Joi.exist(),
    then: Joi.alternatives()
      .conditional("payoutMethod", {
        switch: PAYOUT_METHODS.map((method) => ({
          is: method,
          then: PAYOUT_DETAILS_SCHEMAS[method],
        })),
      })
      .required(),
    otherwise: Joi.forbidden(),
  }),
}).and("payoutMethod", "payoutDetails");

/**
 * Admin settling a logged request — "fulfilled" means the cash was actually
 * paid outside the app and the wallet should now be debited for real;
 * `finalAmount` lets the debited amount differ from what was originally
 * asked for (e.g. the customer only wanted part of it cashed out after all),
 * defaulting to the request's own amountRequested when omitted.
 */
const validateResolveCashOutRequest = Joi.object({
  status: Joi.string().valid("fulfilled", "cancelled").required(),
  resolutionNote: Joi.string().trim().min(3).max(255).required(),
  finalAmount: Joi.number().min(0.01),
});

module.exports = {
  WalletCredit,
  WalletCreditRedemption,
  WalletCashOutRequest,
  validateAdminAdjustWallet,
  validateCreateCashOutRequest,
  validateResolveCashOutRequest,
  PAYOUT_METHODS,
};
