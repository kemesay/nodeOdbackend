const { login, changePassword,forgotPassword,
  resetPassword } = require("../../services/user/authService");

  const { successResponse } = require("../../utils/responseUtil.js");

async function loginController(req, res, _next) {
  const { username, password } = req.body;
  const response = await login(username, password);
  return res.json(response);
}

async function changePasswordController(req, res, _next) {
  const user = req.user;
  const { currentPassword, newPassword } = req.body;
   await changePassword(user, currentPassword, newPassword);
  const response = successResponse('Password changed successfully');
  return res.json(response);
}


async function forgotPasswordController(req, res, _next){
  const { email } = req.body;
    await forgotPassword(email);
    const response = successResponse('Password reset email sent successfully');
    return res.json(response);
}

async function resetPasswordController(req, res, _next) {
  const { token, newPassword } = req.body;
    await resetPassword(token, newPassword);
    const response = successResponse('Password reset successfully'); 
    return res.json(response);
}

module.exports = {
  loginController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController
};
