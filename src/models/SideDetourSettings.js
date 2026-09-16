const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");

/**
 * A single-row table (id is always 1) controlling the optional side-pick-detour
 * fee: a flat "start fee" added once, on top of the normal per-mile fare, for
 * any booking that has at least one side-pick detour stop. It's off (isActive:
 * false, startFee: 0) by default — this is a brand-new charge, not an existing
 * behavior being made configurable, so nothing changes for customers until an
 * admin deliberately turns it on from the dashboard.
 *
 * Applies identically to one-way and round-trip bookings (see
 * bookingFareCalculator.js — added once into the subtotal, never doubled), and
 * only to booking types that support side-pick detours today (Point to Point,
 * Airport Service). Hourly Charter has no side-pick concept and is unaffected.
 */
const SideDetourSettings = sequelize.define(
  "SideDetourSettings",
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
    startFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "SideDetourSettings",
    tableName: "side_detour_settings",
  }
);

/** Admin updating one or both fields — at least one required. */
const validateUpdateSideDetourSettings = Joi.object({
  isActive: Joi.boolean(),
  startFee: Joi.number().min(0),
}).min(1);

module.exports = { SideDetourSettings, validateUpdateSideDetourSettings };
