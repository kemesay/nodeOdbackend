// const { Op } = require("sequelize");
// const { sequelize } = require("../../config/database.js");
// const { User } = require("../../models/user/User.js");
// const {
//   ResourceNotFoundError,
//   ConflictError,
// } = require("../../errors/CustomErrors.js");

// const { addUserPaymentDetail } = require("../paymentDetailService.js");

// async function createUser(data) {
//   const { creditCardNumber, expirationDate, securityCode, ...userData } = data;

//   let transaction;
//   try {
//     // Start a transaction
//     transaction = await sequelize.transaction();

//     // Check if user with the same email or phone number already exists
//     const existingUser = await User.findOne({
//       where: {
//         [Op.or]: [
//           { email: userData.email },
//           { phoneNumber: userData.phoneNumber },
//         ],
//       },
//       transaction: transaction, //  to ensure operations are performed in the same transaction
//     });

//     if (existingUser) {
//       if (existingUser.email === userData.email)
//         throw new ConflictError("Email is already in use.");
//       else throw new ConflictError("Phone number is already in use.");
//     }

//     // Create user within the transaction
//     const newUser = await User.create(userData, { transaction });

//     // Commit the transaction
//     await transaction.commit();

//     return userResponse(newUser);
//   } catch (error) {
//     if (transaction) await transaction.rollback();
//     throw error;
//   }
// }

// async function createAdminUser(data) {
//   // Check if admin with the same email or phone number already exists
//   const existingAdmin = await User.findOne({
//     where: {
//       [Op.or]: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
//     },
//   });

//   if (existingAdmin) {
//     if (existingAdmin.email === data.email)
//       throw new ConflictError("Email is already in use.");
//     else throw new ConflictError("Phone number is already in use.");
//   }

//   // Create admin
//   data.role = "admin";
//   const admin = await User.create(data);
//   return userResponse(admin);
// }

// // TODO: if user existing and deleted softly
// async function updateUser(userId, updatedUserData) {
//   // Check if the provided email or phone number already exists and does not belong to the current user
//   const { email, phoneNumber } = updatedUserData;

//   const whereClause = {
//     userId: {
//       [Op.not]: userId, // Exclude the current user = require( the search
//     },
//   };

//   if (email || phoneNumber) {
//     whereClause[Op.and] = [];

//     if (email) {
//       whereClause[Op.and].push({
//         [Op.or]: [
//           { email: email },
//           ...(phoneNumber ? [{ phoneNumber: phoneNumber }] : []), // Only push if phoneNumber is provided
//         ],
//       });
//     }

//     if (phoneNumber) {
//       whereClause[Op.and].push({
//         [Op.or]: [
//           { phoneNumber: phoneNumber },
//           ...(email ? [{ email: email }] : []), // Only push if email is provided
//         ],
//       });
//     }
//   }

//   const existingUser = await User.findOne({
//     where: whereClause,
//   });

//   if (existingUser) {
//     if (updatedUserData.email && existingUser.email === updatedUserData.email)
//       throw new ConflictError("Email is already in use by another user.");

//     if (
//       updatedUserData.phoneNumber &&
//       existingUser.phoneNumber === updatedUserData.phoneNumber
//     )
//       throw new ConflictError(
//         "Phone number is already in use by another user."
//       );
//   }

//   // If no existing user, update the user
//   let user = await findUserById(userId);
//   user = await user.update(updatedUserData);

//   return userResponse(user);
// }

// async function getAllUsers(role) {
//   return await User.findAll({
//     where: {
//       role: role,
//     },
//     attributes: {
//       exclude: ["password", "createdAt", "updatedAt", "deletedAt"],
//     },
//     order: [["fullName", "ASC"]],
//   });
// }

// async function deleteUser(userId) {
//   const user = await findUserById(userId);
//   await user.destroy();
// }

// async function findUserById(userId) {
//   const user = await User.findByPk(userId);

//   if (!user)
//     throw new ResourceNotFoundError(`User with ID ${userId} not found`);

//   return user;
// }

// function userResponse(user) {
//   return {
//     userId: user.userId,
//     fullName: user.fullName,
//     email: user.email,
//     phoneNumber: user.phoneNumber,
//   };
// }

// module.exports = {
//   createUser,
//   createAdminUser,
//   updateUser,
//   getAllUsers,
//   findUserById,
//   deleteUser,
// };



const { Op } = require("sequelize");
const { sequelize } = require("../../config/database.js");
const { User } = require("../../models/user/User.js");
const bcrypt = require("bcrypt");
const {
  ResourceNotFoundError,
  ConflictError,
} = require("../../errors/CustomErrors.js");

const { addUserPaymentDetail } = require("../paymentDetailService.js");

async function createUser(data) {
  const { creditCardNumber, expirationDate, securityCode, ...userData } = data;

  let transaction;
  try {
    // Start a transaction
    transaction = await sequelize.transaction();

    // Check for active users first (they take priority)
    const activeUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: userData.email },
          { phoneNumber: userData.phoneNumber },
        ],
      },
      paranoid: true, // Only check active users
      transaction: transaction,
    });

    if (activeUser) {
      if (activeUser.email === userData.email)
        throw new ConflictError("Email is already in use.");
      else throw new ConflictError("Phone number is already in use.");
    }

    // Check for soft-deleted users - need to check email and phoneNumber separately
    const softDeletedByEmail = await User.findOne({
      where: { email: userData.email },
      paranoid: false,
      transaction: transaction,
    });

    const softDeletedByPhone = await User.findOne({
      where: { phoneNumber: userData.phoneNumber },
      paranoid: false,
      transaction: transaction,
    });

    // If both email and phoneNumber match the same soft-deleted user, restore and update
    if (
      softDeletedByEmail &&
      softDeletedByPhone &&
      softDeletedByEmail.userId === softDeletedByPhone.userId &&
      softDeletedByEmail.deletedAt
    ) {
      await softDeletedByEmail.restore({ transaction });
      // Hash password before updating (since beforeCreate hook doesn't run on update)
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const updatedUserData = { ...userData, password: hashedPassword };
      await softDeletedByEmail.update(updatedUserData, { transaction });
      await transaction.commit();
      return userResponse(softDeletedByEmail);
    }

    // If email matches a soft-deleted user but phoneNumber doesn't match that same user
    if (softDeletedByEmail && softDeletedByEmail.deletedAt) {
      // Check if phoneNumber conflicts with an active user
      if (softDeletedByPhone && !softDeletedByPhone.deletedAt) {
        throw new ConflictError("Phone number is already in use.");
      }
      // Check if phoneNumber matches a different soft-deleted user
      if (softDeletedByPhone && softDeletedByPhone.userId !== softDeletedByEmail.userId) {
        throw new ConflictError("Phone number is already in use.");
      }
      // Safe to restore and update
      await softDeletedByEmail.restore({ transaction });
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const updatedUserData = { ...userData, password: hashedPassword };
      await softDeletedByEmail.update(updatedUserData, { transaction });
      await transaction.commit();
      return userResponse(softDeletedByEmail);
    }

    // If phoneNumber matches a soft-deleted user but email doesn't match that same user
    if (softDeletedByPhone && softDeletedByPhone.deletedAt) {
      // Check if email conflicts with an active user
      if (softDeletedByEmail && !softDeletedByEmail.deletedAt) {
        throw new ConflictError("Email is already in use.");
      }
      // Check if email matches a different soft-deleted user
      if (softDeletedByEmail && softDeletedByEmail.userId !== softDeletedByPhone.userId) {
        throw new ConflictError("Email is already in use.");
      }
      // Safe to restore and update
      await softDeletedByPhone.restore({ transaction });
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const updatedUserData = { ...userData, password: hashedPassword };
      await softDeletedByPhone.update(updatedUserData, { transaction });
      await transaction.commit();
      return userResponse(softDeletedByPhone);
    }

    // Create new user within the transaction
    const newUser = await User.create(userData, { transaction });

    // Commit the transaction
    await transaction.commit();

    return userResponse(newUser);
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  }
}

async function createAdminUser(data) {
  // Check if admin with the same email or phone number already exists
  const existingAdmin = await User.findOne({
    where: {
      [Op.or]: [{ email: data.email }, { phoneNumber: data.phoneNumber }],
    },
  });

  if (existingAdmin) {
    if (existingAdmin.email === data.email)
      throw new ConflictError("Email is already in use.");
    else throw new ConflictError("Phone number is already in use.");
  }

  // Create admin
  data.role = "admin";
  const admin = await User.create(data);
  return userResponse(admin);
}

// TODO: if user existing and deleted softly
async function updateUser(userId, updatedUserData) {
  // Check if the provided email or phone number already exists and does not belong to the current user
  const { email, phoneNumber } = updatedUserData;

  const whereClause = {
    userId: {
      [Op.not]: userId, // Exclude the current user = require( the search
    },
  };

  if (email || phoneNumber) {
    whereClause[Op.and] = [];

    if (email) {
      whereClause[Op.and].push({
        [Op.or]: [
          { email: email },
          ...(phoneNumber ? [{ phoneNumber: phoneNumber }] : []), // Only push if phoneNumber is provided
        ],
      });
    }

    if (phoneNumber) {
      whereClause[Op.and].push({
        [Op.or]: [
          { phoneNumber: phoneNumber },
          ...(email ? [{ email: email }] : []), // Only push if email is provided
        ],
      });
    }
  }

  const existingUser = await User.findOne({
    where: whereClause,
  });

  if (existingUser) {
    if (updatedUserData.email && existingUser.email === updatedUserData.email)
      throw new ConflictError("Email is already in use by another user.");

    if (
      updatedUserData.phoneNumber &&
      existingUser.phoneNumber === updatedUserData.phoneNumber
    )
      throw new ConflictError(
        "Phone number is already in use by another user."
      );
  }

  // If no existing user, update the user
  let user = await findUserById(userId);
  user = await user.update(updatedUserData);

  return userResponse(user);
}

async function getAllUsers(role) {
  return await User.findAll({
    where: {
      role: role,
    },
    attributes: {
      exclude: ["password", "createdAt", "updatedAt", "deletedAt"],
    },
    order: [["fullName", "ASC"]],
  });
}

async function deleteUser(userId) {
  const user = await findUserById(userId);
  await user.destroy();
}

async function findUserById(userId) {
  const user = await User.findByPk(userId);

  if (!user)
    throw new ResourceNotFoundError(`User with ID ${userId} not found`);

  return user;
}

function userResponse(user) {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
  };
}

module.exports = {
  createUser,
  createAdminUser,
  updateUser,
  getAllUsers,
  findUserById,
  deleteUser,
};

