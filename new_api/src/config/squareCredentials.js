/**
 * Single source of truth for Square credentials (this backend).
 *
 * Switch environment: set `SQUARE_ENV=sandbox` or `SQUARE_ENV=production` in `.env`.
 * Keep both credential sets in `.env`; only `SQUARE_ENV` changes which set is active.
 *
 * Import everywhere:
 *   const { getSquareCredentials, getSquarePublicConfig } = require("./squareCredentials.js");
 * or from the barrel:
 *   const { getSquareCredentials, getSquareClient } = require("./square.js");
 */

/** Square Connect API version header */
const SQUARE_API_VERSION = process.env.SQUARE_VERSION || "2025-07-16";

const CONNECT_BASE_URLS = Object.freeze({
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com",
});

/**
 * Environment variable names per Square environment (for `.env` / docs).
 * @type {Readonly<Record<'sandbox'|'production', Readonly<{
 *   accessToken: string,
 *   applicationId: string,
 *   locationId: string,
 *   webhookSignatureKey: string,
 *   webhookNotificationUrl: string,
 * }>>>}
 */
const SQUARE_ENV_KEYS = Object.freeze({
  sandbox: Object.freeze({
    accessToken: "SQUARE_SANDBOX_ACCESS_TOKEN",
    applicationId: "SQUARE_SANDBOX_APPLICATION_ID",
    locationId: "SQUARE_SANDBOX_LOCATION_ID",
    webhookSignatureKey: "SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY",
    webhookNotificationUrl: "SQUARE_SANDBOX_WEBHOOK_NOTIFICATION_URL",
  }),
  production: Object.freeze({
    accessToken: "SQUARE_PRODUCTION_ACCESS_TOKEN",
    applicationId: "SQUARE_PRODUCTION_APPLICATION_ID",
    locationId: "SQUARE_PRODUCTION_LOCATION_ID",
    webhookSignatureKey: "SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY",
    webhookNotificationUrl: "SQUARE_PRODUCTION_WEBHOOK_NOTIFICATION_URL",
  }),
});

/** Legacy `.env` names used when env-specific keys above are empty */
const SQUARE_LEGACY_ENV_KEYS = Object.freeze({
  accessToken: "SQUARE_ACCESS_TOKEN",
  applicationId: "SQUARE_APPLICATION_ID",
  locationId: "SQUARE_LOCATION_ID",
  webhookSignatureKey: "SQUARE_WEBHOOK_SIGNATURE_KEY",
  webhookNotificationUrl: "SQUARE_WEBHOOK_NOTIFICATION_URL",
});

/** Master switch */
const SQUARE_ENV_SWITCH = "SQUARE_ENV";

/**
 * @typedef {'sandbox'|'production'} SquareEnvironmentName
 */

/**
 * @param {string} [raw]
 * @returns {SquareEnvironmentName}
 */
function parseSquareEnvironment(raw) {
  const value = (raw || "sandbox").trim().toLowerCase();
  if (value === "production" || value === "prod") return "production";
  return "sandbox";
}

/**
 * @param {SquareEnvironmentName} environment
 * @param {keyof typeof SQUARE_LEGACY_ENV_KEYS} field
 * @returns {string}
 */
function pickCredential(environment, field) {
  const envKey = SQUARE_ENV_KEYS[environment][field];
  const specific = process.env[envKey];
  if (specific != null && String(specific).trim() !== "") {
    return String(specific).trim();
  }
  const legacy = process.env[SQUARE_LEGACY_ENV_KEYS[field]];
  return legacy != null ? String(legacy).trim() : "";
}

/**
 * Resolved credentials for the active `SQUARE_ENV`.
 * @returns {{
 *   environment: SquareEnvironmentName,
 *   accessToken: string,
 *   applicationId: string,
 *   locationId: string,
 *   webhookSignatureKey: string,
 *   webhookNotificationUrl: string,
 *   apiVersion: string,
 *   connectBaseUrl: string,
 *   isSandbox: boolean,
 *   isProduction: boolean,
 * }}
 */
function getSquareCredentials() {
  const environment = parseSquareEnvironment(process.env[SQUARE_ENV_SWITCH]);

  return {
    environment,
    accessToken: pickCredential(environment, "accessToken"),
    applicationId: pickCredential(environment, "applicationId"),
    locationId: pickCredential(environment, "locationId"),
    webhookSignatureKey: pickCredential(environment, "webhookSignatureKey"),
    webhookNotificationUrl: pickCredential(environment, "webhookNotificationUrl"),
    apiVersion: SQUARE_API_VERSION,
    connectBaseUrl: CONNECT_BASE_URLS[environment],
    isSandbox: environment === "sandbox",
    isProduction: environment === "production",
  };
}

/**
 * @param {ReturnType<typeof getSquareCredentials>} creds
 */
function assertSquareServerConfigured(creds) {
  if (!creds.accessToken) {
    throw new Error(
      `Square access token is missing for "${creds.environment}". Set ${SQUARE_ENV_KEYS[creds.environment].accessToken} or ${SQUARE_LEGACY_ENV_KEYS.accessToken} in .env`
    );
  }
  if (!creds.locationId) {
    throw new Error(
      `Square location ID is missing for "${creds.environment}". Set ${SQUARE_ENV_KEYS[creds.environment].locationId} or ${SQUARE_LEGACY_ENV_KEYS.locationId} in .env`
    );
  }
}

/** Safe for web / mobile — no secrets. */
function getSquarePublicConfig() {
  const creds = getSquareCredentials();
  return {
    applicationId: creds.applicationId,
    locationId: creds.locationId,
    environment: creds.environment,
    paymentProvider: process.env.PAYMENT_PROVIDER || "square",
    paymentMode: process.env.PAYMENT_MODE || "authorize_capture",
  };
}

module.exports = {
  SQUARE_API_VERSION,
  SQUARE_ENV_SWITCH,
  SQUARE_ENV_KEYS,
  SQUARE_LEGACY_ENV_KEYS,
  CONNECT_BASE_URLS,
  parseSquareEnvironment,
  getSquareCredentials,
  assertSquareServerConfigured,
  getSquarePublicConfig,
};
