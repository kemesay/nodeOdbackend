const { DataTypes } = require("sequelize");
const Joi = require("joi");
const { sequelize } = require("../../config/database.js");
const { Car } = require("../Car.js");
const { User } = require("../user/User.js");
const AirportBookExtraOption = require("./AirportBookExtraOption.js");
const { ExtraOption } = require("../ExtraOption.js");
const { Gratuity } = require("../Gratuity.js");
const { Airport } = require("./Airport.js");
const {
  AdditionalStopOnTheWay,
} = require("../booking/AdditionalStopOnTheWay.js");
const { AirportPickupPreference } = require("./AirportPickupPreference.js");

const { PaymentDetail } = require("../PaymentDetail.js");

const {
  extraOptionSchema,
  dateFormat,
  dateFormatMessage,
  testCards,
  creditCardNumberMessage,
  expirationDateMessage,
  securityCodeMessage,
} = require("../../utils/validationUtils");

const AirportBook = sequelize.define(
  "AirportBook",
  {
    airportBookId: {
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
      type: DataTypes.ENUM(
        "Ride to the airport(one way)",
        "Ride from the airport(one way)",
        "Ride to the airport(round trip)",
        "Ride from the airport(round trip)"
      ),
      allowNull: false,
    },

    numberOfPassengers: {
      type: DataTypes.INTEGER,
    },
    numberOfSuitcases: {
      type: DataTypes.INTEGER,
    },

    accommodationAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accommodationLongitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    accommodationLatitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    airline: {
      type: DataTypes.STRING,
    },

    arrivalFlightNumber: {
      type: DataTypes.STRING,
    },

    returnAirline: {
      type: DataTypes.STRING,
    },

    returnFlightNumber: {
      type: DataTypes.STRING,
    },

    specialInstructions: {
      type: DataTypes.TEXT,
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
    modelName: "AirportBook",
    tableName: "airport_books",
    paranoid: true,
  }
);

// Define association with PaymentDetail model
AirportBook.belongsTo(PaymentDetail, { foreignKey: "paymentDetailId" });

// Define association with User model
AirportBook.belongsTo(User, { foreignKey: "userId" });

// Define association with Airport model
AirportBook.belongsTo(Airport, { foreignKey: "airportId" });

// Define association with Car model
AirportBook.belongsTo(Car, { foreignKey: "carId" });

// Define association with Gratuity model
AirportBook.belongsTo(Gratuity, { foreignKey: "gratuityId" });

// Define association with AdditionalStopOnTheWay model
AirportBook.belongsTo(AdditionalStopOnTheWay, {
  foreignKey: "additionalStopId",
});

// Define association with AdditionalStopOnTheWay model
AirportBook.belongsTo(AirportPickupPreference, {
  foreignKey: "pickupPreferenceId",
});

// Associate AirportBook with ExtraOption through BookExtraOption
AirportBook.belongsToMany(ExtraOption, {
  through: AirportBookExtraOption,
  foreignKey: "airportBookId",
  otherKey: "extraOptionId",
  uniqueKey: "airport_book_extra_options_unique",
});

ExtraOption.belongsToMany(AirportBook, {
  through: AirportBookExtraOption,
  foreignKey: "extraOptionId",
  otherKey: "airportBookId",
  uniqueKey: "airport_book_extra_options_unique",
});

function validateAirportBook(airportBook) {
  const schema = Joi.object({
    tripType: Joi.string()
      .valid(
        "Ride to the airport(one way)",
        "Ride from the airport(one way)",
        "Ride to the airport(round trip)",
        "Ride from the airport(round trip)"
      )
      .required(),
    numberOfPassengers: Joi.number().integer().min(1).required(),
    numberOfSuitcases: Joi.number().integer().min(0).default(0),
    accommodationAddress: Joi.string().required(),
    accommodationLongitude: Joi.number().required(),
    accommodationLatitude: Joi.number().required(),
    airline: Joi.string(),
    arrivalFlightNumber: Joi.string(),

    returnAirline: Joi.string(),
    returnFlightNumber: Joi.string(),

    specialInstructions: Joi.string().allow(""),

    pickupDateTime: Joi.string()
      .regex(dateFormat)
      .message("Invalid pickup Date format. " + dateFormatMessage)
      .required(),

    returnPickupDateTime: Joi.string()
      .regex(dateFormat)
      .message("Invalid return Pickup Date format. " + dateFormatMessage)
      .when("tripType", {
        is: Joi.string().valid(
          "Ride to the airport(round trip)",
          "Ride from the airport(round trip)"
        ),
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),

    distanceInMiles: Joi.number().precision(2).required(),
    carId: Joi.number().integer().required(),
    gratuityId: Joi.number().integer().required(),
    airportId: Joi.number().integer().required(),
    extraOptions: Joi.array().items(extraOptionSchema).min(1),
    pickupPreferenceId: Joi.number().integer(),

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

  return schema.validate(airportBook);
}

module.exports = { AirportBook, validateAirportBook };
