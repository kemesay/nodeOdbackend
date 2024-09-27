const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database.js");
const Joi = require("joi");

const AdditionalStopOnTheWay = sequelize.define(
  "AdditionalStopOnTheWay",
  {
    additionalStopId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    stopType: {
      type: DataTypes.ENUM("Oneway", "Roundtrip"),
      allowNull: false,
      unique: true,
    },

    additionalStopPrice: {
      type: DataTypes.DECIMAL(10, 2),
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "USD",
    },
  },
  {
    sequelize,
    modelName: "AdditionalStopOnTheWay",
    tableName: "additionalStopOnTheWay",
  }
);

function validateAdditionalStopOnTheWay(stopOnTheWay) {
  const schema = Joi.object({
    stopType: Joi.string().valid("Oneway", "Roundtrip").required(),
    additionalStopPrice: Joi.number().precision(2).required(),
  });

  return schema.validate(stopOnTheWay);
}

function validateAdditionalStopOnTheWayUpdate(stopOnTheWay) {
  const schema = Joi.object({
    additionalStopPrice: Joi.number().min(1).precision(2).required(),
  });

  return schema.validate(stopOnTheWay);
}

module.exports = {
  AdditionalStopOnTheWay,
  validateAdditionalStopOnTheWay,
  validateAdditionalStopOnTheWayUpdate,
};
