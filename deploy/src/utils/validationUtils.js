const Joi = require("joi");

const extraOptionSchema = Joi.object({
  extraOptionId: Joi.number().required(),
  quantity: Joi.number().integer().min(1).required(),
});

const dateFormat =
  /^(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) ([01][0-9]|2[0-3]):[0-5][0-9]:00$/;

const dateFormatMessage =
  "Please use YYYY-MM-DD HH:mm:ss with numeric characters only.";

function validatePaymentStatus(status) {
  const schema = Joi.object({
    status: Joi.string()
      .valid(
        "AWAITING_PAYMENT",
        "PARTIALLY_PAID",
        "PAID",
        "PENDING_REFUND",
        "REFUNDED",
        "CANCELLED"
      )
      .required(),
  });

  return schema.validate(status);
}

function validateBookingStatus(status) {
  const schema = Joi.object({
    status: Joi.string()
      .valid(
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
      )
      .required(),
  });

  return schema.validate(status);
}

function validateAdminBookingApproval(bookingReq) {
  const schema = Joi.object({
    bookingId: Joi.number().required(),
    bookingType: Joi.string()
      .valid("P2P", "HOURLY_CHARTER", "AIRPORT")
      .required(),
    action: Joi.string().valid("ACCEPTED", "REJECTED").required(),
    rejectionReason: Joi.string().when("action", {
      is: "REJECTED",
      then: Joi.required(),
    }),
  });

  return schema.validate(bookingReq);
}

function validatePaymentUpdateReq(bookingReq) {
  const schema = Joi.object({
    bookingId: Joi.number().required(),
    bookingType: Joi.string()
      .valid("P2P", "HOURLY_CHARTER", "AIRPORT")
      .required(),
  });

  return schema.validate(bookingReq);
}

// payment-validations and message
const testCards = [
  // "4111111111111111",
  "5431111111111111",
  "371111111111114",
  "36000000000008",
];

const creditCardNumberMessage = {
  "string.empty": "Credit card number is required",
  // "any.required": "Credit card number is required",
  "string.creditCard": "Invalid card number",
  "any.custom": "{{#message}}",
};

const expirationDateMessage = {
  "string.empty": "Expiration date is required",
  // "any.required": "Expiration date is required",
  "string.pattern.base": "Expiration date must be in MM/YYYY format",
};

const securityCodeMessage = {
  "string.empty": "Security code is required",
  // "any.required": "Security code is required",
  "string.pattern.base": "Security code must contain only digits",
  "string.min": "Security code must be at least {{#limit}} digits long",
  "string.max": "Security code must not be longer than {{#limit}} digits",
};

module.exports = {
  extraOptionSchema,
  dateFormat,
  dateFormatMessage,
  validateAdminBookingApproval,
  validatePaymentStatus,
  validateBookingStatus,
  testCards,
  creditCardNumberMessage,
  expirationDateMessage,
  securityCodeMessage,
  validatePaymentUpdateReq,
};
