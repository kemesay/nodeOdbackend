/**
 * Translates Square's error codes (raw, technical — e.g. "GENERIC_DECLINE",
 * "INVALID_CARD_DATA") into a message a customer can actually act on.
 * Without this, Square's own `detail` text ("Authorization error:
 * 'GENERIC_DECLINE'") was surfacing verbatim in the booking error dialog.
 */

// https://developer.squareup.com/docs/payments-api/handling-errors — the
// customer-relevant subset. Anything not listed falls back to a generic
// "try a different card" message rather than leaking Square's raw code.
const CODE_MESSAGES = {
  GENERIC_DECLINE:
    "Your card was declined by your bank. Please try a different card or contact your bank.",
  CARD_DECLINED: "Your card was declined. Please try a different card.",
  CARD_DECLINED_CALL_ISSUER:
    "Your bank declined this card and asked that you contact them directly before trying again.",
  CARD_DECLINED_VERIFICATION_REQUIRED:
    "Your bank needs to verify this transaction. Please contact your bank, or try a different card.",
  CVV_FAILURE:
    "The security code (CVV) doesn't match this card. Please check it and try again.",
  ADDRESS_VERIFICATION_FAILURE:
    "The billing ZIP code doesn't match this card. Please update it and try again.",
  INVALID_EXPIRATION:
    "This card's expiration date looks incorrect. Please check it and try again.",
  CARD_EXPIRED: "This card has expired. Please use a different card.",
  INSUFFICIENT_FUNDS: "This card has insufficient funds for this charge.",
  TRANSACTION_LIMIT:
    "This charge exceeds your card's transaction limit. Please try a different card.",
  PAYMENT_LIMIT_EXCEEDED:
    "This charge exceeds what we're able to process on this card right now. Please try a different card.",
  CARD_NOT_SUPPORTED:
    "This card type isn't supported. Please try a different card.",
  INVALID_CARD:
    "There's a problem with this card's details. Please re-enter your card to continue.",
  INVALID_CARD_DATA:
    "There's a problem with this card's details. Please re-enter your card to continue.",
  CARD_TOKEN_USED:
    "Your card session has expired. Please re-enter your card details and try again.",
  CARD_TOKEN_EXPIRED:
    "Your card session has expired. Please re-enter your card details and try again.",
  VERIFY_AVS_FAILURE:
    "The billing details on file don't match this card. Please update them and try again.",
  VOICE_FAILURE:
    "This card requires phone verification, which we can't complete here. Please try a different card.",
  PAN_FAILURE:
    "This card number couldn't be read correctly. Please re-enter your card details.",
};

/**
 * @param {Array<{code?: string, detail?: string}>} errors - Square's raw `errors[]`.
 * @returns {string} A single customer-facing message.
 */
function friendlySquareErrorMessage(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "We couldn't process this payment. Please try a different card.";
  }

  for (const err of errors) {
    const mapped = CODE_MESSAGES[err?.code];
    if (mapped) return mapped;
  }

  // Unmapped code — still safer than echoing Square's internal wording.
  return "We couldn't process this payment with this card. Please try a different card or contact your bank.";
}

module.exports = { friendlySquareErrorMessage, CODE_MESSAGES };
