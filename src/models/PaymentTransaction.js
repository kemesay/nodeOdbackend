const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database.js");

const PaymentTransaction = sequelize.define(
  "PaymentTransaction",
  {
    paymentTransactionId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    bookingType: {
      type: DataTypes.ENUM("AIRPORT", "P2P", "HOURLY"),
      allowNull: false,
    },
    bookingId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    squarePaymentId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    idempotencyKey: {
      type: DataTypes.STRING(64),
      allowNull: false,
      // Named to match the unique index that already exists in the DB —
      // `unique: true` (no name) makes Sequelize's alter-sync generate a
      // fresh auto-named index (idempotencyKey, idempotencyKey_2, ...) on
      // every restart because it can't recognize its own prior index by
      // name. That ran the payment_transactions table up to MySQL's 64-key
      // limit. Naming it explicitly lets sync recognize the existing index
      // and skip re-creating it.
      unique: "uq_payment_transactions_idempotency",
    },
    amountCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "USD",
    },
    status: {
      type: DataTypes.ENUM(
        "PENDING",
        "AUTHORIZED",
        "COMPLETED",
        "FAILED",
        "CANCELED",
        "REFUNDED"
      ),
      allowNull: false,
      defaultValue: "PENDING",
    },
    rawResponse: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    confirmationNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "payment_transactions",
    timestamps: true,
  }
);

module.exports = { PaymentTransaction };
