const { Sequelize } = require("sequelize");

// const sequelize = new Sequelize({
//   dialect: "mysql",
//   host: "195.201.205.15",
//   port: 3306,
//   username: "ethiosma_smartride_dev",
//   database: "ethiosma_smartride_dev_db",
//   password: "R*7^G%Gm6xK.",
// });

// const sequelize = new Sequelize({
//   dialect: "postgres",
//   host:"127.0.0.1" || "195.201.205.15",
//   port: 5432,
//   username: "ethiosma_smartride_dev",
//   database: "ethiosma_smartride_dev_db",
//   password: "4i~[jnjFi@MW",
// });

// const sequelize = new Sequelize({
//   dialect: "mysql",
//   host: "192.249.113.151",
//   port: 3306,
//   username: "smartride_dev",
//   database: "smartride_dev_db",
//   password: "0fewNqU_,qdj",
// });

const sequelize = new Sequelize({
  dialect: "postgres",
  host: "127.0.0.1" || "192.249.113.151",
  port: 5432,
  username: "postgres",
  database: "transportation",
  password: "1234",
});

async function connectToDatabase() {
  try {
    // Drop all tables (existing data will be lost)
    // await sequelize.drop({ force: true });
    // console.log("Database reset and models synced.");

    await sequelize.authenticate();
    // console.log("Connection has been established successfully.");
    await sequelize.sync();

    console.log("Models synced to the database.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
}

async function startTransaction() {
  const transaction = await sequelize.transaction();
  return transaction;
}

async function commitTransaction(transaction) {
  try {
    if (transaction) await transaction.commit();
  } catch (error) {
    throw error;
  }
}

async function rollbackTransaction(transaction) {
  try {
    if (transaction) await transaction.rollback();
  } catch (error) {
    throw error;
  }
}

module.exports = {
  sequelize,
  connectToDatabase,
  startTransaction,
  commitTransaction,
  rollbackTransaction,
};
