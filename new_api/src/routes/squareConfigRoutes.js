const express = require("express");
const { getPublicConfig } = require("../controllers/squareConfigController.js");

const router = express.Router();

router.get("/config", getPublicConfig);

module.exports = router;
