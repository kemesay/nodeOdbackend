const { BadRequestError } = require("../errors/CustomErrors.js");

module.exports = function validationMiddleware(validator) {
  return (req, _res, next) => {
    const { error } = validator(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }

    next();
  };
};
