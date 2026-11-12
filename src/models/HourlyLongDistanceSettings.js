const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");

/**
 * A single-row table (id is always 1) controlling the optional "Long
 * Distance Fee" for Hourly Charter bookings: a flat fee added once when the
 * straight-line distance between pickup and drop-off is farther than the
 * admin's configured minimum — e.g. a charter that starts or ends well
 * outside the normal service area. It's off (isActive: false) by default —
 * this is a brand-new charge, not an existing behavior being made
 * configurable, so nothing changes for customers until an admin
 * deliberately turns it on from the dashboard.
 *
 * Distance is computed server-side (haversine, straight-line) from the
 * booking's own pickup/drop-off coordinates — never trusted from the
 * client — so this can't be bypassed by a tampered request, and needs no
 * external mapping API call. Applies only to Hourly Charter, which is the
 * only booking type priced per-hour rather than per-mile and so has no
 * other distance-based charge today.
 */
const HourlyLongDistanceSettings = sequelize.define(
  "HourlyLongDistanceSettings",
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
    minimumDistanceInMiles: {
      // Fee applies when the pickup/drop-off distance is GREATER than this.
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    feeAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "HourlyLongDistanceSettings",
    tableName: "hourly_long_distance_settings",
  }
);

/** Admin updating one or more fields — at least one required. */
const validateUpdateHourlyLongDistanceSettings = Joi.object({
  isActive: Joi.boolean(),
  minimumDistanceInMiles: Joi.number().min(0),
  feeAmount: Joi.number().min(0),
}).min(1);

module.exports = {
  HourlyLongDistanceSettings,
  validateUpdateHourlyLongDistanceSettings,
};
