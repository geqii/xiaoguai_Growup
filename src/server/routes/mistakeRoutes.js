const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const db = require("../db/database");
const { validateMistakePayload } = require("../services/validation");

const router = express.Router();

const tempDir = path.join(process.cwd(), "src", "uploads", "temp");
fs.mkdirSync(tempDir, { recursive: true });
const upload = multer({ dest: tempDir });

function maybeMoveImage(tempPath, subject) {
  if (!tempPath) {
    return null;
  }
  const dateDir = new Date().toISOString().slice(0, 10);
  const targetDir = path.join(process.cwd(), "src", "uploads", subject, dateDir);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, `${uuidv4()}.jpg`);
  fs.renameSync(tempPath, targetPath);
  return targetPath;
}

function safeDeleteFile(filePath) {
  if (!filePath) {
    return;
  }
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Ignore cleanup failures to avoid blocking business flow.
  }
}

router.post("/", upload.single("image"), (req, res) => {
  const payload = req.body;
  const error = validateMistakePayload(payload);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const imagePath = maybeMoveImage(req.file?.path, payload.subject);

  const stmt = db.prepare(`
    INSERT INTO mistakes (
      id, subject, error_type, question_text, analysis, solution_idea,
      source_name, source_date, source_question_no, image_path, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    payload.subject,
    payload.error_type,
    payload.question_text,
    payload.analysis,
    payload.solution_idea,
    payload.source_name,
    payload.source_date,
    payload.source_question_no,
    imagePath,
    now,
    now
  );

  return res.status(201).json({ id });
});

router.get("/", (req, res) => {
  const { subject, errorType, keyword } = req.query;
  const filters = [];
  const values = [];

  if (subject) {
    filters.push("subject = ?");
    values.push(subject);
  }
  if (errorType) {
    filters.push("error_type = ?");
    values.push(errorType);
  }
  if (keyword) {
    filters.push("(question_text LIKE ? OR analysis LIKE ? OR solution_idea LIKE ?)");
    values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const sql = `SELECT * FROM mistakes ${whereClause} ORDER BY created_at DESC`;
  const stmt = db.prepare(sql);
  const rows = stmt.all(...values);
  return res.json(rows);
});

router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM mistakes WHERE id = ?").get(req.params.id);
  if (!row) {
    return res.status(404).json({ message: "记录不存在" });
  }
  return res.json(row);
});

router.put("/:id", upload.single("image"), (req, res) => {
  const existing = db.prepare("SELECT * FROM mistakes WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "记录不存在" });
  }

  const payload = {
    ...existing,
    ...req.body,
  };
  const error = validateMistakePayload(payload);
  if (error) {
    return res.status(400).json({ message: error });
  }

  let imagePath = existing.image_path;
  if (req.file?.path) {
    imagePath = maybeMoveImage(req.file.path, payload.subject);
    safeDeleteFile(existing.image_path);
  }
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE mistakes SET
      subject = ?, error_type = ?, question_text = ?, analysis = ?, solution_idea = ?,
      source_name = ?, source_date = ?, source_question_no = ?, image_path = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    payload.subject,
    payload.error_type,
    payload.question_text,
    payload.analysis,
    payload.solution_idea,
    payload.source_name,
    payload.source_date,
    payload.source_question_no,
    imagePath,
    now,
    req.params.id
  );
  return res.json({ id: req.params.id });
});

module.exports = router;
