const { BadRequestError } = require("../errors/CustomErrors.js");

module.exports = function validateUUIDMiddleware(req, _res, next) {
  if (!validateUUID(req.params.id)) {
    throw new BadRequestError("Invalid ID.");
  }
  next();
};

function validateUUID(uuid) {
  const UUID_REGEX =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  return UUID_REGEX.test(uuid);
}
