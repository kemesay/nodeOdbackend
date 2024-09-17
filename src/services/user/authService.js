const crypto = require('crypto');
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../../models/user/User.js");
const { PasswordResetToken } = require('../../models/user/PasswordResetToken.js');
const {
  UnauthorizedError,
  BadRequestError,
} = require("../../errors/CustomErrors");

const { sendResetPasswordEmail } = require("../../utils/emailSender");

const EXPIRATION_TIME = "14d";
const privateKey = process.env.JWT_PRIVATE_KEY;

async function login(username, password) {
  if (!username || !password)
    throw new BadRequestError("Username and password are required.");

  const user = await findUserByEmailOrPhone(username);

  if (!user) throw new UnauthorizedError("Invalid credentials.");

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new UnauthorizedError("Invalid credentials.");

  return {
    "auth-token": generateAuthToken(user.userId, username, user.role),
  };
}

async function changePassword(user, currentPassword, newPassword) {
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) throw new UnauthorizedError("Invalid current password");

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedNewPassword;
  await user.save();
}

async function findUserByEmailOrPhone(username) {
  return User.findOne({
    where: {
      [Op.or]: [{ email: username }, { phoneNumber: username }],
    },
  });
}

function generateAuthToken(userId, username, role) {
  const tokenData = {
    userId,
    username,
    role,
  };

  return jwt.sign(tokenData, privateKey, { expiresIn: EXPIRATION_TIME });
}



// Method to handle forgot password request
async function forgotPassword(email) {
  const user = await User.findOne({ where: { email } });
  if (!user) 
    throw new Error('User not found');

  const expiresInHours = 1; // Set expiration to 1 hour
  const token = crypto.randomBytes(20).toString('hex');
  const expiresAt =new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  // Save token in the database
  await PasswordResetToken.create({
    userId: user.userId,
    token,
    expiresAt,
  });

  // Send reset password email
  await sendResetPasswordEmail(email,user.fullName, token);
}

// Method to reset password
async function resetPassword(token, newPassword) {
  const resetToken = await PasswordResetToken.findOne({ where: { token } });
  if (!resetToken || resetToken.expiresAt < new Date())
    throw new Error('Invalid or expired token');

  const user = await User.findByPk(resetToken.userId);
  if (!user)
    throw new Error('User not found');

  // Update user's password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedNewPassword;
  await user.save();

  // Delete the reset token from the database
  await resetToken.destroy();
}

module.exports = { login, changePassword, findUserByEmailOrPhone,forgotPassword,
  resetPassword, };
