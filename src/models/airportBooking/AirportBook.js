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
    paymentMethod: {
      type: DataTypes.ENUM("PRIMARY_CARD", "EXISTING_CARD", "NEW_CARD"),
      allowNull: false,
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
AirportBook.belongsTo(PaymentDetail, { 
  foreignKey: "paymentDetailId",
  targetKey: "paymentDetailId"
});

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

const cardDetailsSchema = Joi.object({
  creditCardNumber: Joi.string()
    .creditCard()
    .required()
    .messages({
      'string.creditCard': 'Invalid credit card number',
      'any.required': 'Credit card number is required'
    }),
  expirationDate: Joi.string()
    .pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
    .required()
    .custom((value, helpers) => {
      const [month, year] = value.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      // Convert YY to full year (2000 + YY)
      const fullYear = 2000 + parseInt(year, 10);
      
      // Check if expiration date is in the future
      if (
        fullYear < new Date().getFullYear() || 
        (fullYear === new Date().getFullYear() && parseInt(month, 10) < currentMonth)
      ) {
        return helpers.error('date.expired');
      }
      
      return value;
    })
    .messages({
      'string.pattern.base': 'Expiration date must be in MM/YY format',
      'date.expired': 'Card has expired',
      'any.required': 'Expiration date is required'
    }),
  securityCode: Joi.string()
    .pattern(/^[0-9]{3,4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Security code must be 3 or 4 digits',
      'any.required': 'Security code is required'
    }),
  zipCode: Joi.string()
    .pattern(/^[0-9]{5}(?:-[0-9]{4})?$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ZIP code format',
      'any.required': 'ZIP code is required'
    }),
  cardOwnerName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'Cardholder name must be at least 2 characters',
      'string.max': 'Cardholder name must be less than 100 characters',
      'string.pattern.base': 'Cardholder name can only contain letters and spaces',
      'any.required': 'Cardholder name is required'
    })
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
    accommodationAddress: Joi.string().required(),
    accommodationLongitude: Joi.number().required(),
    accommodationLatitude: Joi.number().required(),
    pickupDateTime: Joi.string()
      .regex(dateFormat)
      .message("Invalid pickup Date format. " + dateFormatMessage)
      .required(),
    distanceInMiles: Joi.number().precision(2).required(),
    passengerFullName: Joi.string().min(2).max(100).required(),
    passengerEmail: Joi.string().email().max(255).required(),
    passengerCellPhone: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .message("Please provide a valid guest phone number.")
      .required(),
    numberOfSuitcases: Joi.number().integer().min(0).default(0),
    isGuestBooking: Joi.boolean().default(false),
    bookingFor: Joi.string().valid("Myself", "SomeoneElse").default("Myself"),
    paymentMethod: Joi.string()
      .valid("PRIMARY_CARD", "EXISTING_CARD", "NEW_CARD")
      .default("NEW_CARD"),
    airline: Joi.string().allow(""),
    arrivalFlightNumber: Joi.string().allow(""),
    returnAirline: Joi.string().allow(""),
    returnFlightNumber: Joi.string().allow(""),
    specialInstructions: Joi.string().allow(""),
    carId: Joi.number().integer().allow(null),
    gratuityId: Joi.number().integer().allow(null),
    airportId: Joi.number().integer().allow(null),
    extraOptions: Joi.array().items(extraOptionSchema).min(0),
    pickupPreferenceId: Joi.number().integer().allow(null),
    additionalStopId: Joi.number().integer().allow(null),
    additionalStopOnTheWayDescription: Joi.string().allow(""),
    paymentDetailId: Joi.number().integer().allow(null),
    returnPickupDateTime: Joi.string()
      .regex(dateFormat)
      .message("Invalid return Pickup Date format. " + dateFormatMessage)
      .when("tripType", {
        is: Joi.string().valid(
          "Ride to the airport(round trip)",
          "Ride from the airport(round trip)"
        ),
        then: Joi.required(),
        otherwise: Joi.allow(null),
      }),
    cardDetails: Joi.when('paymentMethod', {
      is: 'NEW_CARD',
      then: cardDetailsSchema.required(),
      otherwise: Joi.forbidden()
    }),
    paymentDetailId: Joi.when('paymentMethod', {
      is: 'EXISTING_CARD',
      then: Joi.number().required(),
      otherwise: Joi.forbidden()
    })
  });

  return schema.validate(airportBook);
}

module.exports = { AirportBook, validateAirportBook };
