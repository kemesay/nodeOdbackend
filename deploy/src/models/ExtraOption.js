const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");

const ExtraOption = sequelize.define(
  "ExtraOption",
  {
    extraOptionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    pricePerItem: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "USD",
    },
    hasMaxAllowedLimit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    maxAllowedItems: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Active",
    },
  },
  {
    sequelize,
    modelName: "ExtraOption",
    tableName: "extra_options",
    paranoid: true,
  }
);

function validateExtraOption(extraOption) {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    pricePerItem: Joi.number().precision(2).positive().required(),
    hasMaxAllowedLimit: Joi.boolean().required(),
    maxAllowedItems: Joi.number().integer().min(0).when("hasMaxAllowedItems", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  });

  return schema.validate(extraOption);
}

module.exports = { ExtraOption, validateExtraOption };
