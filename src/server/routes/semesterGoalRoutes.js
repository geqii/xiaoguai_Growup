const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../db/database");

const router = express.Router();

function parseScore(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && Number.isInteger(Number(value))) {
    return Number(value);
  }
  return null;
}

function validateScore(score) {
  return score !== null && score >= 0 && score <= 100;
}

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      "SELECT semester_name, chinese_target, math_target, english_target, updated_at, created_at FROM semester_goals ORDER BY created_at DESC"
    )
    .all();
  return res.json({ items: rows });
});

router.get("/:semesterName", (req, res) => {
  const row = db
    .prepare(
      "SELECT semester_name, chinese_target, math_target, english_target, updated_at, created_at FROM semester_goals WHERE semester_name = ?"
    )
    .get(req.params.semesterName);
  if (!row) {
    return res.status(404).json({ message: "记录不存在" });
  }
  return res.json(row);
});

router.post("/", (req, res) => {
  const semesterName = typeof req.body.semester_name === "string" ? req.body.semester_name.trim() : "";
  const chinese = parseScore(req.body.chinese_target);
  const math = parseScore(req.body.math_target);
  const english = parseScore(req.body.english_target);

  if (!semesterName) {
    return res.status(400).json({ message: "semester_name 为必填项" });
  }
  if (!validateScore(chinese) || !validateScore(math) || !validateScore(english)) {
    return res.status(400).json({ message: "目标分数需为0~100的整数" });
  }

  const existing = db.prepare("SELECT id FROM semester_goals WHERE semester_name = ?").get(semesterName);
  if (existing) {
    return res.status(400).json({ message: "该学期已存在" });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO semester_goals
      (id, semester_name, chinese_target, math_target, english_target, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, semesterName, chinese, math, english, now, now);

  return res.status(201).json({ id });
});

router.put("/:semesterName", (req, res) => {
  const row = db.prepare("SELECT * FROM semester_goals WHERE semester_name = ?").get(req.params.semesterName);
  if (!row) {
    return res.status(404).json({ message: "记录不存在" });
  }

  const chinese = req.body.chinese_target === undefined ? row.chinese_target : parseScore(req.body.chinese_target);
  const math = req.body.math_target === undefined ? row.math_target : parseScore(req.body.math_target);
  const english = req.body.english_target === undefined ? row.english_target : parseScore(req.body.english_target);

  if (!validateScore(chinese) || !validateScore(math) || !validateScore(english)) {
    return res.status(400).json({ message: "目标分数需为0~100的整数" });
  }

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE semester_goals SET chinese_target = ?, math_target = ?, english_target = ?, updated_at = ? WHERE semester_name = ?"
  ).run(chinese, math, english, now, req.params.semesterName);

  return res.json({ semester_name: req.params.semesterName });
});

module.exports = router;
