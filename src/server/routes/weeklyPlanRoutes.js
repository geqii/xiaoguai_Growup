const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../db/database");

const router = express.Router();

function formatYmdUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeWeekStartYmd(inputYmd) {
  if (!inputYmd || typeof inputYmd !== "string") {
    return null;
  }
  const m = inputYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(y, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const dow = date.getUTCDay(); // 0..6, 0 is Sun
  const diff = (dow + 6) % 7; // Monday => 0
  date.setUTCDate(date.getUTCDate() - diff);
  return formatYmdUTC(date);
}

router.get("/", (req, res) => {
  const weekStart = normalizeWeekStartYmd(req.query.weekStart);
  if (!weekStart) {
    return res.status(400).json({ message: "weekStart 不合法" });
  }
  const stmt = db.prepare(
    "SELECT * FROM weekly_plan_items WHERE week_start_date = ? ORDER BY created_at ASC"
  );
  const rows = stmt.all(weekStart);
  return res.json({ weekStart, items: rows });
});

router.post("/", (req, res) => {
  const weekStart = normalizeWeekStartYmd(req.body.weekStart);
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (!weekStart) {
    return res.status(400).json({ message: "weekStart 不合法" });
  }
  if (!content) {
    return res.status(400).json({ message: "content 为必填项" });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO weekly_plan_items (id, week_start_date, content, is_done, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  stmt.run(id, weekStart, content, 0, now, now);
  return res.status(201).json({ id });
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM weekly_plan_items WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "记录不存在" });
  }

  const content =
    typeof req.body.content === "string" ? req.body.content.trim() : String(existing.content || "");
  if (!content) {
    return res.status(400).json({ message: "content 为必填项" });
  }

  let isDone = existing.is_done ? 1 : 0;
  if (typeof req.body.is_done === "boolean") {
    isDone = req.body.is_done ? 1 : 0;
  } else if (req.body.is_done === 0 || req.body.is_done === 1) {
    isDone = req.body.is_done;
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(
    "UPDATE weekly_plan_items SET content = ?, is_done = ?, updated_at = ? WHERE id = ?"
  );
  stmt.run(content, isDone, now, req.params.id);
  return res.json({ id: req.params.id });
});

router.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM weekly_plan_items WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "记录不存在" });
  }
  db.prepare("DELETE FROM weekly_plan_items WHERE id = ?").run(req.params.id);
  return res.json({ id: req.params.id });
});

module.exports = router;
