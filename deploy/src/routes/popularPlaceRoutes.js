const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  createPopularPlaceController,
  updatePopularPlaceController,
  togglePopularPlaceStatusController,
  getAllPopularPlacesController,
  getAllActivePopularPlacesController,
  deletePopularPlaceController,
  uploadPopularPlaceImageController,
} = require("../controllers/popularPlaceController.js");

const { validatePopularPlace } = require("../models/PopularPlace.js");

const admin = require("../middleware/admin.js");
const auth = require("../middleware/auth.js");
const validate = require("../middleware/validateReqBody.js");

const router = express.Router();

// Multer configuration for uploading PopularPlace images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, "../uploads")); 
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalname = file.originalname.replace(/\s+/g, "_"); // Replace spaces with underscores
    const filePath = `/${timestamp}-${originalname}`; // Construct the file path
    cb(null, filePath);
  },
});
const upload = multer({ storage: storage });

router.post(
  "/",
  [auth, admin, validate(validatePopularPlace)],
  createPopularPlaceController
);
router.put("/:popularPlaceId", [auth, admin], updatePopularPlaceController);
router.put(
  "/:popularPlaceId/toggle-status",
  [auth, admin],
  togglePopularPlaceStatusController
);
router.put(
  "/:popularPlaceId/upload-image",
  [auth, admin, upload.single("image")],
  uploadPopularPlaceImageController
);
router.delete("/:popularPlaceId", [auth, admin], deletePopularPlaceController);
router.get("/all", [auth, admin], getAllPopularPlacesController);

router.get("/", getAllActivePopularPlacesController);

module.exports = router;
