const { Op } = require("sequelize");
const { PaymentDetail } = require("../models/PaymentDetail.js");

class PaymentDetailService {
  // Get payment detail by ID
  async getPaymentDetailById(paymentDetailId) {
    try {
      const paymentDetail = await PaymentDetail.findByPk(paymentDetailId);
      if (!paymentDetail) {
        throw new Error("Payment detail not found");
      }
      return this.maskSensitiveData(paymentDetail);
    } catch (error) {
      throw new Error(`Error fetching payment detail: ${error.message}`);
    }
  }

  // Get all payment details for a user
  async getUserPaymentDetails(userId) {
    try {
      const paymentDetails = await PaymentDetail.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
      });
      return paymentDetails.map(detail => this.maskSensitiveData(detail));
    } catch (error) {
      throw new Error(`Error fetching user payment details: ${error.message}`);
    }
  }

  // Add new payment detail
  async addPaymentDetail(paymentData) {
    try {
      const existingCard = await PaymentDetail.findOne({
        where: {
          userId: paymentData.userId,
          creditCardNumber: paymentData.creditCardNumber,
        },
      });

      if (existingCard) {
        throw new Error("This credit card is already registered");
      }

      const newPaymentDetail = await PaymentDetail.create(paymentData);
      return this.maskSensitiveData(newPaymentDetail);
    } catch (error) {
      throw new Error(`Error adding payment detail: ${error.message}`);
    }
  }

  // Update payment detail
  async updatePaymentDetail(paymentDetailId, updateData) {
    try {
      const paymentDetail = await PaymentDetail.findByPk(paymentDetailId);
      
      if (!paymentDetail) {
        throw new Error("Payment detail not found");
      }

      // Only allow updating certain fields
      const allowedUpdates = [
        "creditCardNumber",
        "securityCode",
        "expirationDate",
        "zipCode",
        "cardOwnerName"
      ];

      const filteredUpdates = Object.keys(updateData)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {});

      await paymentDetail.update(filteredUpdates);
      return this.maskSensitiveData(paymentDetail);
    } catch (error) {
      throw new Error(`Error updating payment detail: ${error.message}`);
    }
  }

  // Delete payment detail
  async deletePaymentDetail(paymentDetailId, userId) {
    try {
      const paymentDetail = await PaymentDetail.findOne({
        where: {
          paymentDetailId,
          userId,
        },
      });

      if (!paymentDetail) {
        throw new Error("Payment detail not found or unauthorized");
      }

      await paymentDetail.destroy();
      return { message: "Payment detail successfully deleted" };
    } catch (error) {
      throw new Error(`Error deleting payment detail: ${error.message}`);
    }
  }

  // Search payment details
  async searchPaymentDetails(searchParams) {
    try {
      const { userId, cardOwnerName, lastFourDigits } = searchParams;
      
      const whereClause = { userId };

      if (cardOwnerName) {
        whereClause.cardOwnerName = {
          [Op.iLike]: `%${cardOwnerName}%`,
        };
      }

      if (lastFourDigits) {
        whereClause.creditCardNumber = {
          [Op.endsWith]: lastFourDigits,
        };
      }

      const paymentDetails = await PaymentDetail.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
      });

      return paymentDetails.map(detail => this.maskSensitiveData(detail));
    } catch (error) {
      throw new Error(`Error searching payment details: ${error.message}`);
    }
  }

  // Get payment methods statistics
  async getPaymentMethodsStats(userId) {
    try {
      const stats = await PaymentDetail.findAll({
        where: { userId },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('paymentDetailId')), 'total'],
          [sequelize.fn('MAX', sequelize.col('createdAt')), 'lastAdded'],
        ],
      });

      return stats[0];
    } catch (error) {
      throw new Error(`Error fetching payment stats: ${error.message}`);
    }
  }

  // Validate expiration date
  async checkExpiringCards(userId) {
    try {
      const today = new Date();
      const threeMonthsFromNow = new Date(
        today.getFullYear(),
        today.getMonth() + 3,
        today.getDate()
      );

      const expiringCards = await PaymentDetail.findAll({
        where: {
          userId,
          expirationDate: {
            [Op.lte]: threeMonthsFromNow,
          },
        },
      });

      return expiringCards.map(card => ({
        paymentDetailId: card.paymentDetailId,
        cardOwnerName: card.cardOwnerName,
        expirationDate: card.expirationDate,
        lastFourDigits: card.creditCardNumber.slice(-4),
      }));
    } catch (error) {
      throw new Error(`Error checking expiring cards: ${error.message}`);
    }
  }

  // Utility method to mask sensitive data
  maskSensitiveData(paymentDetail) {
    const masked = paymentDetail.toJSON();
    masked.creditCardNumber = `****-****-****-${masked.creditCardNumber.slice(-4)}`;
    masked.securityCode = "***";
    return masked;
  }
}

module.exports = new PaymentDetailService();
