const express = require("express");
const { squareWebhook } = require("../controllers/squareWebhookController.js");

const router = express.Router();

router.post("/", squareWebhook);

module.exports = router;
