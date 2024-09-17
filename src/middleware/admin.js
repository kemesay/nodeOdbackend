const { ForbiddenError } = require("../errors/CustomErrors.js");

module.exports = function checkAdmin(req, _res, next) {
  if (req.user && req.user.role && req.user.role.toLowerCase() === "admin") {
    next();
  } else {
    throw new ForbiddenError("Access denied: Admin role required.");
  }
};
