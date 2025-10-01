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
    discountAmountInDollars: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      validate: {
        min: 0,
      },
    },
    hasDiscountApplied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    paymentStatus: {
      type: DataTypes.ENUM(
        "NOT_PAID",
        "AWAITING_PAYMENT",
        "PARTIALLY_PAID",
        "PAID",
        "PENDING_REFUND",
        "REFUNDED",
        "CANCELLED",
        "DISCOUNT_APPLIED"
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
HourlyCharterBook.belongsTo(PaymentDetail, { 
  foreignKey: "paymentDetailId" ,
  targetKey: "paymentDetailId"
});

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

const validateHourlyCharterBook = Joi.object({
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
  paymentMethod: Joi.string()
    .valid("PRIMARY_CARD", "EXISTING_CARD", "NEW_CARD")
    .default("NEW_CARD"),
  passengerEmail: Joi.string().email().max(255).required(),
  passengerCellPhone: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .message("Please provide a valid guest phone number.")
    .required(),

  //Payment info
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

module.exports = { validateHourlyCharterBook, HourlyCharterBook };
