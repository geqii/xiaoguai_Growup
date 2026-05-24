const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../db/database");

const router = express.Router();

function isYmd(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseIntOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && Number.isInteger(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseIntStrict(value) {
  const v = parseIntOrNull(value);
  return v === null ? null : v;
}

function getPointItem(code) {
  return db.prepare("SELECT * FROM point_items WHERE code = ?").get(code);
}

function upsertEvent({ id, occurred_date, category, item_code, points_delta, note, meta_json }) {
  const existing = db.prepare("SELECT id FROM point_events WHERE id = ?").get(id);
  const now = new Date().toISOString();
  if (existing) {
    db.prepare(
      "UPDATE point_events SET occurred_date = ?, category = ?, item_code = ?, points_delta = ?, note = ?, meta_json = ? WHERE id = ?"
    ).run(occurred_date, category, item_code, points_delta, note || null, meta_json || null, id);
    return;
  }
  db.prepare(
    "INSERT INTO point_events (id, occurred_date, category, item_code, points_delta, note, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, occurred_date, category, item_code, points_delta, note || null, meta_json || null, now);
}

router.get("/items", (req, res) => {
  const rows = db.prepare("SELECT * FROM point_items ORDER BY category ASC, created_at ASC").all();
  return res.json({ items: rows });
});

router.post("/items", (req, res) => {
  const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const category = typeof req.body.category === "string" ? req.body.category.trim() : "";
  const kind = typeof req.body.kind === "string" ? req.body.kind.trim() : "";
  const defaultPoints = parseIntOrNull(req.body.default_points);
  const minPoints = parseIntOrNull(req.body.min_points);
  const maxPoints = parseIntOrNull(req.body.max_points);
  const isActive = req.body.is_active === 0 || req.body.is_active === 1 ? req.body.is_active : 1;

  if (!code || !/^[a-z0-9_]+$/.test(code)) {
    return res.status(400).json({ message: "code 不合法（建议使用小写字母/数字/下划线）" });
  }
  if (!name) {
    return res.status(400).json({ message: "name 为必填项" });
  }
  if (!["daily", "weekly", "exam", "other"].includes(category)) {
    return res.status(400).json({ message: "category 不合法" });
  }
  if (!["fixed", "manual"].includes(kind)) {
    return res.status(400).json({ message: "kind 仅支持 fixed/manual（考试规则请在系统内置条目中编辑）" });
  }
  if (kind === "fixed" && defaultPoints === null) {
    return res.status(400).json({ message: "fixed 类型需要 default_points" });
  }
  if (minPoints !== null && maxPoints !== null && minPoints > maxPoints) {
    return res.status(400).json({ message: "min_points 不能大于 max_points" });
  }
  const existing = getPointItem(code);
  if (existing) {
    return res.status(400).json({ message: "code 已存在" });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO point_items
      (id, code, name, category, kind, default_points, min_points, max_points, config_json, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, code, name, category, kind, defaultPoints, minPoints, maxPoints, null, isActive, now, now);

  return res.status(201).json({ id });
});

router.put("/items/:code", (req, res) => {
  const existing = getPointItem(req.params.code);
  if (!existing) {
    return res.status(404).json({ message: "记录不存在" });
  }

  const name = typeof req.body.name === "string" ? req.body.name.trim() : existing.name;
  const isActive = req.body.is_active === 0 || req.body.is_active === 1 ? req.body.is_active : existing.is_active;

  const defaultPoints =
    req.body.default_points === undefined ? existing.default_points : parseIntOrNull(req.body.default_points);
  const minPoints = req.body.min_points === undefined ? existing.min_points : parseIntOrNull(req.body.min_points);
  const maxPoints = req.body.max_points === undefined ? existing.max_points : parseIntOrNull(req.body.max_points);

  let configJson = existing.config_json;
  if (req.body.config_json !== undefined) {
    configJson = typeof req.body.config_json === "string" ? req.body.config_json : JSON.stringify(req.body.config_json);
    try {
      if (configJson) {
        JSON.parse(configJson);
      }
    } catch (error) {
      return res.status(400).json({ message: "config_json 不是合法JSON" });
    }
  }

  if (!name) {
    return res.status(400).json({ message: "name 为必填项" });
  }
  if (existing.kind === "fixed" && defaultPoints === null) {
    return res.status(400).json({ message: "fixed 类型需要 default_points" });
  }
  if (minPoints !== null && maxPoints !== null && minPoints > maxPoints) {
    return res.status(400).json({ message: "min_points 不能大于 max_points" });
  }

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE point_items SET name = ?, default_points = ?, min_points = ?, max_points = ?, config_json = ?, is_active = ?, updated_at = ? WHERE code = ?"
  ).run(name, defaultPoints, minPoints, maxPoints, configJson, isActive, now, req.params.code);

  return res.json({ code: req.params.code });
});

router.get("/total", (req, res) => {
  const totalRow = db.prepare("SELECT COALESCE(SUM(points_delta), 0) as total FROM point_events").get();
  const byCategoryRows = db
    .prepare(
      `SELECT category, COALESCE(SUM(points_delta), 0) as total
       FROM point_events
       GROUP BY category`
    )
    .all();
  const byCategory = {};
  for (const r of byCategoryRows) {
    byCategory[r.category] = r.total;
  }
  return res.json({
    totalPoints: totalRow?.total || 0,
    byCategory,
  });
});

router.get("/daily", (req, res) => {
  const date = req.query.date;
  if (!isYmd(date)) {
    return res.status(400).json({ message: "date 不合法" });
  }

  const checkin =
    db.prepare("SELECT * FROM daily_checkins WHERE date = ?").get(date) || {
      date,
      chinese_done: 0,
      math_done: 0,
      english_done: 0,
      sleep_done: 0,
      parent_note: "",
      parent_points_delta: 0,
    };

  const pChinese = getPointItem("daily_chinese")?.default_points ?? 1;
  const pMath = getPointItem("daily_math")?.default_points ?? 1;
  const pEnglish = getPointItem("daily_english")?.default_points ?? 1;
  const pSleep = getPointItem("daily_sleep")?.default_points ?? 1;

  const basePoints =
    (checkin.chinese_done ? pChinese : 0) +
    (checkin.math_done ? pMath : 0) +
    (checkin.english_done ? pEnglish : 0) +
    (checkin.sleep_done ? pSleep : 0);

  return res.json({
    date,
    checkin,
    summary: {
      basePoints,
      totalPoints: basePoints,
    },
    scheduleHint: {
      wakeup_weekday: "06:40",
      bedtime_sun_to_thu: "21:30",
      bedtime_fri_to_sat: "22:00",
    },
  });
});

router.put("/daily", (req, res) => {
  const date = req.query.date;
  if (!isYmd(date)) {
    return res.status(400).json({ message: "date 不合法" });
  }

  const chineseDone = req.body.chinese_done ? 1 : 0;
  const mathDone = req.body.math_done ? 1 : 0;
  const englishDone = req.body.english_done ? 1 : 0;
  const sleepDone = req.body.sleep_done ? 1 : 0;

  const now = new Date().toISOString();
  const existing = db.prepare("SELECT date FROM daily_checkins WHERE date = ?").get(date);
  if (existing) {
    db.prepare(
      "UPDATE daily_checkins SET chinese_done = ?, math_done = ?, english_done = ?, sleep_done = ?, updated_at = ? WHERE date = ?"
    ).run(chineseDone, mathDone, englishDone, sleepDone, now, date);
  } else {
    db.prepare(
      "INSERT INTO daily_checkins (date, chinese_done, math_done, english_done, sleep_done, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(date, chineseDone, mathDone, englishDone, sleepDone, now, now);
  }

  const pChinese = getPointItem("daily_chinese")?.default_points ?? 1;
  const pMath = getPointItem("daily_math")?.default_points ?? 1;
  const pEnglish = getPointItem("daily_english")?.default_points ?? 1;
  const pSleep = getPointItem("daily_sleep")?.default_points ?? 1;

  db.transaction(() => {
    upsertEvent({
      id: `daily:${date}:daily_chinese`,
      occurred_date: date,
      category: "daily",
      item_code: "daily_chinese",
      points_delta: chineseDone ? pChinese : 0,
      note: null,
      meta_json: null,
    });
    upsertEvent({
      id: `daily:${date}:daily_math`,
      occurred_date: date,
      category: "daily",
      item_code: "daily_math",
      points_delta: mathDone ? pMath : 0,
      note: null,
      meta_json: null,
    });
    upsertEvent({
      id: `daily:${date}:daily_english`,
      occurred_date: date,
      category: "daily",
      item_code: "daily_english",
      points_delta: englishDone ? pEnglish : 0,
      note: null,
      meta_json: null,
    });
    upsertEvent({
      id: `daily:${date}:daily_sleep`,
      occurred_date: date,
      category: "daily",
      item_code: "daily_sleep",
      points_delta: sleepDone ? pSleep : 0,
      note: null,
      meta_json: null,
    });
  })();

  return res.json({ date });
});

function getExamConfig() {
  const item = getPointItem("exam_score");
  if (!item?.config_json) {
    return null;
  }
  try {
    return JSON.parse(item.config_json);
  } catch (error) {
    return null;
  }
}

function calcExamBasePoints(config, variantKey, score) {
  const brackets = config?.variants?.[variantKey] || config?.variants?.common || [];
  for (const b of brackets) {
    if (score >= b.min && score < b.max) {
      return b.points;
    }
  }
  return 0;
}

router.post("/exams", (req, res) => {
  const date = req.body.date;
  const subject = typeof req.body.subject === "string" ? req.body.subject.trim() : "";
  const score = parseIntStrict(req.body.score);
  const examType = typeof req.body.exam_type === "string" ? req.body.exam_type.trim() : "";
  const hasEssay = !!req.body.chinese_has_essay;
  const note = typeof req.body.note === "string" ? req.body.note : "";
  const overridePoints = req.body.override_points === undefined ? null : parseIntStrict(req.body.override_points);

  if (!isYmd(date)) {
    return res.status(400).json({ message: "date 不合法" });
  }
  if (!["语文", "数学", "英语"].includes(subject)) {
    return res.status(400).json({ message: "subject 不合法" });
  }
  if (score === null || score < 0 || score > 100) {
    return res.status(400).json({ message: "score 不合法（0~100整数）" });
  }
  if (!["unit_test", "midterm", "final"].includes(examType)) {
    return res.status(400).json({ message: "exam_type 不合法" });
  }

  const config = getExamConfig();
  if (!config) {
    return res.status(500).json({ message: "考试规则未配置" });
  }

  const variantKey = subject === "语文" && hasEssay ? "chinese_with_essay" : "common";
  const base = calcExamBasePoints(config, variantKey, score);
  const multiplier = config?.multipliers?.[examType] ?? 1;
  const calculated = base * multiplier;
  const finalPoints = overridePoints === null ? calculated : overridePoints;

  const id = randomUUID();
  const meta = {
    subject,
    score,
    chinese_has_essay: hasEssay,
    exam_type: examType,
    base_points: base,
    multiplier,
    calculated_points: calculated,
    override_points: overridePoints,
  };
  upsertEvent({
    id,
    occurred_date: date,
    category: "exam",
    item_code: "exam_score",
    points_delta: finalPoints,
    note: note || null,
    meta_json: JSON.stringify(meta),
  });

  return res.status(201).json({ id, calculated_points: calculated, final_points: finalPoints });
});

router.post("/events", (req, res) => {
  const date = req.body.date;
  const itemCode = typeof req.body.item_code === "string" ? req.body.item_code.trim() : "";
  const pointsDelta = parseIntStrict(req.body.points_delta);
  const note = typeof req.body.note === "string" ? req.body.note : "";

  if (!isYmd(date)) {
    return res.status(400).json({ message: "date 不合法" });
  }
  if (!itemCode) {
    return res.status(400).json({ message: "item_code 为必填项" });
  }
  if (pointsDelta === null) {
    return res.status(400).json({ message: "points_delta 为必填整数" });
  }

  const item = getPointItem(itemCode);
  if (!item) {
    return res.status(400).json({ message: "item_code 不存在" });
  }

  if (item.kind === "manual") {
    if (item.min_points !== null && pointsDelta < item.min_points) {
      return res.status(400).json({ message: "积分低于最小值" });
    }
    if (item.max_points !== null && pointsDelta > item.max_points) {
      return res.status(400).json({ message: "积分高于最大值" });
    }
  }

  const id = randomUUID();
  upsertEvent({
    id,
    occurred_date: date,
    category: item.category,
    item_code: itemCode,
    points_delta: pointsDelta,
    note: note || null,
    meta_json: null,
  });

  return res.status(201).json({ id });
});

router.get("/events", (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const page = Math.max(1, parseIntOrNull(req.query.page) || 1);
  const pageSize = Math.max(1, Math.min(200, parseIntOrNull(req.query.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  if (!isYmd(from) || !isYmd(to)) {
    return res.status(400).json({ message: "from/to 不合法" });
  }

  const filters = ["occurred_date >= ?", "occurred_date <= ?"];
  const values = [from, to];
  if (category) {
    filters.push("category = ?");
    values.push(category);
  }
  const where = `WHERE ${filters.join(" AND ")}`;

  const countRow = db.prepare(`SELECT COUNT(1) as cnt FROM point_events ${where}`).get(...values);
  const totalCount = countRow?.cnt || 0;

  const items = db
    .prepare(
      `SELECT * FROM point_events ${where}
       ORDER BY occurred_date DESC, created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...values, pageSize, offset);

  const totalRow = db.prepare(`SELECT COALESCE(SUM(points_delta), 0) as total FROM point_events ${where}`).get(...values);
  const byCategoryRows = db
    .prepare(
      `SELECT category, COALESCE(SUM(points_delta), 0) as total
       FROM point_events ${where}
       GROUP BY category`
    )
    .all(...values);
  const byCategory = {};
  for (const r of byCategoryRows) {
    byCategory[r.category] = r.total;
  }

  return res.json({
    items,
    page,
    pageSize,
    totalCount,
    summary: {
      totalPoints: totalRow?.total || 0,
      byCategory,
    },
  });
});

module.exports = router;
