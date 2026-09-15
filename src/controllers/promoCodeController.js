const {
  createPublicPromoCode,
  listPromoCodes,
  getPromoCodeByCode,
  setPromoCodeActive,
  validatePromoCode,
  getOrCreateReferralCode,
  getMyDiscountSummary,
} = require("../services/promoCodeService.js");
const authenticateToken = require("../utils/getUserFromToken.js");

async function createPromoCodeController(req, res, _next) {
  const promoCode = await createPublicPromoCode(req.body);
  return res.status(201).json(promoCode);
}

async function listPromoCodesController(req, res, _next) {
  const { page, pageSize } = req.query;
  const result = await listPromoCodes({ page, pageSize });
  return res.json(result);
}

async function getPromoCodeController(req, res, _next) {
  const promoCode = await getPromoCodeByCode(req.params.code);
  return res.json(promoCode);
}

async function setPromoCodeActiveController(req, res, _next) {
  const promoCode = await setPromoCodeActive(req.params.code, req.body.isActive);
  return res.json(promoCode);
}

/**
 * Public endpoint — lets the booking form check a code (and preview the
 * discount) before the customer submits the actual booking. Guests are
 * allowed: an invalid/missing token just means the code is validated
 * without a userId, so per-user limits and self-referral checks are
 * re-verified again for real at booking time once a userId is known.
 */
async function validatePromoCodeController(req, res, _next) {
  const { code, bookingType, fareAmount } = req.body;

  let userId = null;
  const tokenHeader = req.header("Authorization");
  if (tokenHeader) {
    try {
      const user = await authenticateToken(tokenHeader);
      userId = user.userId;
    } catch (_error) {
      // Treat as guest — this endpoint is a preview, not the redemption itself.
    }
  }

  const { discount } = await validatePromoCode({
    code,
    userId,
    bookingType,
    fareAmount: Number(fareAmount),
  });

  return res.json({
    valid: true,
    discount,
    finalFare: Math.max(Number(fareAmount) - discount, 0),
  });
}

async function myReferralCodeController(req, res, _next) {
  const promoCode = await getOrCreateReferralCode(req.user);

  const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || "https://odatransportation.com").replace(/\/$/, "");
  // Routes through the smart app-store redirect page (not straight to the
  // homepage) so a friend who doesn't have the app yet lands on the App
  // Store / Play Store with their code carried through the install —
  // see AppDownload.jsx. Someone who opens this on desktop still ends up
  // on the regular booking page with the code pre-filled.
  const link = `${frontendBaseUrl}/app-download?promoCode=${encodeURIComponent(promoCode.code)}`;

  return res.json({
    code: promoCode.code,
    discountType: promoCode.discountType,
    // DECIMAL columns come back from Sequelize as strings (e.g. "10.00") —
    // cast to real numbers so clients don't have to guess the JSON type.
    discountValue: Number(promoCode.discountValue),
    maxDiscountAmount:
      promoCode.maxDiscountAmount != null ? Number(promoCode.maxDiscountAmount) : null,
    link,
    shareMessage: `Ride with ODA Transportation and use my link for ${promoCode.discountValue}% off your first ride: ${link}`,
  });
}

async function myDiscountSummaryController(req, res, _next) {
  const summary = await getMyDiscountSummary(req.user.userId);
  return res.json(summary);
}

module.exports = {
  createPromoCodeController,
  listPromoCodesController,
  getPromoCodeController,
  setPromoCodeActiveController,
  validatePromoCodeController,
  myReferralCodeController,
  myDiscountSummaryController,
};
