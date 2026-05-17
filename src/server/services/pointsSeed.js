const db = require("../db/database");
const { v4: uuidv4 } = require("uuid");

function ensurePointsSeed() {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO point_items
      (id, code, name, category, kind, default_points, min_points, max_points, config_json, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const upsertMissing = db.prepare(
    `INSERT INTO point_items
      (id, code, name, category, kind, default_points, min_points, max_points, config_json, is_active, created_at, updated_at)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM point_items WHERE code = ?)`
  );

  const examConfig = {
    multipliers: {
      unit_test: 1,
      midterm: 2,
      final: 3,
    },
    variants: {
      common: [
        { min: 90, max: 95, points: 25 },
        { min: 95, max: 100, points: 50 },
        { min: 100, max: 101, points: 100 },
        { min: 70, max: 80, points: -25 },
        { min: 60, max: 70, points: -50 },
        { min: 0, max: 60, points: -100 },
      ],
      chinese_with_essay: [
        { min: 90, max: 95, points: 30 },
        { min: 95, max: 100, points: 60 },
        { min: 100, max: 101, points: 120 },
        { min: 70, max: 80, points: -30 },
        { min: 60, max: 70, points: -60 },
        { min: 0, max: 60, points: -120 },
      ],
    },
  };

  const items = [
    { code: "daily_chinese", name: "日打卡-语文", category: "daily", kind: "fixed", default_points: 1 },
    { code: "daily_math", name: "日打卡-数学", category: "daily", kind: "fixed", default_points: 1 },
    { code: "daily_english", name: "日打卡-英语", category: "daily", kind: "fixed", default_points: 1 },
    { code: "daily_sleep", name: "日打卡-按时早起早睡", category: "daily", kind: "fixed", default_points: 1 },
    { code: "adjust_manual", name: "加/扣积分（独立）", category: "other", kind: "manual" },
    { code: "weekly_weekend_good", name: "周末完成良好", category: "weekly", kind: "manual", min_points: 0, max_points: 40 },
    { code: "exam_score", name: "考试积分", category: "exam", kind: "exam", config_json: JSON.stringify(examConfig) },
    { code: "other_manual", name: "其他积分事件", category: "other", kind: "manual" },
  ];

  db.transaction(() => {
    const row = db.prepare("SELECT COUNT(1) as cnt FROM point_items").get();
    for (const item of items) {
      const args = [
        uuidv4(),
        item.code,
        item.name,
        item.category,
        item.kind,
        item.default_points ?? null,
        item.min_points ?? null,
        item.max_points ?? null,
        item.config_json ?? null,
        1,
        now,
        now,
        item.code,
      ];
      if ((row?.cnt || 0) > 0) {
        upsertMissing.run(...args);
      } else {
        insert.run(...args.slice(0, 12));
      }
    }
  })();
}

module.exports = {
  ensurePointsSeed,
};
