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
  applyDiscountToPointToPointBookController,
} = require("../controllers/pointToPointBookController.js");

const { validatePointToPointBook } = require("../models/PointToPointBook.js");

const {
  validatePaymentStatus,
  validateBookingStatus,
  validateDiscountApplication,
} = require("../utils/validationUtils.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");
const { getPointToPointBookById } = require("../services/pointTopoint/pointToPointBookService.js");
const { calculateP2PTotalTripPrice } = require("../services/utilTripService.js");

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

router.put(
  "/:pointToPointBookId/apply-discount",
  [auth, admin, validate(validateDiscountApplication)],
  applyDiscountToPointToPointBookController
);

// Add new route for updating associations
router.patch("/:pointToPointBookId/associations", [auth], async (req, res) => {
  const pointToPointBookId = req.params.pointToPointBookId;
  const updates = req.body;
  
  try {
    const pointToPointBook = await getPointToPointBookById(pointToPointBookId);
    
    // Update associations based on provided data
    if (updates.paymentDetailId) await pointToPointBook.setPaymentDetail(updates.paymentDetailId);
    if (updates.carId) await pointToPointBook.setCar(updates.carId);
    if (updates.gratuityId) await pointToPointBook.setGratuity(updates.gratuityId);
    if (updates.additionalStopId) await pointToPointBook.setAdditionalStopOnTheWay(updates.additionalStopId);
    
    // Recalculate total trip fee
    const totalTripFee = await calculateP2PTotalTripPrice(pointToPointBook);
    pointToPointBook.totalTripFeeInDollars = totalTripFee;
    await pointToPointBook.save();
    
    return res.json(await getPointToPointBookById(pointToPointBookId));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
