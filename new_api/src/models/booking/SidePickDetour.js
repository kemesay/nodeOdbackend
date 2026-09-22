const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database.js");

const SidePickDetour = sequelize.define(
  "SidePickDetour",
  {
    sidePickId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    pointToPointBookId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: "point_to_point_books", key: "pointToPointBookId" },
    },
    airportBookId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: "airport_books", key: "airportBookId" },
    },
    address: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "side_pick_detours",
    timestamps: true,
    paranoid: false,
  }
);

module.exports = { SidePickDetour };
