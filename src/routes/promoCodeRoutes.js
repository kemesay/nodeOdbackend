const express = require("express");
const router = express.Router();

const {
  createPromoCodeController,
  listPromoCodesController,
  getPromoCodeController,
  setPromoCodeActiveController,
  validatePromoCodeController,
  myReferralCodeController,
  myDiscountSummaryController,
  getReferralSettingsController,
  updateReferralSettingsController,
} = require("../controllers/promoCodeController.js");

const {
  validateCreatePromoCode,
  validatePromoCodePreview,
} = require("../models/PromoCode.js");

const { validateUpdateReferralSettings } = require("../models/ReferralSettings.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

// Public preview — a guest can check a code before submitting a booking.
router.post("/validate", [validate(validatePromoCodePreview)], validatePromoCodeController);

// Signed-in user's own personal referral code (created on first request).
router.get("/my-referral-code", [auth], myReferralCodeController);

// Signed-in user's own savings/rewards summary. Must stay above the admin
// /:code route below, or Express would match "my-discount-summary" as a
// :code param instead.
router.get("/my-discount-summary", [auth], myDiscountSummaryController);

// Admin: today's referral-program numbers (discount %, reward $, lifetime
// caps) — must also stay above /:code for the same reason as the route above.
router.get("/referral-settings", [auth, admin], getReferralSettingsController);
router.patch(
  "/referral-settings",
  [auth, admin, validate(validateUpdateReferralSettings)],
  updateReferralSettingsController
);

// Admin campaign-code management.
router.post("/", [auth, admin, validate(validateCreatePromoCode)], createPromoCodeController);
router.get("/", [auth, admin], listPromoCodesController);
router.get("/:code", [auth, admin], getPromoCodeController);
router.patch("/:code/active", [auth, admin], setPromoCodeActiveController);

module.exports = router;
