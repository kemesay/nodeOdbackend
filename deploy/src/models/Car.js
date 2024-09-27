const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");

const Car = sequelize.define(
  "Car",
  {
    carId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    carName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    carDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    carImageUrl: {
      type: DataTypes.STRING,
    },
    maxPassengers: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    maxSuitcases: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    carType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pricePerMile: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    pricePerHour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    minimumStartFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "USD",
    },
    engineType: {
      type: DataTypes.STRING,
    },
    length: {
      type: DataTypes.DECIMAL(8, 2),
    },
    interiorColor: {
      type: DataTypes.STRING,
    },
    exteriorColor: {
      type: DataTypes.STRING,
    },
    power: {
      type: DataTypes.STRING,
    },
    transmissionType: {
      type: DataTypes.STRING,
    },
    fuelType: {
      type: DataTypes.STRING,
    },
    extras: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Inactive",
    },
  },
  {
    sequelize,
    modelName: "Car",
    tableName: "cars",
    paranoid: true,
  }
);

function validateCar(car) {
  const schema = Joi.object({
    carName: Joi.string().required(),
    carDescription: Joi.string().required(),
    maxPassengers: Joi.number().integer().min(1).required(),
    maxSuitcases: Joi.number().integer().min(0).required(),
    carType: Joi.string().required(),
    pricePerMile: Joi.number().precision(2).positive().required(),
    pricePerHour: Joi.number().precision(2).positive().required(),
    minimumStartFee: Joi.number().precision(2).positive().required(),
    currency: Joi.string().length(3).default("USD"),
    engineType: Joi.string(),
    length: Joi.number().precision(2),
    interiorColor: Joi.string(),
    exteriorColor: Joi.string(),
    power: Joi.string(),
    transmissionType: Joi.string(),
    fuelType: Joi.string(),
    extras: Joi.string().allow(""),
  });

  return schema.validate(car);
}

module.exports = { Car, validateCar };
