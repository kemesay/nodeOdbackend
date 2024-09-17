const {
  adminBookingApproval,
  paymentStatusUpdate,
} = require("../../services/admin/bookingService.js");

async function adminBookingApprovalController(req, res, _next) {
  const response = await adminBookingApproval(req.body);
  return res.json(response);
}

async function paymentStatusUpdateController(req, res, _next) {
  const response = await paymentStatusUpdate(req.body);
  return res.json(response);
}

module.exports = {
  adminBookingApprovalController,
  paymentStatusUpdateController,
};
