const express = require("express");
const router = express.Router();

const {
  createPromoCodeController,
  listPromoCodesController,
  getPromoCodeController,
  setPromoCodeActiveController,
  validatePromoCodeController,
  myReferralCodeController,
} = require("../controllers/promoCodeController.js");

const {
  validateCreatePromoCode,
  validatePromoCodePreview,
} = require("../models/PromoCode.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

// Public preview — a guest can check a code before submitting a booking.
router.post("/validate", [validate(validatePromoCodePreview)], validatePromoCodeController);

// Signed-in user's own personal referral code (created on first request).
router.get("/my-referral-code", [auth], myReferralCodeController);

// Admin campaign-code management.
router.post("/", [auth, admin, validate(validateCreatePromoCode)], createPromoCodeController);
router.get("/", [auth, admin], listPromoCodesController);
router.get("/:code", [auth, admin], getPromoCodeController);
router.patch("/:code/active", [auth, admin], setPromoCodeActiveController);

module.exports = router;
