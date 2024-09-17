const jwt = require("jsonwebtoken");

const {
  BadRequestError,
  UnauthorizedError,
  ResourceNotFoundError,
} = require("../errors/CustomErrors.js");

const { findUserByEmailOrPhone } = require("../services/user/authService.js");

module.exports = async function authenticateToken(tokenHeader) {
  if (!tokenHeader) throw new UnauthorizedError("No token provided.");

  const [bearer, token] = tokenHeader.split(" ");

  if (!token || !bearer || bearer.toLowerCase() !== "bearer")
    throw new BadRequestError("Invalid token format.");

  // const privateKey = process.env.JWT_PRIVATE_KEY;
  const privateKey = process.env.JWT_PRIVATE_KEY;

  if (!privateKey)
    throw new Error("JWT_PRIVATE_KEY environment variable is not set.");

  try {
    const decode = jwt.verify(token, privateKey);
    const user = await findUserByEmailOrPhone(decode.username);

    if (!user) throw new ResourceNotFoundError("Please login again and try.");

    return user;
  } catch (ex) {
    if (ex instanceof jwt.TokenExpiredError)
      throw new BadRequestError("Token has expired.");
    throw new BadRequestError("Invalid token.");
  }
};
