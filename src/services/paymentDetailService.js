const { sequelize } = require("../config/database"); // Adjust path as needed
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

async function findExistingCard(cardDetails) {
  return await PaymentDetail.findOne({
    where: {
      creditCardNumber: cardDetails.creditCardNumber,
      expirationDate: cardDetails.expirationDate,
      securityCode: cardDetails.securityCode,
      zipCode: cardDetails.zipCode,
      cardOwnerName: cardDetails.cardOwnerName,
      userId: cardDetails.userId || null
    }
  });
}

async function handlePrimaryCardUpdate(userId, newPrimaryId = null) {
  if (!userId) return;
  
  // Find current primary card
  const currentPrimary = await PaymentDetail.findOne({
    where: {
      userId,
      isPrimary: true
    }
  });

  // If there's a current primary card and it's not the new one being set
  if (currentPrimary && (!newPrimaryId || currentPrimary.paymentDetailId !== newPrimaryId)) {
    await currentPrimary.update({ isPrimary: false });
  }
}

async function createPaymentDetail(cardDetails) {
  // Check if identical card already exists
  const existingCard = await findExistingCard(cardDetails);
  if (existingCard) {
    // Update existing card instead of creating new one
    return await updatePaymentDetail(existingCard.paymentDetailId, cardDetails);
  }

  // Handle primary card logic
  if (cardDetails.isPrimary && cardDetails.userId) {
    await handlePrimaryCardUpdate(cardDetails.userId);
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
}

async function updatePaymentDetail(paymentDetailId, paymentDetailData) {
  const paymentDetail = await getPaymentDetailById(paymentDetailId);
  if (!paymentDetail) {
    throw new ResourceNotFoundError(`Payment detail with id ${paymentDetailId} not found`);
  }

  // Check if identical card already exists elsewhere
  const existingCard = await findExistingCard(paymentDetailData);
  if (existingCard && existingCard.paymentDetailId !== paymentDetailId) {
    throw new ValidationError("This card already exists in the system");
  }

  // Handle primary card logic
  if (paymentDetailData.isPrimary && paymentDetail.userId) {
    await handlePrimaryCardUpdate(paymentDetail.userId, paymentDetailId);
  }

  return await paymentDetail.update(paymentDetailData);
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

async function setPrimaryCard(paymentDetailId, userId) {
  const transaction = await sequelize.transaction();
  try {
    // 1. Get the card to be set as primary
    const cardToSetPrimary = await PaymentDetail.findOne({
      where: { paymentDetailId, userId },
      transaction
    });

    if (!cardToSetPrimary) {
      throw new ResourceNotFoundError("Card not found or unauthorized access");
    }

    // 2. Find current primary card (if any)
    const currentPrimaryCard = await PaymentDetail.findOne({
      where: { userId, isPrimary: true, paymentDetailId: { [Op.ne]: paymentDetailId } },
      transaction
    });

    // 3. Unset current primary if exists
    if (currentPrimaryCard) {
      await currentPrimaryCard.update({ isPrimary: false }, { transaction });
    }

    // 4. Set new primary card
    await cardToSetPrimary.update({ isPrimary: true }, { transaction });

    // Commit transaction
    await transaction.commit();

    return cardToSetPrimary;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
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
  setPrimaryCard
};
