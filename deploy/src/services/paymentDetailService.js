const { Op } = require("sequelize");
const { PaymentDetail } = require("../models/PaymentDetail.js");

async function addOrUpdatePaymentDetail(
  creditCardNumber,
  expirationDate,
  securityCode,
  zipCode,
  cardOwnerName
) {
  // Find a payment detail with the given credit card details
  const existingPaymentDetail = await PaymentDetail.findOne({
    where: {
      creditCardNumber,
      expirationDate,
      securityCode,
      zipCode,
      cardOwnerName,
    },
  });

  if (existingPaymentDetail) {
    // If found, update the existing record
    await existingPaymentDetail.update({
      creditCardNumber,
      expirationDate,
      securityCode,
      zipCode,
      cardOwnerName,
    });

    return existingPaymentDetail;
  } else {
    // If not found, create a new payment detail
    const newPaymentDetail = await PaymentDetail.create({
      creditCardNumber,
      expirationDate,
      securityCode,
      zipCode,
      cardOwnerName,
    });

    return newPaymentDetail;
  }
}

module.exports = addOrUpdatePaymentDetail;
