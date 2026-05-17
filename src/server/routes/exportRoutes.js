const express = require("express");
const db = require("../db/database");
const { SUBJECTS } = require("../../shared/constants");
const { exportSubjectToWord } = require("../services/exportService");

const router = express.Router();

router.post("/word", async (req, res, next) => {
  try {
    const { subject } = req.body;
    if (!SUBJECTS.includes(subject)) {
      return res.status(400).json({ message: "学科不合法" });
    }

    const stmt = db.prepare(
      "SELECT * FROM mistakes WHERE subject = ? ORDER BY source_date DESC, created_at DESC"
    );
    const data = stmt.all(subject);
    const filePath = await exportSubjectToWord(subject, data);
    return res.json({ filePath, total: data.length });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
