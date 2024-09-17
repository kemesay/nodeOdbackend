const winston = require("winston");

module.exports = errorHandler;
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message =
    err.message || "Internal server error. Please try again later.";

  const response = {
    message,
    status,
    timestamp: new Date().toISOString(),
    requestUrl: req.originalUrl,
  };

  if (status === 500) {
    winston.error(err.message, err);
  }

  res.status(status).json(response);
}
