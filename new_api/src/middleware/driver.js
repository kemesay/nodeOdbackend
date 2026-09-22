const { ForbiddenError } = require("../errors/CustomErrors.js");

/**
 * Allows access to drivers and admins.
 * Must be used after the `auth` middleware.
 */
module.exports = function checkDriverOrAdmin(req, _res, next) {
  const role = req.user?.role?.toLowerCase();
  if (role === "driver" || role === "admin") {
    next();
  } else {
    throw new ForbiddenError("Access denied: Driver or Admin role required.");
  }
};
