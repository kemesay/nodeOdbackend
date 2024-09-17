const express = require("express");

const {
  createExtraOptionController,
  updateExtraOptionController,
  getAllExtraOptionsController,
  getAllActiveExtraOptionsController,
  deleteExtraOptionController,
  toggleExtraOptionStatusController,
} = require("../controllers/extraOptionController.js");

const { validateExtraOption } = require("../models/ExtraOption.js");
const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

const router = express.Router();

router.post(
  "/",
  [auth, admin, validate(validateExtraOption)],
  createExtraOptionController
);
router.put("/:extraOptionId", [auth, admin], updateExtraOptionController);
router.put(
  "/:extraOptionId/toggle-status",
  [auth, admin],
  toggleExtraOptionStatusController
);
router.delete("/:extraOptionId", [auth, admin], deleteExtraOptionController);
router.get("/all", [auth, admin], getAllExtraOptionsController);
router.get("/", getAllActiveExtraOptionsController);

module.exports = router;
