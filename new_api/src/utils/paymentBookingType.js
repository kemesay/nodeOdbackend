/**
 * Payment ledger bookingType values (payment_transactions.bookingType enum).
 * Must match PaymentTransaction model: AIRPORT | P2P | HOURLY
 */
const LEDGER_TYPES = Object.freeze({
  AIRPORT: "AIRPORT",
  P2P: "P2P",
  HOURLY: "HOURLY",
});

/** Admin / UI aliases → ledger enum */
const ALIASES = {
  AIRPORT: LEDGER_TYPES.AIRPORT,
  "1": LEDGER_TYPES.AIRPORT,
  P2P: LEDGER_TYPES.P2P,
  POINT_TO_POINT: LEDGER_TYPES.P2P,
  "POINT TO POINT": LEDGER_TYPES.P2P,
  "2": LEDGER_TYPES.P2P,
  HOURLY: LEDGER_TYPES.HOURLY,
  HOURLY_CHARTER: LEDGER_TYPES.HOURLY,
  "HOURLY-CHARTER": LEDGER_TYPES.HOURLY,
  HOURLYCHARTER: LEDGER_TYPES.HOURLY,
  "3": LEDGER_TYPES.HOURLY,
};

function normalizePaymentBookingType(input) {
  const key = String(input || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const compact = key.replace(/_/g, "");
  return ALIASES[key] || ALIASES[compact] || null;
}

function isHourlyPaymentBookingType(input) {
  return normalizePaymentBookingType(input) === LEDGER_TYPES.HOURLY;
}

function isAirportPaymentBookingType(input) {
  return normalizePaymentBookingType(input) === LEDGER_TYPES.AIRPORT;
}

function isP2PPaymentBookingType(input) {
  return normalizePaymentBookingType(input) === LEDGER_TYPES.P2P;
}

module.exports = {
  LEDGER_TYPES,
  normalizePaymentBookingType,
  isHourlyPaymentBookingType,
  isAirportPaymentBookingType,
  isP2PPaymentBookingType,
};
