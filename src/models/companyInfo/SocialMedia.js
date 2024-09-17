const { DataTypes } = require("sequelize");
const Joi = require("joi");
const { sequelize } = require("../../config/database.js");

const SocialMedia = sequelize.define(
  "SocialMedia",
  {
    socialMediaId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Inactive",
    },
  },
  {
    sequelize,
    modelName: "SocialMedia",
    tableName: "social_media",
    paranoid: true,
  }
);

function validateSocialMedia(socialMedia) {
  const schema = Joi.object({
    link: Joi.string().required(),
    title: Joi.string(),
  });

  return schema.validate(socialMedia);
}

module.exports = { validateSocialMedia, SocialMedia };
