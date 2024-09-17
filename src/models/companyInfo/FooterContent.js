const { DataTypes } = require("sequelize");
const Joi = require("joi");
const { sequelize } = require("../../config/database.js");

const FooterContent = sequelize.define(
  "FooterContent",
  {
    footerContentId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contactPhoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    addressZipCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    addressState: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    aboutUsDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    termsAndCondition: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    safetyandTrust: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "FooterContent",
    tableName: "footer_content",
    paranoid: true,
  }
);

function validateFooterContent(footerContent) {
  const schema = Joi.object({
    contactEmail: Joi.string().email().required().label("Contact Email"),
    contactPhoneNumber: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .message("Please provide a valid phone number."),
    addressZipCode: Joi.string()
      .regex(/^\d{5}(?:[-\s]\d{4})?$/) // Regex for US ZIP codes
      .required()
      .label("Address ZIP Code")
      .messages({
        "string.pattern.base": "{{#label}} must be a valid US ZIP code",
      }),
    addressState: Joi.string().required().label("Address State"),
    aboutUsDescription: Joi.string().required().label("About Us Description"),
    termsAndCondition: Joi.string().required(),
    safetyandTrust: Joi.string().required(),
  });

  return schema.validate(footerContent);
}

module.exports = { validateFooterContent, FooterContent };
