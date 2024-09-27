const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");

const PopularPlace = sequelize.define(
  "PopularPlace",
  {
    popularPlaceId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    image: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Inactive",
    },
  },
  {
    sequelize,
    modelName: "PopularPlace",
    tableName: "popular_places",
    paranoid: true,
  }
);

function validatePopularPlace(popularPlace) {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
  });

  return schema.validate(popularPlace);
}

module.exports = { PopularPlace, validatePopularPlace };
