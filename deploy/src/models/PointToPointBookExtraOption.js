const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const PointToPointBookExtraOption = sequelize.define(
  "PointToPointBookExtraOption",
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
    modelName: "PointToPointBookExtraOption",
    tableName: "point_to_point_book_extra_options",
    timestamps: false,
  }
);

module.exports = PointToPointBookExtraOption;
