const { sequelize } = require("../config/database.js");
const { DataTypes, Model } = require("sequelize");

/**
 * Creates the confirmation_number_seq table if it does not exist.
 */
async function createSequenceTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS confirmation_number_seq (
      id INT AUTO_INCREMENT PRIMARY KEY
    );
  `);
  console.log("Sequence table created successfully or already exists.");
}

/**
 * Define the Sequence model to handle the sequence generation.
 */
class BookingSequence extends Model {}

BookingSequence.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
  },
  {
    sequelize,
    modelName: "BookingSequence",
    tableName: "confirmation_number_seq",
    timestamps: false,
  }
);

async function generateConfirmationNumber() {
  const prefix = "OT";
  const sequence = await BookingSequence.create();
  const nextNumber = sequence.id;
  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

module.exports = generateConfirmationNumber;
