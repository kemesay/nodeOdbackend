const { DataTypes } = require("sequelize");
const Joi = require("joi");
const { sequelize } = require("../config/database.js");
const { Car } = require("./Car.js");
const { User } = require("./user/User.js");
const PointToPointBookExtraOption = require("./PointToPointBookExtraOption.js");
const { ExtraOption } = require("./ExtraOption.js");
const { Gratuity } = require("./Gratuity.js");
const {
  AdditionalStopOnTheWay,
} = require("./booking/AdditionalStopOnTheWay.js");

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

const PointToPointBook = sequelize.define(
  "PointToPointBook",
  {
    pointToPointBookId: {
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
    tripType: {
      type: DataTypes.ENUM("One-Way", "Round-Trip"),
      allowNull: false,
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

    returnPickupDateTime: {
      type: DataTypes.DATE,
      set(value) {
        const date = new Date(value);
        date.setSeconds(0);
        this.setDataValue("returnPickupDateTime", date);
      },
    },

    distanceInMiles: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    specialInstructions: {
      type: DataTypes.TEXT,
    },

    additionalStopOnTheWayDescription: {
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
    modelName: "PointToPointBook",
    tableName: "point_to_point_books",
    paranoid: true,
  }
);

// Define association with PaymentDetail model
PointToPointBook.belongsTo(PaymentDetail, { foreignKey: "paymentDetailId" });

// Define association with User model
PointToPointBook.belongsTo(User, { foreignKey: "userId" });

// Define association with Car model
PointToPointBook.belongsTo(Car, { foreignKey: "carId" });

// Define association with Gratuity model
PointToPointBook.belongsTo(Gratuity, { foreignKey: "gratuityId" });

// Define association with AdditionalStopOnTheWay model
PointToPointBook.belongsTo(AdditionalStopOnTheWay, {
  foreignKey: "additionalStopId",
});

// Associate PointToPointBook with ExtraOption through BookExtraOption
PointToPointBook.belongsToMany(ExtraOption, {
  through: PointToPointBookExtraOption,
  foreignKey: "pointToPointBookId",
  otherKey: "extraOptionId",
  uniqueKey: "book_extra_options_unique",
});

ExtraOption.belongsToMany(PointToPointBook, {
  through: PointToPointBookExtraOption,
  foreignKey: "extraOptionId",
  otherKey: "pointToPointBookId",
  uniqueKey: "book_extra_options_unique",
});

function validatePointToPointBook(pointToPointBook) {
  const schema = Joi.object({
    tripType: Joi.string().valid("One-Way", "Round-Trip").required(),
    pickupPhysicalAddress: Joi.string().required(),
    pickupLongitude: Joi.number().required(),
    pickupLatitude: Joi.number().required(),
    dropoffPhysicalAddress: Joi.string().required(),
    dropoffLongitude: Joi.number().required(),
    dropoffLatitude: Joi.number().required(),
    distanceInMiles: Joi.number().precision(2).required(),
    numberOfPassengers: Joi.number().integer().min(1).required(),
    numberOfSuitcases: Joi.number().integer().min(0).default(0),
    carId: Joi.number().integer().required(),
    gratuityId: Joi.number().integer().required(),
    extraOptions: Joi.array().items(extraOptionSchema).min(1),
    pickupDateTime: Joi.string()
      .regex(dateFormat)
      .message("Invalid pickup Date format. " + dateFormatMessage)
      .required(),
    returnPickupDateTime: Joi.string()
      .regex(dateFormat)
      .message("Invalid return Pickup Date format. " + dateFormatMessage)
      .when("tripType", {
        is: "Round-Trip",
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),

    specialInstructions: Joi.string().allow(""),
    additionalStopId: Joi.number().integer(),
    additionalStopOnTheWayDescription: Joi.string().when("additionalStopId", {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),

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

  return schema.validate(pointToPointBook);
}

module.exports = { validatePointToPointBook, PointToPointBook };
