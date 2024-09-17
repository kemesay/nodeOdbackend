const express = require("express");
const multer = require("multer");

const {
  createCarController,
  updateCarController,
  getAllCarsController,
  getAllActiveCarsController,
  deleteCarController,
  toggleCarStatusController,
  uploadCarImageController,
} = require("../controllers/carController.js");

const { validateCar } = require("../models/Car.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

const router = express.Router();

// Multer configuration for uploading car images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalname = file.originalname.replace(/\s+/g, "_"); // Replace spaces with underscores
    const filePath = `/${timestamp}-${originalname}`; // Construct the file path
    cb(null, filePath);
  },
});
const upload = multer({ storage: storage });

router.post("/", [auth, admin, validate(validateCar)], createCarController);
router.put("/:carId", [auth, admin], updateCarController);
router.put("/:carId/toggle-status", [auth, admin], toggleCarStatusController);
router.put(
  "/:carId/upload-image",
  [auth, admin, upload.single("carImage")],
  uploadCarImageController
);
router.delete("/:carId", [auth, admin], deleteCarController);
router.get("/all", [auth, admin], getAllCarsController);

router.get("/", getAllActiveCarsController);

module.exports = router;
