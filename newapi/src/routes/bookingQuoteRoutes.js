const express = require("express");
const { quoteBookingFareController } = require("../controllers/bookingQuoteController.js");

const router = express.Router();

router.post("/quote", quoteBookingFareController);

module.exports = router;
