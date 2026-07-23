/**
 * Turns a raw thrown error into a { status, message, safe } triple that is
 * fit to send to an API client.
 *
 * Two categories of error are considered UNSAFE to forward verbatim:
 *   1. Sequelize/Postgres errors (SequelizeValidationError, constraint
 *      violations, etc.) — these can contain table/column/constraint names
 *      and raw SQL fragments.
 *   2. Native JS runtime errors (TypeError, ReferenceError, RangeError,
 *      SyntaxError) — these almost always mean our own code broke, and their
 *      messages frequently mention internal variable/property names.
 *
 * Everything else (plain `Error`, and the app's own CustomErrors classes) is
 * assumed to already carry a deliberate, user-appropriate message and is
 * passed through unchanged — this function only steps in for the two
 * categories above, `safe: false` marks that the message came from us, not
 * from the original error, so the caller knows whether the raw error is
 * still worth logging in full server-side.
 */

const RUNTIME_ERROR_NAMES = new Set([
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "AssertionError",
]);

function humanizeField(path) {
  if (!path) return "This field";
  const spaced = String(path)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function messageForValidationItem(item) {
  const field = humanizeField(item?.path);
  if (item?.validatorKey === "is_null" || item?.type === "notNull Violation") {
    return `${field} is required.`;
  }
  switch (item?.validatorKey) {
    case "isEmail":
      return "Please enter a valid email address.";
    case "isUrl":
      return "Please enter a valid URL.";
    case "len":
      return `${field} is too short or too long.`;
    case "isIn":
      return `${field} has an unsupported value.`;
    case "isInt":
    case "isFloat":
    case "isDecimal":
      return `${field} must be a valid number.`;
    case "isDate":
      return `${field} must be a valid date.`;
    default:
      return `${field} is invalid.`;
  }
}

function sanitizeSequelizeError(err) {
  switch (err.name) {
    case "SequelizeValidationError": {
      const first = err.errors?.[0];
      return { status: 400, message: messageForValidationItem(first) };
    }
    case "SequelizeUniqueConstraintError": {
      const first = err.errors?.[0];
      const field = humanizeField(
        first?.path || (err.fields && Object.keys(err.fields)[0])
      );
      return {
        status: 409,
        message: `${field} is already in use. Please use a different ${field.toLowerCase()}.`,
      };
    }
    case "SequelizeExclusionConstraintError":
      return {
        status: 409,
        message: "This conflicts with an existing record.",
      };
    case "SequelizeForeignKeyConstraintError":
      return {
        status: 400,
        message:
          "This action references a record that doesn't exist or can no longer be modified.",
      };
    case "SequelizeDatabaseError":
      return {
        status: 400,
        message: "We couldn't process your request due to invalid data.",
      };
    case "SequelizeConnectionError":
    case "SequelizeConnectionRefusedError":
    case "SequelizeConnectionTimedOutError":
    case "SequelizeHostNotFoundError":
    case "SequelizeHostNotReachableError":
    case "SequelizeInvalidConnectionError":
    case "SequelizeAccessDeniedError":
      return {
        status: 503,
        message: "Service temporarily unavailable. Please try again shortly.",
      };
    case "SequelizeTimeoutError":
      return {
        status: 504,
        message: "The request took too long to process. Please try again.",
      };
    default:
      return null;
  }
}

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: "File is too large. Maximum allowed size is 5MB.",
  LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
};

function sanitizeError(err) {
  if (err?.name === "MulterError") {
    return {
      status: 400,
      message: MULTER_MESSAGES[err.code] || "File upload failed.",
      safe: true,
    };
  }

  const sequelizeResult =
    typeof err?.name === "string" && err.name.startsWith("Sequelize")
      ? sanitizeSequelizeError(err)
      : null;
  if (sequelizeResult) {
    return { ...sequelizeResult, safe: false };
  }

  if (RUNTIME_ERROR_NAMES.has(err?.name)) {
    return {
      status: 500,
      message: "Something went wrong on our end. Please try again later.",
      safe: false,
    };
  }

  return {
    status: typeof err?.status === "number" ? err.status : 500,
    message: err?.message || "Something went wrong on our end. Please try again later.",
    safe: true,
  };
}

module.exports = { sanitizeError };
