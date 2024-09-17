const express = require("express");
const router = express.Router();

const {
  adminBookingApprovalController,
  paymentStatusUpdateController,
} = require("../../controllers/admin/bookingController.js");

const {
  validateAdminBookingApproval,
  validatePaymentUpdateReq,
} = require("../../utils/validationUtils.js");

const admin = require("../../middleware/admin.js");
const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");

router.post(
  "/approve",
  [auth, admin, validate(validateAdminBookingApproval)],
  adminBookingApprovalController
);

router.post(
  "/update-payment-status",
  [auth, admin, validate(validatePaymentUpdateReq)],
  paymentStatusUpdateController
);

module.exports = router;
