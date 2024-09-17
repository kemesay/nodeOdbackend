const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const upload = multer({ dest: "./uploads/" });

router.post("/upload", upload.single("image"), (req, res) => {
  const imageFile = req.file;

  if (!imageFile) {
    return res.status(400).send("No file uploaded.");
  }

  const imageUrl = `http://localhost:${process.env.PORT || 3000}/uploads/${
    imageFile.filename
  }`;

  console.log("Image URL:", imageUrl);
  res.send({ imageUrl });
});

module.exports = router;
