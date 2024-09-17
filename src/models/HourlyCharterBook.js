const { DataTypes } = require("sequelize");
const Joi = require("joi");
const { sequelize } = require("../config/database.js");
const { Car } = require("./Car.js");
const { User } = require("./user/User.js");
const HourlyCharterBookExtraOptions = require("./HourlyCharterBookExtraOption.js");
const { ExtraOption } = require("./ExtraOption.js");
const { Gratuity } = require("./Gratuity.js");

const { PaymentDetail } = require("./PaymentDetail.js");

const {
  extraOptionSchema,
  dateFormat,
  dateFormatMessage,
  testCards,
  creditCardNumberMessage,
  expirationDateMessage,
  securityCodeMessage,
} = require("./../utils/validationUtils");

const HourlyCharterBook = sequelize.define(
  "HourlyCharterBook",
  {
    hourlyCharterBookId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    confirmationNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    pickupPhysicalAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pickupLongitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    pickupLatitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    dropoffPhysicalAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dropoffLongitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    dropoffLatitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    pickupDateTime: {
      type: DataTypes.DATE,
      set(value) {
        const date = new Date(value);
        date.setSeconds(0);
        this.setDataValue("pickupDateTime", date);
      },
    },

    selectedHours: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    occasion: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    specialInstructions: {
      type: DataTypes.TEXT,
    },

    isGuestBooking: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    bookingFor: {
      type: DataTypes.ENUM("Myself", "SomeoneElse"),
      allowNull: false,
      defaultValue: "Myself",
    },
    passengerFullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    passengerCellPhone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[0-9]{10,15}$/,
      },
    },
    passengerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        len: [1, 255],
      },
    },

    numberOfPassengers: {
      type: DataTypes.INTEGER,
    },
    numberOfSuitcases: {
      type: DataTypes.INTEGER,
    },

    totalTripFeeInDollars: {
      type: DataTypes.DECIMAL(10, 2),
      validate: {
        min: {
          args: [1],
        },
      },
    },
    paymentStatus: {
      type: DataTypes.ENUM(
        "NOT_PAID",
        "AWAITING_PAYMENT",
        "PARTIALLY_PAID",
        "PAID",
        "PENDING_REFUND",
        "REFUNDED",
        "CANCELLED"
      ),
      defaultValue: "NOT_PAID",
    },

    bookingStatus: {
      type: DataTypes.ENUM(
        "PENDING_APPROVAL",
        "UNDER_REVIEW",
        "ACCEPTED",
        "REJECTED",
        "CANCELLED",
        "AWAITING_PICKUP",
        "PICKUP_COMPLETED",
        "EN_ROUTE",
        "AWAITING_RETURN_PICKUP",
        "RETURN_PICKUP_COMPLETED",
        "OVERDUE",
        "DISPUTED",
        "COMPLETED"
      ),
      defaultValue: "PENDING_APPROVAL",
    },
  },
  {
    sequelize,
    modelName: "HourlyCharterBook",
    tableName: "hourly_charter_books",
    paranoid: true,
  }
);

// Define association with PaymentDetail model
HourlyCharterBook.belongsTo(PaymentDetail, { foreignKey: "paymentDetailId" });

// Define association with User model
HourlyCharterBook.belongsTo(User, { foreignKey: "userId" });

// Define association with Car model
HourlyCharterBook.belongsTo(Car, { foreignKey: "carId" });

// Define association with Gratuity model
HourlyCharterBook.belongsTo(Gratuity, { foreignKey: "gratuityId" });

// Associate HourlyCharterBook with ExtraOption through HourlyCharterBookExtraOptions
HourlyCharterBook.belongsToMany(ExtraOption, {
  through: HourlyCharterBookExtraOptions,
  foreignKey: "hourlyCharterBookId",
  otherKey: "extraOptionId",
  uniqueKey: "book_extra_options_unique",
});

ExtraOption.belongsToMany(HourlyCharterBook, {
  through: HourlyCharterBookExtraOptions,
  foreignKey: "extraOptionId",
  otherKey: "hourlyCharterBookId",
  uniqueKey: "book_extra_options_unique",
});

function validateHourlyCharterBook(hourlyCharterBook) {
  const schema = Joi.object({
    pickupPhysicalAddress: Joi.string().required(),
    pickupLongitude: Joi.number().required(),
    pickupLatitude: Joi.number().required(),
    dropoffPhysicalAddress: Joi.string().required(),
    dropoffLongitude: Joi.number().required(),
    dropoffLatitude: Joi.number().required(),
    selectedHours: Joi.number().integer().min(1).max(24).required(),
    occasion: Joi.string().min(1).max(100).required(),
    numberOfPassengers: Joi.number().integer().min(1).required(),
    numberOfSuitcases: Joi.number().integer().min(0).default(0),
    carId: Joi.number().integer().required(),
    gratuityId: Joi.number().integer().required(),
    extraOptions: Joi.array().items(extraOptionSchema).min(1),
    pickupDateTime: Joi.string()
      .regex(dateFormat)
      .message("Invalid pickup Date format. " + dateFormatMessage)
      .required(),
    specialInstructions: Joi.string().allow(""),

    isGuestBooking: Joi.boolean().default(false).required(),
    bookingFor: Joi.string().valid("Myself", "SomeoneElse").required(),
    passengerFullName: Joi.string().min(2).max(100).required(),
    passengerEmail: Joi.string().email().max(255).required(),
    passengerCellPhone: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .message("Please provide a valid guest phone number.")
      .required(),

    //Payment info
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

  return schema.validate(hourlyCharterBook);
}

module.exports = { validateHourlyCharterBook, HourlyCharterBook };
