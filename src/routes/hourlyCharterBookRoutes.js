// const express = require("express");

// const {
//   createHourlyCharterBookController,
//   updateHourlyCharterBookController,
//   getAllHourlyCharterBooksController,
//   getHourlyCharterBookController,
//   deleteHourlyCharterBookController,
//   updatePaymentStatusController,
//   updateBookingStatusController,
// } = require("../controllers/hourlyCharterBookController.js");

// const { validateHourlyCharterBook } = require("../models/HourlyCharterBook.js");
// const {
//   validatePaymentStatus,
//   validateBookingStatus,
// } = require("../utils/validationUtils.js");

// const admin = require("../middleware/admin.js");
// const auth = require("../middleware/auth.js");
// const validate = require("../middleware/validateReqBody.js");
// const { getHourlyCharterBookById } = require("../services/hourlyCharter/hourlyCharterBookService.js");
// const { calculateHourlyCharterTotalTripPrice } = require("../services/utilTripService.js");

// const router = express.Router();

// router.post(
//   "/",
//   [validate(validateHourlyCharterBook)],
//   createHourlyCharterBookController
// );

// router.put("/:hourlyCharterBookId", [auth], updateHourlyCharterBookController);

// router.delete(
//   "/:hourlyCharterBookId",
//   [auth, admin],
//   deleteHourlyCharterBookController
// );
// router.get("/", [auth, admin], getAllHourlyCharterBooksController);
// router.get("/:hourlyCharterBookId", [auth], getHourlyCharterBookController);

// router.put(
//   "/:hourlyCharterBookId/payment-status",
//   [auth, admin, validate(validatePaymentStatus)],
//   updatePaymentStatusController
// );

// router.put(
//   "/:hourlyCharterBookId/booking-status",
//   [auth, admin, validate(validateBookingStatus)],
//   updateBookingStatusController
// );


// router.patch("/:hourlyCharterBookId/associations", [auth], async (req, res) => {
//   const hourlyCharterBookId = req.params.hourlyCharterBookId;
//   const updates = req.body;
  
//   try {
//     const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);
    
//     // Update associations based on provided data
//     if (updates.paymentDetailId) await hourlyCharterBook.setPaymentDetail(updates.paymentDetailId);
//     if (updates.carId) await hourlyCharterBook.setCar(updates.carId);
//     if (updates.gratuityId) await hourlyCharterBook.setGratuity(updates.gratuityId);
    
//     // Recalculate total trip fee
//     const totalTripFee = await calculateHourlyCharterTotalTripPrice(hourlyCharterBook);
//     hourlyCharterBook.totalTripFeeInDollars = totalTripFee;
//     await hourlyCharterBook.save();
    
//     return res.json(await getHourlyCharterBookById(hourlyCharterBookId));
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// });
// module.exports = router;

const express = require("express");

const {
  createHourlyCharterBookController,
  updateHourlyCharterBookController,
  getAllHourlyCharterBooksController,
  getHourlyCharterBookController,
  deleteHourlyCharterBookController,
  updatePaymentStatusController,
  updateBookingStatusController,
  applyDiscountToHourlyCharterBookController,
  startTripController,
  endTripController,
  extendLiveTripController,
  getLiveStatusController,
  getActiveLiveTripsController,
  getActiveDriverTripsController,
  getDriverTripHistoryController,
} = require("../controllers/hourlyCharterBookController.js");

const {
  validateHourlyCharterBook,
  validateHourlyCharterBookUpdate,
} = require("../models/HourlyCharterBook.js");
const {
  validatePaymentStatus,
  validateBookingStatus,
  validateDiscountApplication,
} = require("../utils/validationUtils.js");

const admin = require("../middleware/admin.js");
const driverOrAdmin = require("../middleware/driver.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");
const { getHourlyCharterBookById } = require("../services/hourlyCharter/hourlyCharterBookService.js");
const { calculateHourlyCharterTotalTripPrice } = require("../services/utilTripService.js");

const router = express.Router();

router.post(
  "/",
  [validate(validateHourlyCharterBook)],
  createHourlyCharterBookController
);

router.patch(
  "/:hourlyCharterBookId",
  [auth, validate(validateHourlyCharterBookUpdate)],
  updateHourlyCharterBookController
);
// Backward compatible (treat PUT as PATCH)
router.put(
  "/:hourlyCharterBookId",
  [auth, validate(validateHourlyCharterBookUpdate)],
  updateHourlyCharterBookController
);

router.delete(
  "/:hourlyCharterBookId",
  [auth, admin],
  deleteHourlyCharterBookController
);
router.get("/", [auth, admin], getAllHourlyCharterBooksController);
router.get("/:hourlyCharterBookId", [auth], getHourlyCharterBookController);

router.put(
  "/:hourlyCharterBookId/payment-status",
  [auth, admin, validate(validatePaymentStatus)],
  updatePaymentStatusController
);

router.put(
  "/:hourlyCharterBookId/booking-status",
  [auth, admin, validate(validateBookingStatus)],
  updateBookingStatusController
);

router.put(
  "/:hourlyCharterBookId/apply-discount",
  [auth, admin, validate(validateDiscountApplication)],
  applyDiscountToHourlyCharterBookController
);

// ─── Driver trip routes ──────────────────────────────────────────────────────
// All active trips (LIVE + PRE_BOOKED, ACCEPTED + EN_ROUTE) — driver dashboard
router.get("/driver/active-trips", [auth, driverOrAdmin], getActiveDriverTripsController);
// Legacy: pure-LIVE active trips only
router.get("/driver/active-live-trips", [auth, driverOrAdmin], getActiveLiveTripsController);
// Past trips (COMPLETED/CANCELLED/REJECTED), paginated — driver history page
router.get("/driver/history", [auth, driverOrAdmin], getDriverTripHistoryController);

// Feature 2 — start trip; pass { convertToLive: true } to convert PRE_BOOKED to LIVE
router.patch("/:hourlyCharterBookId/start-trip", [auth, driverOrAdmin], startTripController);
// Feature 1 — extend a PRE_BOOKED trip with live meter after booked hours expire
router.patch("/:hourlyCharterBookId/extend-live", [auth, driverOrAdmin], extendLiveTripController);
// End trip and finalize billing
router.patch("/:hourlyCharterBookId/end-trip", [auth, driverOrAdmin], endTripController);
// Live status — works for LIVE, converted, extended, and static PRE_BOOKED
router.get("/:hourlyCharterBookId/live-status", [auth], getLiveStatusController);
// ─────────────────────────────────────────────────────────────────────────────

router.patch("/:hourlyCharterBookId/associations", [auth, admin], async (req, res) => {
  const hourlyCharterBookId = req.params.hourlyCharterBookId;
  const updates = req.body;
  
  try {
    const hourlyCharterBook = await getHourlyCharterBookById(hourlyCharterBookId);
    
    // Update associations based on provided data
    if (updates.paymentDetailId) await hourlyCharterBook.setPaymentDetail(updates.paymentDetailId);
    if (updates.carId) await hourlyCharterBook.setCar(updates.carId);
    if (updates.gratuityId) await hourlyCharterBook.setGratuity(updates.gratuityId);
    
    // Recalculate total trip fee
    const totalTripFee = await calculateHourlyCharterTotalTripPrice(hourlyCharterBook);
    hourlyCharterBook.totalTripFeeInDollars = totalTripFee;
    await hourlyCharterBook.save();
    
    return res.json(await getHourlyCharterBookById(hourlyCharterBookId));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
module.exports = router;
