const express = require("express");
const cors = require("cors");
const { config } = require("dotenv");
const path = require("path");  // Import 'path' for serving static files
config();

const logging = require("./config/logging.js");
const routes = require("./startUp/routes.js");
const { connectToDatabase } = require("./config/database.js");

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files from the 'uploads' directory
// This allows accessing files like 'https://api.odatransportation.com/uploads/filename.jpg'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging and routing
logging();
routes(app);

// Connect to database
connectToDatabase();

const port = process.env.PORT || 5100;
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});

module.exports = server;
