const { Op } = require("sequelize");
const { PaymentDetail } = require("../models/PaymentDetail.js");
const { ValidationError, ResourceNotFoundError } = require("../errors/CustomErrors.js");

async function addOrUpdatePaymentDetail(
  creditCardNumber,
  expirationDate,
  securityCode,
  zipCode,
  cardOwnerName,
  ...otherData
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
      isPrimary: false,
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
      isPrimary: false,
    });

    return newPaymentDetail;
  }

}

async function getPaymentDetail(creditCardNumber, expirationDate, securityCode, zipCode, cardOwnerName) {
  const paymentDetail = await PaymentDetail.findOne({
    where: {
      creditCardNumber,
      expirationDate,
      securityCode,
      zipCode,
      cardOwnerName,
    },
  });
  return paymentDetail;
}

async function createPaymentDetail(cardDetails) {
  try {
    // If this is marked as primary, unset any existing primary cards for this user
    if (cardDetails.isPrimary && cardDetails.userId) {
      await PaymentDetail.update(
        { isPrimary: false },
        {
          where: {
            userId: cardDetails.userId,
            isPrimary: true
          }
        }
      );
    }

    const paymentDetail = await PaymentDetail.create({
      creditCardNumber: cardDetails.creditCardNumber,
      expirationDate: cardDetails.expirationDate,
      securityCode: cardDetails.securityCode,
      zipCode: cardDetails.zipCode,
      cardOwnerName: cardDetails.cardOwnerName,
      userId: cardDetails.userId || null,
      isPrimary: cardDetails.isPrimary || false
    });

    return paymentDetail;
  } catch (error) {
    throw new Error(`Failed to create payment detail: ${error.message}`);
  }
}

async function updatePaymentDetail(paymentDetailId, paymentDetailData) {
  const paymentDetail = await getPaymentDetailById(paymentDetailId);
  if (!paymentDetail) {
    throw new Error("Payment detail  with id ${paymentDetailId} not found");
  }
   return  await paymentDetail.update(paymentDetailData);
}
async function getPaymentDetails({
  page = 1,
  pageSize = 10,
  sortDirection = "DESC",
}) {
  const paymentDetails = await PaymentDetail.findAll({
    order: [["createdAt", sortDirection]],
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });
  return paymentDetails;
}

async function getPaymentDetailById(paymentDetailId) {
  const paymentDetail = await PaymentDetail.findByPk(paymentDetailId);
  if (!paymentDetail) {
    throw new Error(`Payment detail with id ${paymentDetailId} not found`);
  }
  return paymentDetail;
}

async function deletePaymentDetail(paymentDetailId) {
  const paymentDetail = await PaymentDetail.getPaymentDetailById(paymentDetailId);
  if (!paymentDetail) {
    throw new Error("Payment detail not found");
  }
  await paymentDetail.destroy();
}
async function getPrimaryCard(userId) {
  if (!userId) {
    throw new ValidationError("User ID is required to fetch primary card");
  }

  const primaryCard = await PaymentDetail.findOne({
    where: {
      userId: userId,
      isPrimary: true
    }
  });

  if (!primaryCard) {
    throw new ValidationError("No primary card found for this user");
  }

  return primaryCard;
}
async function getFromExistingCards(paymentDetailId, userId) {
  if (!paymentDetailId || !userId) {
    throw new ValidationError("Payment detail ID and user ID are required");
  }

  const card = await PaymentDetail.findOne({
    where: {
      paymentDetailId: paymentDetailId,
      userId: userId
    }
  });

  if (!card) {
    throw new ValidationError("Card not found or unauthorized access");
  }

  return card;
}



module.exports = {
  addOrUpdatePaymentDetail,
  getPaymentDetail,
  createPaymentDetail,
  updatePaymentDetail,
  getPaymentDetails,
  getPaymentDetailById,
  deletePaymentDetail,
  getPrimaryCard,
  getFromExistingCards,
};
