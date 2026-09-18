const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");

/**
 * A single-row table (id is always 1) holding the referral program's
 * admin-tunable numbers, so an owner can change them (e.g. 10% -> 5%) from
 * the dashboard without a code deployment. Changing a value here only
 * affects codes/rewards created afterward — anything already issued keeps
 * whatever was frozen onto it (PromoCode.discountValue,
 * ReferralReward.rewardPercent) at the moment it was created.
 *
 * There used to be a separate `referrerRewardAmount` (flat $) here for the
 * referrer's payout. That's gone — the referrer's reward is now the same
 * percentage as referralDiscountPercent below, just applied to the
 * referrer's own next ride instead of the referred friend's first one, so
 * one number drives both sides of the referral instead of two admins
 * having to keep two settings in sync.
 */
const ReferralSettings = sequelize.define(
  "ReferralSettings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    // % off the referred friend's first ride — and, identically, % off the
    // referrer's reward once that ride completes and is paid for. Never
    // capped in size, only in how it's set here (see
    // promoCodeService.computeDiscount).
    referralDiscountPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
    },
    // Legacy global lifetime cap on PUBLIC (admin/marketing) codes — superseded
    // by each public code's own maxRedemptionsPerUser/maxRedemptionsPerPeriod
    // (see PromoCode.js), which already cover "how many times one customer
    // can use THIS code". Kept as a real column, no longer read anywhere.
    maxLifetimePublicRedemptions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    // Lifetime cap on how many REFERRAL/REWARD codes one person can redeem
    // on their own bookings, ever — independent of the per-code public caps
    // above, so spending one never crowds out the other.
    maxLifetimeReferralRedemptions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
  },
  {
    sequelize,
    modelName: "ReferralSettings",
    tableName: "referral_settings",
  }
);

/**
 * Admin updating one or more settings — all optional, but at least one
 * required. maxLifetimePublicRedemptions is a real column but no longer
 * accepted here — public codes are capped per-code now (see PromoCode.js).
 */
const validateUpdateReferralSettings = Joi.object({
  referralDiscountPercent: Joi.number().min(0.01).max(100),
  maxLifetimeReferralRedemptions: Joi.number().integer().min(0),
}).min(1);

module.exports = { ReferralSettings, validateUpdateReferralSettings };
