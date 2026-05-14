

// const {
//   createUser,
//   createAdminUser,
//   updateUser,
//   getAllUsers,
//   deleteUser,
// } = require("../../services/user/userService.js");

// const {
//   createPaymentDetail,
//   getPaymentDetails,
//   updatePaymentDetail,
//   deletePaymentDetail,
//   setPrimaryCard,
// } = require("../../services/paymentDetailService.js");

// const { successResponse } = require("../../utils/responseUtil.js");

// async function createUserController(req, res, _next) {
//   const user = await createUser(req.body);
//   return res.status(201).json(user);
// }

// async function createAdminUserController(req, res, _next) {
//   const user = await createAdminUser(req.body);
//   return res.status(201).json(user);
// }

// async function updateUserController(req, res, _next) {
//   const userId = req.user.userId;
//   const updatedUserData = req.body;
//   const updatedUser = await updateUser(userId, updatedUserData);
//   return res.json(updatedUser);
// }

// async function updateUserWithIDController(req, res, _next) {
//   const userId = req.user.userId;
//   const updatedUserData = req.body;
//   const updatedUser = await updateUser(userId, updatedUserData);
//   return res.json(updatedUser);
// }

// async function getMyInfoController(req, res, _next) {
//   const user = req.user;
//   const response = {
//     userId: user.userId,
//     fullName: user.fullName,
//     email: user.email,
//     phoneNumber: user.phoneNumber,
//   };

//   return res.json(response);
// }

// async function getAllUsersController(req, res, _next) {
//   const role = req.query.role;
//   const users = await getAllUsers(role);
//   return res.json(users);
// }

// async function deleteUserController(req, res, _next) {
//   await deleteUser(req.params.userId);
//   const response = successResponse("User deleted successfully");
//   return res.json(response);
// }

// async function createPaymentDetailController(req, res, _next) {
//   try {
//     const userId = req.user.userId;
//     const paymentDetailData = { ...req.body, userId };
//     const newPaymentDetail = await createPaymentDetail(paymentDetailData);
//     return res.status(201).json(newPaymentDetail);
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// }

// async function getPaymentDetailsController(req, res, _next) {
//   try {
//     const userId = req.user.userId;
//     const paymentDetails = await getPaymentDetails({ userId, ...req.query });
//     return res.status(200).json(paymentDetails);
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// }

// async function updatePaymentDetailController(req, res, _next) {
//   try {
//     const userId = req.user.userId;
//     const cardId = req.params.cardId;
//     const updatedData = req.body;

//     const updatedPaymentDetail = await updatePaymentDetail(cardId, { ...updatedData, userId });
//     return res.status(200).json(updatedPaymentDetail);
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// }

// async function deletePaymentDetailController(req, res, _next) {
//   try {
//     const userId = req.user.userId;
//     const cardId = req.params.cardId;
//     await deletePaymentDetail(cardId, userId); // Assuming service handles user ownership
//     const response = successResponse("Payment detail deleted successfully");
//     return res.status(200).json(response);
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// }

// async function setPrimaryCardController(req, res, _next) {
//   try {
//     const userId = req.user.userId;
//     const cardId = req.params.cardId;
//     const primaryCard = await setPrimaryCard(cardId, userId);
//     return res.status(200).json(primaryCard);
//   } catch (error) {
//     return res.status(400).json({ error: error.message });
//   }
// }

// module.exports = {
//   createUserController,
//   createAdminUserController,
//   updateUserController,
//   getAllUsersController,
//   deleteUserController,
//   getMyInfoController,
//   createPaymentDetailController,
//   getPaymentDetailsController,
//   updatePaymentDetailController,
//   deletePaymentDetailController,
//   setPrimaryCardController,
// };

const {
  createUser,
  createAdminUser,
  updateUser,
  getAllUsers,
  deleteUser,
} = require("../../services/user/userService.js");

const {
  createPaymentDetail,
  getPaymentDetails,
  updatePaymentDetail,
  deletePaymentDetail,
  setPrimaryCard,
} = require("../../services/paymentDetailService.js");

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

async function deleteMyAccountController(req, res, _next) {
  const userId = req.user.userId;
  await deleteUser(userId);
  const response = successResponse("Your account has been deleted successfully");
  return res.json(response);
}

async function createPaymentDetailController(req, res, _next) {
  try {
    const userId = req.user.userId;
    const paymentDetailData = { ...req.body, userId };
    const newPaymentDetail = await createPaymentDetail(paymentDetailData);
    return res.status(201).json(newPaymentDetail);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function getPaymentDetailsController(req, res, _next) {
  try {
    const userId = req.user.userId;
    const paymentDetails = await getPaymentDetails({ userId, ...req.query });
    return res.status(200).json(paymentDetails);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function updatePaymentDetailController(req, res, _next) {
  try {
    const userId = req.user.userId;
    const cardId = req.params.cardId;
    const updatedData = req.body;

    const updatedPaymentDetail = await updatePaymentDetail(cardId, { ...updatedData, userId });
    return res.status(200).json(updatedPaymentDetail);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function deletePaymentDetailController(req, res, _next) {
  try {
    const userId = req.user.userId;
    const cardId = req.params.cardId;
    await deletePaymentDetail(cardId, userId); // Assuming service handles user ownership
    const response = successResponse("Payment detail deleted successfully");
    return res.status(200).json(response);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function setPrimaryCardController(req, res, _next) {
  try {
    const userId = req.user.userId;
    const cardId = req.params.cardId;
    const primaryCard = await setPrimaryCard(cardId, userId);
    return res.status(200).json(primaryCard);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createUserController,
  createAdminUserController,
  updateUserController,
  getAllUsersController,
  deleteUserController,
  deleteMyAccountController,
  getMyInfoController,
  createPaymentDetailController,
  getPaymentDetailsController,
  updatePaymentDetailController,
  deletePaymentDetailController,
  setPrimaryCardController,
};
