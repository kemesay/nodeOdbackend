const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database.js");
const Joi = require("joi");

const Airport = sequelize.define(
  "Airport",
  {
    airportId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    airportName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    airportAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    airportAddressLongitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    airportAddressLatitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Active",
    },
  },
  {
    sequelize,
    modelName: "Airport",
    tableName: "airports",
  }
);

function validateAirport(airport) {
  const schema = Joi.object({
    airportName: Joi.string().required(),
    airportAddress: Joi.string().required(),
    airportAddressLongitude: Joi.number().required(),
    airportAddressLatitude: Joi.number().required(),
  });

  return schema.validate(airport);
}

module.exports = { Airport, validateAirport };
