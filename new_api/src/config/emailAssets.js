/**
 * Email assets configuration
 * Central place for logo and other static assets used in email templates.
 * Assets are served from the backend at /api/v1/email-assets/
 * and passed into every email template via getEmailAssets().
 */

const path = require("path");
const fs = require("fs");

/** API base URL used to build the logo URL in emails */
const EMAIL_ASSETS_BASE_URL = "https://api.odatransportation.com";
// const EMAIL_ASSETS_BASE_URL = "http://localhost:5100";

/** Full logo URL for email templates (backend serves at /api/v1/email-assets/images/logo.png) */
const LOGO_URL = `${EMAIL_ASSETS_BASE_URL}/api/v1/email-assets/images/logo.png`;

/** Alt text for the logo (used in all templates) */
const LOGO_ALT = "ODA Black Car Service Logo";

/** Relative path from email-assets root (served at /api/v1/email-assets/) */
const LOGO_PATH = "images/logo.png";

/**
 * Get the absolute path to the logo file on disk (emails/assets/images/logo.png).
 * @returns {string}
 */
function getLogoFilePath() {
  return path.join(__dirname, "..", "..", "emails", "assets", "images", "logo.png");
}

/**
 * Get logo as a base64 data URI for embedding in emails.
 * Use when EMBED_EMAIL_IMAGES=true for better deliverability (no external request).
 * @returns {string|null} data:image/png;base64,... or null if file missing
 */
function getLogoAsDataUri() {
  const logoPath = getLogoFilePath();
  if (!fs.existsSync(logoPath)) return null;
  try {
    const buffer = fs.readFileSync(logoPath);
    const base64 = buffer.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Returns the asset set to pass into every email template.
 * Merged with template-specific data in emailSender.js and emailController.js.
 *
 * @returns {{ logoUrl: string, logoAlt: string }}
 */
function getEmailAssets() {
  const embed = process.env.EMBED_EMAIL_IMAGES === "true";
  const logoUrl = embed ? getLogoAsDataUri() : LOGO_URL;
  return {
    logoUrl: logoUrl || LOGO_URL,
    logoAlt: LOGO_ALT,
  };
}

module.exports = {
  getEmailAssets,
  getLogoFilePath,
  LOGO_ALT,
  LOGO_PATH,
};
