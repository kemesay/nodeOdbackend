const express = require("express");
const router = express.Router();

const {
  validatePaymentDetailController,
  createPaymentDetailController,
  updatePaymentDetailController,
  addOrUpdatePaymentDetailController,
  getPaymentDetailsController,
  getPaymentDetailByIdController,
  deletePaymentDetailController,
  getPaymentDetailByUserIdController,
} = require("../controllers/paymentDetailController.js");

const { validatePaymentDetail } = require("../models/PaymentDetail.js");

const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");
const admin = require("../middleware/admin.js");

router.post(
  "/validate-card",
  [auth, validate(validatePaymentDetail)],
  validatePaymentDetailController
);

router.post(
  "/", 
  [validate(validatePaymentDetail)],
  createPaymentDetailController
);

router.put(
  "/:paymentDetailId",
  [auth],
  [validate(validatePaymentDetail)],
  updatePaymentDetailController
);

router.get(
  "/", 
  [auth, admin],
  getPaymentDetailsController
); 
router.get(
  "/paymentCards",
  auth,
  getPaymentDetailByUserIdController
);

router.get(
  "/:paymentDetailId",
  [auth],
  getPaymentDetailByIdController
);

router.delete("/:paymentDetailId", [auth, admin], deletePaymentDetailController);


module.exports = router;
