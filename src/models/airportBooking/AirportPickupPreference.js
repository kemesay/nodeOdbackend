const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database.js");
const Joi = require("joi");

const AirportPickupPreference = sequelize.define(
  "AirportPickupPreference",
  {
    pickupPreferenceId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    preferenceName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: "The preference name already exists. Please choose a different name.",
      },
    },
    preferencePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "USD",
    },
    status: {
      type: DataTypes.INTEGER,
      type: DataTypes.ENUM("Active", "Disabled"),
      defaultValue: "Active",
    },
  },
  {
    sequelize,
    modelName: "AirportPickupPreference",
    tableName: "airportPickupPreferences",
  }
);

function validateAirportPickupPreference(airportPickupPreference) {
  const schema = Joi.object({
    preferenceName: Joi.string().required(),
    preferencePrice: Joi.number().precision(2).required(),
  });

  return schema.validate(airportPickupPreference);
}

module.exports = { AirportPickupPreference, validateAirportPickupPreference };
