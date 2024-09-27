const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database.js");
const Joi = require("joi");
const bcrypt = require("bcrypt");
const {
  testCards,
  creditCardNumberMessage,
  expirationDateMessage,
  securityCodeMessage,
} = require("../../utils/validationUtils");

const User = sequelize.define(
  "User",
  {
    userId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: [1, 255],
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: /^[0-9]{10,15}$/,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100],
      },
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: "admin",
      validate: {
        isIn: [["admin", "user"]],
      },
    },
    lastLogin: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    paranoid: true,
  }
);

User.beforeCreate(async (user) => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;
});

const passwordFormat = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const passwordFormatMessage =
  "Password must include 1 uppercase letter, 1 lowercase letter, and 1 numeric digit.";

// Validate user
function validateUser(user) {
  const schema = Joi.object({
    fullName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().max(255).required(),
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .message("Please provide a valid phone number.")
      .required(),
    password: Joi.string()
      .min(8)
      .max(100)
      .regex(passwordFormat)
      .message(passwordFormatMessage)
      .required(),
  });

  return schema.validate(user);
}

// Validate user data during user update
function validateUserUpdate(user) {
  const schema = Joi.object({
    fullName: Joi.string().min(2).max(100),
    email: Joi.string().email().max(255),
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .message("Please provide a valid phone number."),
  });

  return schema.validate(user);
}

function validateUserAuth(user) {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().min(8).max(100).required(),
  });

  return schema.validate(user);
}

function validatePasswordChange(req) {
  const schema = Joi.object({
    currentPassword: Joi.string().min(8).max(100).required(),
    newPassword: Joi.string()
      .min(8)
      .max(100)
      .regex(passwordFormat)
      .message(passwordFormatMessage)
      .required(),
  });

  return schema.validate(req);
}

function validatePasswordReset(req) {
  const schema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .max(100)
      .regex(passwordFormat)
      .message(passwordFormatMessage)
      .required(),
  });

  return schema.validate(req);
}

module.exports = {
  User,
  validateUser,
  validateUserUpdate,
  validateUserAuth,
  validatePasswordChange,
  validatePasswordReset
};
