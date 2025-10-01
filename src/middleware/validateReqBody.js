const { BadRequestError } = require("../errors/CustomErrors.js");

module.exports = function validationMiddleware(schema) {
  return (req, _res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }

    next();
  };
};
