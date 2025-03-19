const express = require('express');
const router = express.Router();
const PaymentDetailController = require('../controllers/paymentDetailController');
const authenticateToken = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get routes
router.get('/search', PaymentDetailController.search);
router.get('/stats', PaymentDetailController.getStats);
router.get('/expiring', PaymentDetailController.getExpiringCards);
router.get('/:id', PaymentDetailController.getById);
router.get('/user/:userId', PaymentDetailController.getUserPaymentDetails);

// Post routes
router.post('/', PaymentDetailController.create);

// Put routes
router.put('/:id', PaymentDetailController.update);

// Delete routes
router.delete('/:id', PaymentDetailController.delete);

module.exports = router;
