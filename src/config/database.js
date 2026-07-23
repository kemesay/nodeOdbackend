const { Sequelize } = require("sequelize");

// const sequelize = new Sequelize({
//   dialect: "mysql",
//   host: "192.249.113.151",
//   port: 3306,
//   username: "odatra5_dev",
//   database: "odatra5_dev_db",
//   password: "0fewNqU_,qdj",
//   logging: false,
//   pool: {
//     max: 20,
//     min: 2,
//     idle: 10000,
//     acquire: 30000,
//   },
//   dialectOptions: {
//     // Remote host does not offer TLS; MariaDB/MySQL client defaults require SSL.
//     ssl: false,
//   },
// });



const sequelize = new Sequelize({
  dialect: "postgres",
  host: "127.0.0.1" || "192.249.113.151",
  port: 5432,
  username: "postgres",
  database: "oda_transportation",
  password: "postgres123",
  logging: false,
  pool: {
    max: 20,
    min: 2,
    idle: 10000,
    acquire: 30000,
  },
});

async function connectToDatabase() {
  try {
    await sequelize.authenticate();

    // sync({ alter: true }) auto-generates ALTER statements to reconcile
    // every model with the live schema on every single boot. There is no
    // separate dev database here — local restarts and production restarts
    // hit the same remote DB — so every nodemon reload and every process
    // respawn ran this. For columns with `unique: true` and no explicit
    // index name, Sequelize can't recognize its own previously-created
    // index and adds a brand new one each time; payment_transactions.
    // idempotencyKey accumulated 61 duplicate unique indexes this way and
    // hit MySQL's 64-key-per-table limit, which made the ALTER itself fail
    // and this whole function throw — crashing app boot outright.
    //
    // Auto-alter is now opt-in only. Schema changes should be applied
    // deliberately (e.g. a one-off `DB_AUTO_ALTER=true node src/app.js`
    // run, or a targeted script like scripts/ensure-square-payment-columns.js)
    // instead of on every restart.
    if (process.env.DB_AUTO_ALTER === "true") {
      await sequelize.sync({ alter: true });
      console.log("Models synced to the database (DB_AUTO_ALTER=true).");
    }
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
