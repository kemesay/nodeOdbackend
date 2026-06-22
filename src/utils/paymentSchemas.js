const Joi = require("joi");
const {
  isLegacyPaymentProvider,
  isSquarePaymentProvider,
} = require("../config/paymentConfig.js");

const squareSourceSchema = Joi.object({
  sourceId: Joi.string().required().messages({
    "any.required": "square.sourceId is required (card nonce from Square SDK)",
  }),
  verificationToken: Joi.string().allow("", null),
});

const legacyPaymentMethods = ["PRIMARY_CARD", "EXISTING_CARD", "NEW_CARD"];
const squarePaymentMethods = [
  "SQUARE_NEW_CARD",
  "SQUARE_SAVED_CARD",
  "PRIMARY_CARD",
  "EXISTING_CARD",
];

function paymentMethodValidList() {
  if (isLegacyPaymentProvider()) {
    return legacyPaymentMethods;
  }
  if (isSquarePaymentProvider()) {
    return [...squarePaymentMethods];
  }
  return [...legacyPaymentMethods, ...squarePaymentMethods];
}

function buildPaymentValidationExtensions(baseSchema) {
  const methods = paymentMethodValidList();

  return baseSchema
    .keys({
      paymentMethod: Joi.string()
        .valid(...methods)
        .default(isSquarePaymentProvider() ? "SQUARE_NEW_CARD" : "NEW_CARD"),
      square: Joi.when("paymentMethod", {
        is: "SQUARE_NEW_CARD",
        then: squareSourceSchema.required(),
        otherwise: Joi.forbidden(),
      }),
      squareCardId: Joi.when("paymentMethod", {
        is: "SQUARE_SAVED_CARD",
        then: Joi.string().required(),
        otherwise: Joi.forbidden(),
      }),
      paymentDetailId: Joi.when("paymentMethod", {
        is: Joi.valid("EXISTING_CARD", "SQUARE_SAVED_CARD"),
        then: Joi.when("paymentMethod", {
          is: "EXISTING_CARD",
          then: Joi.number().required(),
          otherwise: Joi.number().optional(),
        }),
        otherwise: Joi.forbidden(),
      }),
      cardDetails: Joi.when("paymentMethod", {
        is: "NEW_CARD",
        then: Joi.when("$legacyAllowed", {
          is: true,
          then: Joi.object().unknown(true).required(),
          otherwise: Joi.forbidden().messages({
            "any.unknown":
              "Raw cardDetails are deprecated. Use Square Web/Mobile SDK and paymentMethod SQUARE_NEW_CARD with square.sourceId.",
          }),
        }),
        otherwise: Joi.forbidden(),
      }),
    })
    .custom((value, helpers) => {
      if (
        isSquarePaymentProvider() &&
        value.paymentMethod === "NEW_CARD" &&
        value.cardDetails
      ) {
        return helpers.message(
          "paymentMethod NEW_CARD with cardDetails is deprecated. Use SQUARE_NEW_CARD and square.sourceId from Square SDK."
        );
      }
      return value;
    });
}

module.exports = {
  squareSourceSchema,
  buildPaymentValidationExtensions,
  paymentMethodValidList,
};
