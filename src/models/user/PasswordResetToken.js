const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database.js");

// Define a model for storing reset tokens
const PasswordResetToken = sequelize.define(
  'PasswordResetToken',
  {
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'PasswordResetToken',
    tableName: 'password_reset_tokens',
  }
);


module.exports = {
    PasswordResetToken
  };
  