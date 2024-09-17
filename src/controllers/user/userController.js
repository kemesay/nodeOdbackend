const {
  createUser,
  createAdminUser,
  updateUser,
  getAllUsers,
  deleteUser,
} = require("../../services/user/userService.js");

const { successResponse } = require("../../utils/responseUtil.js");

async function createUserController(req, res, _next) {
  const user = await createUser(req.body);
  return res.status(201).json(user);
}

async function createAdminUserController(req, res, _next) {
  const user = await createAdminUser(req.body);
  return res.status(201).json(user);
}

async function updateUserController(req, res, _next) {
  const userId = req.user.userId;
  const updatedUserData = req.body;
  const updatedUser = await updateUser(userId, updatedUserData);
  return res.json(updatedUser);
}

async function updateUserWithIDController(req, res, _next) {
  const userId = req.user.userId;
  const updatedUserData = req.body;
  const updatedUser = await updateUser(userId, updatedUserData);
  return res.json(updatedUser);
}

async function getMyInfoController(req, res, _next) {
  const user = req.user;
  const response = {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
  };

  return res.json(response);
}

async function getAllUsersController(req, res, _next) {
  const role = req.query.role;
  const users = await getAllUsers(role);
  return res.json(users);
}

async function deleteUserController(req, res, _next) {
  await deleteUser(req.params.userId);
  const response = successResponse("User deleted successfully");
  return res.json(response);
}

module.exports = {
  createUserController,
  createAdminUserController,
  updateUserController,
  getAllUsersController,
  deleteUserController,
  getMyInfoController,
};
