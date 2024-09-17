const express = require("express");
const router = express.Router();

const {
  createPointToPointBookController,
  updatePointToPointBookController,
  getPointToPointBooksController,
  getPointToPointBookController,
  deletePointToPointBookController,
  updatePaymentStatusController,
  updateBookingStatusController,
} = require("../controllers/pointToPointBookController.js");

const { validatePointToPointBook } = require("../models/PointToPointBook.js");

const {
  validatePaymentStatus,
  validateBookingStatus,
} = require("../utils/validationUtils.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

router.post(
  "/",
  [validate(validatePointToPointBook)],
  createPointToPointBookController
);

router.put("/:pointToPointBookId", [auth], updatePointToPointBookController);

router.delete(
  "/:pointToPointBookId",
  [auth, admin],
  deletePointToPointBookController
);
router.get("/", [auth, admin], getPointToPointBooksController);
router.get("/:pointToPointBookId", [auth], getPointToPointBookController);
router.put(
  "/:pointToPointBookId/payment-status",
  [auth, admin, validate(validatePaymentStatus)],
  updatePaymentStatusController
);

router.put(
  "/:pointToPointBookId/booking-status",
  [auth, admin, validate(validateBookingStatus)],
  updateBookingStatusController
);

module.exports = router;
