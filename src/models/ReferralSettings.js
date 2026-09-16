const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");

/**
 * A single-row table (id is always 1) holding the referral program's
 * admin-tunable numbers, so an owner can change them (e.g. 10% -> 5%,
 * $10 -> $15) from the dashboard without a code deployment. Changing a
 * value here only affects codes/rewards created afterward — anything
 * already issued keeps whatever was frozen onto it (PromoCode.discountValue,
 * ReferralReward.rewardAmount) at the moment it was created.
 */
const ReferralSettings = sequelize.define(
  "ReferralSettings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    // % off the referred friend's first ride — never capped in size, only
    // in how it's set here (see promoCodeService.computeDiscount).
    referralDiscountPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 10,
    },
    // Flat $ credited to the referrer once the referred friend's ride
    // completes and is paid for.
    referrerRewardAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 10,
    },
    // Lifetime cap on how many PUBLIC (admin/marketing) codes one person can
    // redeem on their own bookings, ever.
    maxLifetimePublicRedemptions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    // Lifetime cap on how many REFERRAL/REWARD codes one person can redeem
    // on their own bookings, ever — a separate bucket from the public cap
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

/** Admin updating one or more settings — all optional, but at least one required. */
const validateUpdateReferralSettings = Joi.object({
  referralDiscountPercent: Joi.number().min(0.01).max(100),
  referrerRewardAmount: Joi.number().min(0.01),
  maxLifetimePublicRedemptions: Joi.number().integer().min(0),
  maxLifetimeReferralRedemptions: Joi.number().integer().min(0),
}).min(1);

module.exports = { ReferralSettings, validateUpdateReferralSettings };
