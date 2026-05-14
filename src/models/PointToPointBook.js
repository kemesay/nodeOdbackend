// const { DataTypes } = require("sequelize");
// const Joi = require("joi");
// const { sequelize } = require("../config/database.js");
// const { Car } = require("./Car.js");
// const { User } = require("./user/User.js");
// const PointToPointBookExtraOption = require("./PointToPointBookExtraOption.js");
// const { ExtraOption } = require("./ExtraOption.js");
// const { Gratuity } = require("./Gratuity.js");
// const {
//   AdditionalStopOnTheWay,
// } = require("./booking/AdditionalStopOnTheWay.js");

// const { PaymentDetail } = require("./PaymentDetail.js");

// const {
//   extraOptionSchema,
//   dateFormat,
//   dateFormatMessage,
//   testCards,
//   creditCardNumberMessage,
//   expirationDateMessage,
//   securityCodeMessage,
// } = require("./../utils/validationUtils");

// const PointToPointBook = sequelize.define(
//   "PointToPointBook",
//   {
//     pointToPointBookId: {
//       type: DataTypes.BIGINT,
//       primaryKey: true,
//       autoIncrement: true,
//       allowNull: false,
//     },
//     confirmationNumber: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true,
//     },
//     tripType: {
//       type: DataTypes.ENUM("One-Way", "Round-Trip"),
//       allowNull: false,
//     },
//     pickupPhysicalAddress: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     pickupLongitude: {
//       type: DataTypes.FLOAT,
//       allowNull: false,
//     },
//     pickupLatitude: {
//       type: DataTypes.FLOAT,
//       allowNull: false,
//     },
//     dropoffPhysicalAddress: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     dropoffLongitude: {
//       type: DataTypes.FLOAT,
//       allowNull: false,
//     },
//     dropoffLatitude: {
//       type: DataTypes.FLOAT,
//       allowNull: false,
//     },

//     pickupDateTime: {
//       type: DataTypes.DATE,
//       set(value) {
//         const date = new Date(value);
//         date.setSeconds(0);
//         this.setDataValue("pickupDateTime", date);
//       },
//     },

//     returnPickupDateTime: {
//       type: DataTypes.DATE,
//       set(value) {
//         const date = new Date(value);
//         date.setSeconds(0);
//         this.setDataValue("returnPickupDateTime", date);
//       },
//     },

//     distanceInMiles: {
//       type: DataTypes.DOUBLE,
//       allowNull: false,
//     },

//     specialInstructions: {
//       type: DataTypes.TEXT,
//     },

//     additionalStopOnTheWayDescription: {
//       type: DataTypes.TEXT,
//     },

//     isGuestBooking: {
//       type: DataTypes.BOOLEAN,
//       defaultValue: false,
//     },
//     bookingFor: {
//       type: DataTypes.ENUM("Myself", "SomeoneElse"),
//       allowNull: false,
//       defaultValue: "Myself",
//     },
//     passengerFullName: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       validate: {
//         len: [2, 100],
//       },
//     },
//     paymentMethod: {
//       type: DataTypes.ENUM("PRIMARY_CARD", "EXISTING_CARD", "NEW_CARD"),
//       allowNull: false,
//     },
//     passengerCellPhone: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       validate: {
//         is: /^[0-9]{10,15}$/,
//       },
//     },
//     passengerEmail: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       validate: {
//         isEmail: true,
//         len: [1, 255],
//       },
//     },

//     numberOfPassengers: {
//       type: DataTypes.INTEGER,
//     },
//     numberOfSuitcases: {
//       type: DataTypes.INTEGER,
//     },

//     totalTripFeeInDollars: {
//       type: DataTypes.DECIMAL(10, 2),
//       validate: {
//         min: {
//           args: [1],
//         },
//       },
//     },

//     paymentStatus: {
//       type: DataTypes.ENUM(
//         "NOT_PAID",
//         "AWAITING_PAYMENT",
//         "PARTIALLY_PAID",
//         "PAID",
//         "PENDING_REFUND",
//         "REFUNDED",
//         "CANCELLED"
//       ),
//       defaultValue: "NOT_PAID",
//     },

//     bookingStatus: {
//       type: DataTypes.ENUM(
//         "PENDING_APPROVAL",
//         "UNDER_REVIEW",
//         "ACCEPTED",
//         "REJECTED",
//         "CANCELLED",
//         "AWAITING_PICKUP",
//         "PICKUP_COMPLETED",
//         "EN_ROUTE",
//         "AWAITING_RETURN_PICKUP",
//         "RETURN_PICKUP_COMPLETED",
//         "OVERDUE",
//         "DISPUTED",
//         "COMPLETED"
//       ),
//       defaultValue: "PENDING_APPROVAL",
//     },
//   },
//   {
//     sequelize,
//     modelName: "PointToPointBook",
//     tableName: "point_to_point_books",
//     paranoid: true,
//   }
// );

// // Define association with PaymentDetail model
// PointToPointBook.belongsTo(PaymentDetail, {
//   foreignKey: "paymentDetailId",
//   targetKey: "paymentDetailId"

// });

// // Define association with User model
// PointToPointBook.belongsTo(User, { foreignKey: "userId" });

// // Define association with Car model
// PointToPointBook.belongsTo(Car, { foreignKey: "carId" });

// // Define association with Gratuity model
// PointToPointBook.belongsTo(Gratuity, { foreignKey: "gratuityId" });

// // Define association with AdditionalStopOnTheWay model
// PointToPointBook.belongsTo(AdditionalStopOnTheWay, {
//   foreignKey: "additionalStopId",
// });

// // Associate PointToPointBook with ExtraOption through BookExtraOption
// PointToPointBook.belongsToMany(ExtraOption, {
//   through: PointToPointBookExtraOption,
//   foreignKey: "pointToPointBookId",
//   otherKey: "extraOptionId",
//   uniqueKey: "book_extra_options_unique",
// });

// ExtraOption.belongsToMany(PointToPointBook, {
//   through: PointToPointBookExtraOption,
//   foreignKey: "extraOptionId",
//   otherKey: "pointToPointBookId",
//   uniqueKey: "book_extra_options_unique",
// });
// const cardDetailsSchema = Joi.object({
//   creditCardNumber: Joi.string()
//     .creditCard()
//     .required()
//     .messages({
//       'string.creditCard': 'Invalid credit card number',
//       'any.required': 'Credit card number is required'
//     }),
//   expirationDate: Joi.string()
//     .pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
//     .required()
//     .custom((value, helpers) => {
//       const [month, year] = value.split('/');
//       const currentYear = new Date().getFullYear() % 100;
//       const currentMonth = new Date().getMonth() + 1;
      
//       // Convert YY to full year (2000 + YY)
//       const fullYear = 2000 + parseInt(year, 10);
      
//       // Check if expiration date is in the future
//       if (
//         fullYear < new Date().getFullYear() || 
//         (fullYear === new Date().getFullYear() && parseInt(month, 10) < currentMonth)
//       ) {
//         return helpers.error('date.expired');
//       }
      
//       return value;
//     })
//     .messages({
//       'string.pattern.base': 'Expiration date must be in MM/YY format',
//       'date.expired': 'Card has expired',
//       'any.required': 'Expiration date is required'
//     }),
//   securityCode: Joi.string()
//     .pattern(/^[0-9]{3,4}$/)
//     .required()
//     .messages({
//       'string.pattern.base': 'Security code must be 3 or 4 digits',
//       'any.required': 'Security code is required'
//     }),
//   zipCode: Joi.string()
//     .pattern(/^[0-9]{5}(?:-[0-9]{4})?$/)
//     .required()
//     .messages({
//       'string.pattern.base': 'Invalid ZIP code format',
//       'any.required': 'ZIP code is required'
//     }),
//   cardOwnerName: Joi.string()
//     .min(2)
//     .max(100)
//     .pattern(/^[a-zA-Z\s]+$/)
//     .required()
//     .messages({
//       'string.min': 'Cardholder name must be at least 2 characters',
//       'string.max': 'Cardholder name must be less than 100 characters',
//       'string.pattern.base': 'Cardholder name can only contain letters and spaces',
//       'any.required': 'Cardholder name is required'
//     })
// });
// function validatePointToPointBook(pointToPointBook) {
//   const schema = Joi.object({
//     tripType: Joi.string().valid("One-Way", "Round-Trip").required(),
//     pickupPhysicalAddress: Joi.string().required(),
//     pickupLongitude: Joi.number().required(),
//     pickupLatitude: Joi.number().required(),
//     dropoffPhysicalAddress: Joi.string().required(),
//     dropoffLongitude: Joi.number().required(),
//     dropoffLatitude: Joi.number().required(),
//     distanceInMiles: Joi.number().precision(2).required(),
//     numberOfPassengers: Joi.number().integer().min(1).required(),
//     numberOfSuitcases: Joi.number().integer().min(0).default(0),
//     carId: Joi.number().integer().required(),
//     gratuityId: Joi.number().integer().required(),
//     extraOptions: Joi.array().items(extraOptionSchema).min(1),
//     pickupDateTime: Joi.string()
//       .regex(dateFormat)
//       .message("Invalid pickup Date format. " + dateFormatMessage)
//       .required(),
//     returnPickupDateTime: Joi.string()
//       .regex(dateFormat)
//       .message("Invalid return Pickup Date format. " + dateFormatMessage)
//       .when("tripType", {
//         is: "Round-Trip",
//         then: Joi.required(),
//         otherwise: Joi.forbidden(),
//       }),

//     specialInstructions: Joi.string().allow(""),
//     additionalStopId: Joi.number().integer(),
//     additionalStopOnTheWayDescription: Joi.string().when("additionalStopId", {
//       is: Joi.exist(),
//       then: Joi.required(),
//       otherwise: Joi.forbidden(),
//     }),
//     paymentDetailId: Joi.number().integer().allow(null),


//     isGuestBooking: Joi.boolean().default(false).required(),
//     bookingFor: Joi.string().valid("Myself", "SomeoneElse").required(),
//     passengerFullName: Joi.string().min(2).max(100).required(),
//     paymentMethod: Joi.string()
//       .valid("PRIMARY_CARD", "EXISTING_CARD", "NEW_CARD")
//       .default("NEW_CARD"),
//     passengerEmail: Joi.string().email().max(255).required(),
//     passengerCellPhone: Joi.string()
//       .pattern(/^[0-9]{10,15}$/)
//       .message("Please provide a valid guest phone number.")
//       .required(),

//     //Payment info
//     cardDetails: Joi.when('paymentMethod', {
//       is: 'NEW_CARD',
//       then: cardDetailsSchema.required(),
//       otherwise: Joi.forbidden()
//     }),
//     paymentDetailId: Joi.when('paymentMethod', {
//       is: 'EXISTING_CARD',
//       then: Joi.number().required(),
//       otherwise: Joi.forbidden()
//     })

//   });

//   return schema.validate(pointToPointBook);
// }




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
    modelName: "PointToPointBook",
    tableName: "point_to_point_books",
    paranoid: true,
  }
);

// Define association with PaymentDetail model
PointToPointBook.belongsTo(PaymentDetail, {
  foreignKey: "paymentDetailId",
  targetKey: "paymentDetailId"

});

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

const validatePointToPointBook = Joi.object({
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
  paymentDetailId: Joi.number().integer().allow(null),


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

/**
 * User update schema (partial). Payment fields and status fields are intentionally excluded.
 */
const validatePointToPointBookUpdate = Joi.object({
  tripType: Joi.string().valid("One-Way", "Round-Trip"),
  pickupPhysicalAddress: Joi.string(),
  pickupLongitude: Joi.number(),
  pickupLatitude: Joi.number(),
  dropoffPhysicalAddress: Joi.string(),
  dropoffLongitude: Joi.number(),
  dropoffLatitude: Joi.number(),
  distanceInMiles: Joi.number().precision(2),
  numberOfPassengers: Joi.number().integer().min(1),
  numberOfSuitcases: Joi.number().integer().min(0),
  pickupDateTime: Joi.string()
    .regex(dateFormat)
    .message("Invalid pickup Date format. " + dateFormatMessage),
  returnPickupDateTime: Joi.string()
    .regex(dateFormat)
    .message("Invalid return Pickup Date format. " + dateFormatMessage)
    .when("tripType", {
      is: "Round-Trip",
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),
  specialInstructions: Joi.string().allow(""),
  additionalStopId: Joi.number().integer().allow(null),
  additionalStopOnTheWayDescription: Joi.string().allow(""),
  carId: Joi.number().integer().allow(null),
  gratuityId: Joi.number().integer().allow(null),
  extraOptions: Joi.array().items(extraOptionSchema).min(0),
  bookingFor: Joi.string().valid("Myself", "SomeoneElse"),
  passengerFullName: Joi.string().min(2).max(100),
  passengerEmail: Joi.string().email().max(255),
  passengerCellPhone: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .message("Please provide a valid guest phone number."),
}).min(1);

module.exports = {
  PointToPointBook,
  validatePointToPointBook,
  validatePointToPointBookUpdate,
};

// module.exports = { validatePointToPointBook, PointToPointBook };
