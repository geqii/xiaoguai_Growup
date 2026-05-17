const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { recognizeImage } = require("../services/ocrService");

const router = express.Router();

const tempDir = path.join(process.cwd(), "src", "uploads", "temp");
fs.mkdirSync(tempDir, { recursive: true });
const upload = multer({ dest: tempDir });

router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "请上传图片" });
    }
    const text = await recognizeImage(req.file.path);
    return res.json({ text });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
