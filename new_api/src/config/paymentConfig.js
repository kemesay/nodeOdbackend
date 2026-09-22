/**
 * Payment provider and Square behavior flags (from environment).
 */
const PAYMENT_PROVIDER = (process.env.PAYMENT_PROVIDER || "square").toLowerCase();

const PAYMENT_MODE = process.env.PAYMENT_MODE || "authorize_capture";

const isLegacyPaymentProvider = () => PAYMENT_PROVIDER === "legacy";

const isSquarePaymentProvider = () =>
  PAYMENT_PROVIDER === "square" || PAYMENT_PROVIDER === "square_sandbox";

/**
 * Temporary compatibility mode:
 * allow accepting raw card details even when Square is the provider.
 *
 * WARNING: this does NOT charge the card with Square; it only allows
 * creating/saving a legacy `payment_details` row so older clients don't break.
 * Keep disabled in production.
 */
const allowRawPanWithSquare = () => {
  const enabled =
    String(process.env.ALLOW_RAW_PAN_WITH_SQUARE || "").toLowerCase() === "true";
  const isProd =
    String(process.env.NODE_ENV || "").toLowerCase() === "production";
  return enabled && !isProd;
};

/** Authorize/hold at booking; do not capture until admin take-payment. */
const shouldAuthorizeAtBooking = () =>
  PAYMENT_MODE === "authorize_capture" ||
  PAYMENT_MODE === "authorize" ||
  PAYMENT_MODE === "charge_on_take";

/** Charge in full at booking (immediate capture). */
const shouldChargeImmediately = () => PAYMENT_MODE === "charge_immediate";

/** Capture authorized funds when admin calls update-payment-status (take payment). */
const shouldCaptureOnAdminTakePayment = () =>
  PAYMENT_MODE === "authorize_capture" ||
  PAYMENT_MODE === "authorize" ||
  PAYMENT_MODE === "charge_on_take";

module.exports = {
  PAYMENT_PROVIDER,
  PAYMENT_MODE,
  isLegacyPaymentProvider,
  isSquarePaymentProvider,
  allowRawPanWithSquare,
  shouldAuthorizeAtBooking,
  shouldChargeImmediately,
  shouldCaptureOnAdminTakePayment,
};
