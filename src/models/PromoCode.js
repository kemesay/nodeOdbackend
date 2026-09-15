const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");
const { User } = require("./user/User.js");

const BOOKING_TYPES = ["Point to point", "Hourly Charter", "Airport Service"];

/**
 * A redeemable code. Three flavors share this one table (`type`):
 *  - "public"   admin-created campaign code (e.g. ODACAR10), shared by many riders.
 *  - "referral" auto-generated per user (FirstName + short hash of userId), given to
 *               friends the owner invites; discounts the *referred* rider's first ride.
 *  - "reward"   auto-minted single-use code credited to a referrer once their
 *               referral's first ride is completed — this is how a "wallet credit"
 *               is represented without a wallet system existing yet.
 */
const PromoCode = sequelize.define(
  "PromoCode",
  {
    promoCodeId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM("public", "referral", "reward"),
      allowNull: false,
    },
    ownerUserId: {
      // Who this code "belongs to" — the referrer for referral/reward codes,
      // null for public campaign codes.
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    discountType: {
      type: DataTypes.ENUM("percent", "flat"),
      allowNull: false,
      defaultValue: "percent",
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    maxDiscountAmount: {
      // Cap for percent discounts (ignored for flat). Null = uncapped.
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    minFareAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    applicableBookingTypes: {
      // JSON array of BOOKING_TYPES values, or null = applies to all.
      type: DataTypes.JSON,
      allowNull: true,
    },
    firstRideOnly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    maxTotalRedemptions: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxRedemptionsPerUser: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    campaignSource: {
      // e.g. "instagram_aug26" — public/social codes only, for channel attribution.
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "PromoCode",
    tableName: "promo_codes",
  }
);

const PromoCodeRedemption = sequelize.define(
  "PromoCodeRedemption",
  {
    promoCodeRedemptionId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    promoCodeId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    redeemedByUserId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    // Guest identity proxy — a guest has no userId to rate-limit against, so
    // per-user caps fall back to matching on whatever contact info they gave
    // at booking time. Nullable: only populated when redeemedByUserId isn't.
    guestEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    guestPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    bookingId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    bookingType: {
      type: DataTypes.ENUM(...BOOKING_TYPES),
      allowNull: false,
    },
    discountApplied: {
      // Frozen at redemption time — later changes to the promo code must not
      // retroactively change what a past booking actually charged.
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("confirmed", "reversed"),
      allowNull: false,
      defaultValue: "confirmed",
    },
  },
  {
    sequelize,
    modelName: "PromoCodeRedemption",
    tableName: "promo_code_redemptions",
  }
);

const ReferralReward = sequelize.define(
  "ReferralReward",
  {
    referralRewardId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    referrerUserId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    // Nullable — a referred friend who books as a guest (never registers)
    // still earns the referrer a reward; referredGuestEmail/Phone identify
    // them instead in that case.
    referredUserId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    referredGuestEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    referredGuestPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    promoCodeId: {
      // The referral code that was redeemed to create this reward.
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    triggeringBookingId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    triggeringBookingType: {
      type: DataTypes.ENUM(...BOOKING_TYPES),
      allowNull: true,
    },
    rewardAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    rewardCodeId: {
      // The auto-minted "reward" PromoCode handed to the referrer once credited.
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    rewardStatus: {
      type: DataTypes.ENUM("pending", "credited", "denied"),
      allowNull: false,
      defaultValue: "pending",
    },
    creditedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ReferralReward",
    tableName: "referral_rewards",
  }
);

PromoCode.hasMany(PromoCodeRedemption, { foreignKey: "promoCodeId" });
PromoCodeRedemption.belongsTo(PromoCode, { foreignKey: "promoCodeId" });

PromoCode.belongsTo(User, { foreignKey: "ownerUserId", as: "owner" });
PromoCodeRedemption.belongsTo(User, { foreignKey: "redeemedByUserId", as: "redeemedBy" });

ReferralReward.belongsTo(PromoCode, { foreignKey: "promoCodeId" });
ReferralReward.belongsTo(User, { foreignKey: "referrerUserId", as: "referrer" });
ReferralReward.belongsTo(User, { foreignKey: "referredUserId", as: "referred" });

const codeUpper = () =>
  Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9]{4,20}$/)
    .messages({
      "string.pattern.base": "Promo code must be 4-20 letters/numbers, no spaces or symbols.",
    });

// Preserves whatever casing the admin typed (e.g. "OdaCar") for display —
// only used at creation time. Matching still works regardless of how a
// customer later types it: the `code` column's collation (*_ci, confirmed
// on the live DB) makes MySQL equality comparisons case-insensitive, so
// codeUpper()'s forced-uppercase lookups elsewhere still find this row.
const codeAsEntered = () =>
  Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9]{4,20}$/)
    .messages({
      "string.pattern.base": "Promo code must be 4-20 letters/numbers, no spaces or symbols.",
    });

/** Admin creating a public/social-media campaign code. */
const validateCreatePromoCode = Joi.object({
  code: codeAsEntered().required(),
  discountType: Joi.string().valid("percent", "flat").default("percent"),
  discountValue: Joi.number().min(0.01).required(),
  // A percent discount is never capped — always the full percentage of the
  // fare. maxDiscountAmount stays a real column on the table (in case a cap
  // is ever wanted again for some future code), but it's deliberately not
  // accepted here since nothing in the discount calculation reads it.
  minFareAmount: Joi.number().min(0).allow(null),
  applicableBookingTypes: Joi.array().items(Joi.string().valid(...BOOKING_TYPES)).allow(null),
  firstRideOnly: Joi.boolean().default(false),
  maxTotalRedemptions: Joi.number().integer().min(1).allow(null),
  maxRedemptionsPerUser: Joi.number().integer().min(1).default(1),
  campaignSource: Joi.string().max(50).allow("", null),
  isActive: Joi.boolean().default(true),
  startsAt: Joi.date().allow(null),
  expiresAt: Joi.date().allow(null),
});

/** Applying a code inline as part of a booking payload (booking services pick this out). */
const validateApplyPromoCode = Joi.object({
  code: codeUpper().required(),
});

/** Standalone `/promo-codes/validate` preview — needs the fare context to compute a discount. */
const validatePromoCodePreview = Joi.object({
  code: codeUpper().required(),
  bookingType: Joi.string().valid(...BOOKING_TYPES).required(),
  fareAmount: Joi.number().min(0.01).required(),
});

module.exports = {
  PromoCode,
  PromoCodeRedemption,
  ReferralReward,
  BOOKING_TYPES,
  validateCreatePromoCode,
  validateApplyPromoCode,
  validatePromoCodePreview,
};
