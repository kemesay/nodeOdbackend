/**
 * Square module barrel — import Square config only from here in app code.
 *
 *   const {
 *     getSquareCredentials,
 *     getSquarePublicConfig,
 *     getSquareClient,
 *     dollarsToCents,
 *   } = require("../config/square.js");
 */
const { SquareClient, SquareEnvironment } = require("square");
const logger = require("./logging.js");
const { isSquarePaymentProvider } = require("./paymentConfig.js");
const {
  getSquareCredentials,
  assertSquareServerConfigured,
  getSquarePublicConfig,
  parseSquareEnvironment,
  SQUARE_ENV_KEYS,
  SQUARE_LEGACY_ENV_KEYS,
  SQUARE_ENV_SWITCH,
  SQUARE_API_VERSION,
  CONNECT_BASE_URLS,
} = require("./squareCredentials.js");

let _client = null;

function getSquareClient() {
  if (!isSquarePaymentProvider()) {
    return null;
  }

  if (_client) {
    return _client;
  }

  const creds = getSquareCredentials();
  assertSquareServerConfigured(creds);

  const env = creds.isProduction
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

  logger.info(
    `Square client initialized in ${creds.environment.toUpperCase()} mode (locationId=${creds.locationId})`
  );

  _client = new SquareClient({
    token: creds.accessToken,
    environment: env,
  });

  return _client;
}

/** Reset cached SDK client (e.g. after env change in tests). */
function resetSquareClient() {
  _client = null;
}

function dollarsToCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Invalid payment amount");
  }
  return Math.round(n * 100);
}

module.exports = {
  // Credentials (single source: squareCredentials.js)
  getSquareCredentials,
  assertSquareServerConfigured,
  getSquarePublicConfig,
  parseSquareEnvironment,
  SQUARE_ENV_KEYS,
  SQUARE_LEGACY_ENV_KEYS,
  SQUARE_ENV_SWITCH,
  SQUARE_API_VERSION,
  CONNECT_BASE_URLS,
  // SDK + helpers
  getSquareClient,
  resetSquareClient,
  dollarsToCents,
};
