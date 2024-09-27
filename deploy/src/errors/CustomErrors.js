class ResourceNotFoundError extends Error {
  status;

  constructor(message = "Resource not found.") {
    super(message);
    this.name = "ResourceNotFoundError";
    this.status = 404;
  }
}

class ConflictError extends Error {
  status;

  constructor(message = "Conflict.") {
    super(message);
    this.name = "ConflictError";
    this.status = 409;
  }
}

class UnauthorizedError extends Error {
  status;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
    this.status = 401;
  }
}

class BadRequestError extends Error {
  status;

  constructor(message = "Bad Request") {
    super(message);
    this.name = "BadRequestError";
    this.status = 400;
  }
}

class ForbiddenError extends Error {
  status;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
    this.status = 403;
  }
}

module.exports = {
  ResourceNotFoundError,
  ConflictError,
  UnauthorizedError,
  BadRequestError,
  ForbiddenError,
};
