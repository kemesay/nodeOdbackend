const fs = require("fs");
const path = require("path");

async function upload(file) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now(); // Get current timestamp
    const uploadPath = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      `${timestamp}-${file.originalname}`
    );
    const stream = fs.createWriteStream(uploadPath);
    file.stream.pipe(stream);
    stream.on("error", (error) => {
      reject(error);
    });
    stream.on("finish", () => {
      resolve(uploadPath);
    });
  });
}

module.exports = { upload };
