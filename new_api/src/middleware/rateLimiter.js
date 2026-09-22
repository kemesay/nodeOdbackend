const rateLimit = require("express-rate-limit");

// Shared response shape with the rest of the API (see errorHandler.js) so a
// throttled client sees the same {message, error, status, timestamp,
// requestUrl} envelope it would from any other error.
function rateLimitHandler(message) {
  return (req, res) => {
    res.status(429).json({
      message,
      error: message,
      status: 429,
      timestamp: new Date().toISOString(),
      requestUrl: req.originalUrl,
    });
  };
}

// Credential-stuffing / brute-force guard on login. Generous enough that a
// real user mistyping their password a few times never notices it.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many login attempts. Please try again in a few minutes."),
});

// Guards both forgot-password (email-bomb risk) and reset-password (token
// brute-force risk) — same abuse shape, so one limiter covers both routes.
const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many password reset requests. Please try again later."),
});

module.exports = { loginRateLimiter, passwordResetRateLimiter };
