const PaymentDetailService = require('../services/paymentDetailService');
const { validatePaymentDetail } = require('../models/PaymentDetail');

class PaymentDetailController {
  // Get payment detail by ID
  getById = async (req, res) => {
    try {
      const { id } = req.params;
      const paymentDetail = await PaymentDetailService.getPaymentDetailById(id);
      res.json(paymentDetail);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  };

  // Get all payment details for a user
  getUserPaymentDetails = async (req, res) => {
    try {
      const { userId } = req.params;
      const paymentDetails = await PaymentDetailService.getUserPaymentDetails(userId);
      res.json(paymentDetails);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  // Create new payment detail
  create = async (req, res) => {
    try {
      const { error } = validatePaymentDetail(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const paymentDetail = await PaymentDetailService.addPaymentDetail({
        ...req.body,
        userId: req.user.id // Assuming user info is added by auth middleware
      });
      res.status(201).json(paymentDetail);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  // Update payment detail
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const paymentDetail = await PaymentDetailService.updatePaymentDetail(id, req.body);
      res.json(paymentDetail);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  // Delete payment detail
  delete = async (req, res) => {
    try {
      const { id } = req.params;
      await PaymentDetailService.deletePaymentDetail(id, req.user.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  // Search payment details
  search = async (req, res) => {
    try {
      const searchParams = {
        ...req.query,
        userId: req.user.id
      };
      const paymentDetails = await PaymentDetailService.searchPaymentDetails(searchParams);
      res.json(paymentDetails);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  // Get payment statistics
  getStats = async (req, res) => {
    try {
      const stats = await PaymentDetailService.getPaymentMethodsStats(req.user.id);
      res.json(stats);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

  // Get expiring cards
  getExpiringCards = async (req, res) => {
    try {
      const expiringCards = await PaymentDetailService.checkExpiringCards(req.user.id);
      res.json(expiringCards);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
}

module.exports = new PaymentDetailController();
