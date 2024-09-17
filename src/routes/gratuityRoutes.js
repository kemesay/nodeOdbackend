const express = require("express");

const {
  createOrUpdateGratuityController,
  toggleGratuityStatusController,
  getAllGratuitiesController,
  getAllActiveGratuitiesController,
  deleteGratuityController,
} = require("../controllers/gratuityController.js");

const { validateGratuity } = require("../models/Gratuity.js");
const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

const router = express.Router();

router.post(
  "/",
  [auth, admin, validate(validateGratuity)],
  createOrUpdateGratuityController
);
router.put(
  "/:gratuityId/toggle-status",
  [auth, admin],
  toggleGratuityStatusController
);
router.delete("/:gratuityId", [auth, admin], deleteGratuityController);

router.get("/all", [auth, admin], getAllGratuitiesController);
router.get("/", getAllActiveGratuitiesController);

module.exports = router;
