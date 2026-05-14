// const express = require("express");
// const router = express.Router();

// const {
//   createAirportBookController,
//   updateAirportBookController,
//   getAirportBookController,
//   deleteAirportBookController,
//   getAirportBooksController,
//   updatePaymentStatusController,
//   updateBookingStatusController,
// } = require("../../controllers/airportBooking/airportBookController.js");

// const {
//   validateAirportBook,
// } = require("../../models/airportBooking/AirportBook.js");

// const {
//   validatePaymentStatus,
//   validateBookingStatus,
// } = require("../../utils/validationUtils.js");

// const auth = require("../../middleware/auth.js");
// const validate = require("../../middleware/validateReqBody.js");
// const admin = require("../../middleware/admin.js");

// router.post("/", [validate(validateAirportBook)], createAirportBookController);

// router.put("/:airportBookId", [auth], updateAirportBookController);

// router.put(
//   "/:airportBookId/payment-status",
//   [auth, admin, validate(validatePaymentStatus)],
//   updatePaymentStatusController
// );

// router.put(
//   "/:airportBookId/booking-status",
//   [auth, admin, validate(validateBookingStatus)],
//   updateBookingStatusController
// );

// router.delete("/:airportBookId", [auth, admin], deleteAirportBookController);
// router.get("/", [auth, admin], getAirportBooksController);
// router.get("/:airportBookId", [auth], getAirportBookController);

// // Add new route for updating associations
// router.patch("/:airportBookId/associations", [auth], async (req, res) => {
//   const airportBookId = req.params.airportBookId;
//   const updates = req.body;
  
//   try {
//     const airportBook = await getAirportBookById(airportBookId);
    
//     // Update associations based on provided data
//     if (updates.paymentDetailId) await airportBook.setPaymentDetail(updates.paymentDetailId);
//     if (updates.carId) await airportBook.setCar(updates.carId);
//     if (updates.gratuityId) await airportBook.setGratuity(updates.gratuityId);
//     if (updates.airportId) await airportBook.setAirport(updates.airportId);
//     if (updates.pickupPreferenceId) await airportBook.setAirportPickupPreference(updates.pickupPreferenceId);
//     if (updates.additionalStopId) await airportBook.setAdditionalStopOnTheWay(updates.additionalStopId);
    
//     // Recalculate total trip fee
//     const totalTripFee = await calculateAirportBookingTotalTripPrice(airportBook);
//     airportBook.totalTripFeeInDollars = totalTripFee;
//     await airportBook.save();
    
//     return res.json(await getAirportBookById(airportBookId));
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// });

// module.exports = router;


const express = require("express");
const router = express.Router();

const {
  createAirportBookController,
  updateAirportBookController,
  getAirportBookController,
  deleteAirportBookController,
  getAirportBooksController,
  updatePaymentStatusController,
  updateBookingStatusController,
  applyDiscountToAirportBookController,
} = require("../../controllers/airportBooking/airportBookController.js");

const {
  validateAirportBook,
  validateAirportBookUpdate,
} = require("../../models/airportBooking/AirportBook.js");

const {
  validatePaymentStatus,
  validateBookingStatus,
  validateDiscountApplication,
} = require("../../utils/validationUtils.js");

const auth = require("../../middleware/auth.js");
const validate = require("../../middleware/validateReqBody.js");
const admin = require("../../middleware/admin.js");

router.post("/", [validate(validateAirportBook)], createAirportBookController);

router.patch(
  "/:airportBookId",
  [auth, validate(validateAirportBookUpdate)],
  updateAirportBookController
);
// Backward compatible (treat PUT as PATCH)
router.put(
  "/:airportBookId",
  [auth, validate(validateAirportBookUpdate)],
  updateAirportBookController
);

router.put(
  "/:airportBookId/payment-status",
  [auth, admin, validate(validatePaymentStatus)],
  updatePaymentStatusController
);

router.put(
  "/:airportBookId/booking-status",
  [auth, admin, validate(validateBookingStatus)],
  updateBookingStatusController
);

router.put(
  "/:airportBookId/apply-discount",
  [auth, admin, validate(validateDiscountApplication)],
  applyDiscountToAirportBookController
);

router.delete("/:airportBookId", [auth, admin], deleteAirportBookController);
router.get("/", [auth, admin], getAirportBooksController);
router.get("/:airportBookId", [auth], getAirportBookController);

// Add new route for updating associations
router.patch("/:airportBookId/associations", [auth, admin], async (req, res) => {
  const airportBookId = req.params.airportBookId;
  const updates = req.body;
  
  try {
    const airportBook = await getAirportBookById(airportBookId);
    
    // Update associations based on provided data
    if (updates.paymentDetailId) await airportBook.setPaymentDetail(updates.paymentDetailId);
    if (updates.carId) await airportBook.setCar(updates.carId);
    if (updates.gratuityId) await airportBook.setGratuity(updates.gratuityId);
    if (updates.airportId) await airportBook.setAirport(updates.airportId);
    if (updates.pickupPreferenceId) await airportBook.setAirportPickupPreference(updates.pickupPreferenceId);
    if (updates.additionalStopId) await airportBook.setAdditionalStopOnTheWay(updates.additionalStopId);
    
    // Recalculate total trip fee
    const totalTripFee = await calculateAirportBookingTotalTripPrice(airportBook);
    airportBook.totalTripFeeInDollars = totalTripFee;
    await airportBook.save();
    
    return res.json(await getAirportBookById(airportBookId));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;


