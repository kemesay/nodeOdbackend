const {
  adminBookingApproval,
  paymentStatusUpdate,
} = require("../../services/admin/bookingService.js");
const { getBookingRoomToken } = require("../../services/bookingRealtimeService.js");

async function adminBookingApprovalController(req, res, _next) {
  const response = await adminBookingApproval(req.body);
  return res.json(response);
}

async function paymentStatusUpdateController(req, res, _next) {
  const response = await paymentStatusUpdate(req.body);
  return res.json(response);
}

async function getAdminBookingRoomTokenController(req, res, next) {
  try {
    const { bookingType, bookingId } = req.params;
    const payload = await getBookingRoomToken({
      segment: bookingType,
      bookingId,
      userId: req.user?.userId,
      isAdmin: true,
    });
    return res.json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  adminBookingApprovalController,
  paymentStatusUpdateController,
  getAdminBookingRoomTokenController,
};
