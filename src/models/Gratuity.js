const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");

const Gratuity = sequelize.define(
  "Gratuity",
  {
    gratuityId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    percentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Active",
    },
  },
  {
    sequelize,
    modelName: "Gratuity",
    tableName: "gratuities",
    paranoid: true,
  }
);

function validateGratuity(gratuity) {
  const schema = Joi.object({
    percentage: Joi.number().min(0).max(100).required(),
  });

  return schema.validate(gratuity);
}

module.exports = { Gratuity, validateGratuity };
