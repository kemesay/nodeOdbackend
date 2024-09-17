const express = require("express");
const router = express.Router();

const {
  searchUserBookingsController,
} = require("../controllers/userBookingController.js");


const auth = require("../middleware/auth.js");

//TODO: add auth middleware
router.get("/mine", auth,searchUserBookingsController);

module.exports = router;
