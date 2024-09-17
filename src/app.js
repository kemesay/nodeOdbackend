const express = require("express");
const cors = require("cors");
const { config } = require("dotenv");
config();

const logging = require("./config/logging.js");
const routes = require("./startUp/routes.js");
const { connectToDatabase } = require("./config/database.js");

const app = express();

// Enable CORS for all routes
app.use(cors());

logging();
routes(app);
connectToDatabase();

const port = process.env.PORT || 5100;
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});

module.exports = server;
