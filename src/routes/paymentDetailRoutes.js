const express = require("express");
const router = express.Router();

const {
  validatePaymentDetailController,
} = require("../controllers/paymentDetailController.js");

const { validatePaymentDetail } = require("../models/PaymentDetail.js");

const validate = require("../middleware/validateReqBody.js");

router.post(
  "/validate-card",
  validate(validatePaymentDetail),
  validatePaymentDetailController
);

module.exports = router;
