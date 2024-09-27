const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database.js");

const AirportBookExtraOption = sequelize.define(
  "AirportBookExtraOption",
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
    modelName: "AirportBookExtraOption",
    tableName: "airport_book_extra_options",
    timestamps: false,
  }
);

module.exports = AirportBookExtraOption;
