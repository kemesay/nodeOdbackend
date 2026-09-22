const logger = require("../config/logging.js");
const { sanitizeError } = require("../utils/errorSanitizer.js");

module.exports = errorHandler;
function errorHandler(err, req, res, _next) {
  const { status, message, safe } = sanitizeError(err);

  const response = {
    message,
    error: message, // alias kept for older clients that read `.error` instead of `.message`
    status,
    timestamp: new Date().toISOString(),
    requestUrl: req.originalUrl,
  };

  // Always capture the real error server-side, even when the client only
  // sees a sanitized message — `safe: false` means the raw error/stack is
  // the only place the real cause is still visible.
  const logLine = `${req.method} ${req.originalUrl} -> [${err.name || "Error"}] ${err.message}`;
  if (status >= 500) {
    logger.error(logLine, { stack: err.stack });
  } else if (!safe) {
    logger.warn(logLine);
  }

  res.status(status).json(response);
}
