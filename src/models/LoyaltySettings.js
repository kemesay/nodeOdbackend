const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");

/**
 * A single-row table (id is always 1) controlling the optional ride-count
 * loyalty milestone: every `milestoneInterval`-th completed booking for a
 * signed-in customer (counted across all three trip types combined) credits
 * their wallet with `milestonePercent`% of that ride's own fare — UNLESS a
 * promo code was applied to that specific ride, in which case the milestone
 * is simply skipped for that round (the customer already got their value via
 * the discount; the two rewards never stack on the same booking). This is
 * independent of, and stacks across different bookings with, the existing
 * referral-reward credit — a customer can earn wallet credit both ways.
 *
 * Off by default (isActive: false) — this is a brand-new reward, not an
 * existing behavior being made configurable, so nothing changes for
 * customers until an admin deliberately turns it on.
 */
const LoyaltySettings = sequelize.define(
  "LoyaltySettings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Fires on ride 5, 10, 15, ... — recurring, not a one-time welcome bonus.
    milestoneInterval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: { min: 1 },
    },
    // % of the qualifying ride's own totalTripFeeInDollars, same computation
    // shape as the referral reward's rewardPercent.
    milestonePercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 5,
      validate: { min: 0.01 },
    },
  },
  {
    sequelize,
    modelName: "LoyaltySettings",
    tableName: "loyalty_settings",
  }
);

/** Admin updating one or more fields — at least one required. */
const validateUpdateLoyaltySettings = Joi.object({
  isActive: Joi.boolean(),
  milestoneInterval: Joi.number().integer().min(1),
  milestonePercent: Joi.number().min(0.01).max(100),
}).min(1);

module.exports = { LoyaltySettings, validateUpdateLoyaltySettings };
