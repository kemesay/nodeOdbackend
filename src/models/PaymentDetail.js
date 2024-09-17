const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");
const Joi = require("joi");
const creditCardType = require("credit-card-type");
const { User } = require("./user/User.js");
const {
  testCards,
  creditCardNumberMessage,
  expirationDateMessage,
  securityCodeMessage,
} = require("../utils/validationUtils.js");

const PaymentDetail = sequelize.define(
  "PaymentDetail",
  {
    paymentDetailId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    creditCardNumber: {
      type: DataTypes.STRING(16), // 16-digit credit card number
      allowNull: false,
      validate: {
        isCreditCard: true, // Validates as a credit card number
      },
    },
    expirationDate: {
      type: DataTypes.STRING(7), // MM/YYYY format
      allowNull: false,
      validate: {
        isExpirationDate: function (value) {
          // Custom validation for MM/YYYY format
          if (!/^\d{2}\/\d{4}$/.test(value)) {
            throw new Error("Expiration date must be in MM/YYYY format");
          }
        },
      },
    },
    securityCode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isSecurityCode: function (value) {
          // Validates security code based on card type (3 or 4 digits)
          const cardType = creditCardType(this.creditCardNumber);
          const expectedLength = cardType[0] === "American Express" ? 4 : 3;
          if (value.length !== expectedLength || !/^\d+$/.test(value)) {
            throw new Error(`Security code must be ${expectedLength} digits`);
          }
        },
      },
    },

    zipCode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isZipCode(value) {
          // Validates ZIP code format for US ZIP codes (5-digit or 5+4 format)
          if (!/^\d{5}(-\d{4})?$/.test(value)) {
            throw new Error(
              "ZIP code must be in 5-digit or 5+4 format (e.g., 12345 or 12345-6789)"
            );
          }
        },
      },
    },
    cardOwnerName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
  },
  {
    sequelize,
    modelName: "PaymentDetail",
    tableName: "payment_details",
  }
);

// Define association with User model
User.hasOne(PaymentDetail, { foreignKey: "userId" });
PaymentDetail.belongsTo(User, { foreignKey: "userId" });

// // Joi schema for PaymentDetail
function validatePaymentDetail(data) {
  const schema = Joi.object({
    creditCardNumber: Joi.string()
      .creditCard()
      .custom((value, helpers) => {
        if (testCards.includes(value.replace(/\s/g, ""))) {
          return helpers.message("Test card is not allowed");
        }
        return value;
      })
      .required()
      .messages(creditCardNumberMessage),

    expirationDate: Joi.string()
      .pattern(/^\d{2}\/\d{4}$/) // MM/YYYY format
      .required()
      .messages(expirationDateMessage),

    securityCode: Joi.string()
      .pattern(/^\d+$/) // Only digits
      .min(3) // Minimum length for most cards
      .max(4) // Maximum length for American Express
      .required()
      .messages(securityCodeMessage),

    zipCode: Joi.string()
      .pattern(/^\d{5}(-\d{4})?$/) // US zip code format
      .required()
      .messages({
        "string.pattern.base":
          "Zip code must be in the format 12345 or 12345-6789",
        "any.required": "Zip code is required",
      }),
    cardOwnerName: Joi.string().min(2).max(50).required().messages({
      "string.base": "Card owner name must be a string",
      "string.empty": "Card owner name is required",
      "string.min": "Card owner name must be at least 2 characters long",
      "string.max":
        "Card owner name must be less than or equal to 50 characters",
      "any.required": "Card owner name is required",
    }),
  });

  return schema.validate(data);
}

module.exports = {
  validatePaymentDetail,
  PaymentDetail,
};
