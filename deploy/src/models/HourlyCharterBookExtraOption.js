const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const HourlyCharterBookExtraOption = sequelize.define(
  "HourlyCharterBookExtraOption",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: "HourlyCharterBookExtraOption",
    tableName: "hourly_Charter_extraOptions",
    timestamps: false,
  }
);

module.exports = HourlyCharterBookExtraOption;
