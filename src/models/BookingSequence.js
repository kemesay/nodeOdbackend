const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const BookingSequence = sequelize.define(
  "BookingSequence",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "BookingSequence",
    tableName: "bookingSequence",
    paranoid: true,
  }
);

module.exports = { BookingSequence };
