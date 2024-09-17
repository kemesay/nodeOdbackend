const cors = require("cors");

module.exports = function (app) {
  // TODO: Update the CORS settings according to your specific use case
  const corsOptions = {
    origin: "*",
    methods: "*",
    allowedHeaders: "*",
    credentials: true,
  };

  // Enable CORS for all routes
  app.use(cors(corsOptions));
};
