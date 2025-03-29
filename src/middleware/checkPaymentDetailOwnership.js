const { getPaymentDetailById } = require("../services/paymentDetailService");

async function checkPaymentDetailOwnership(req, res, next) {
  try {
    const paymentDetail = await getPaymentDetailById(req.params.paymentDetailId);
    
    if (!paymentDetail) {
      return res.status(404).json({
        success: false,
        message: "Payment detail not found"
      });
    }

    // Check if the payment detail belongs to the authenticated user
    if (paymentDetail.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this payment detail"
      });
    }

    // Add payment detail to request for later use
    req.paymentDetail = paymentDetail;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = checkPaymentDetailOwnership; 