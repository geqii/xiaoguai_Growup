const db = require("./database");
const { SUBJECTS } = require("../../shared/constants");

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mistakes (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL CHECK (subject IN ('${SUBJECTS.join("','")}')),
      error_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      analysis TEXT NOT NULL,
      solution_idea TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_date TEXT NOT NULL,
      source_question_no TEXT NOT NULL,
      image_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mistakes_subject ON mistakes(subject);
    CREATE INDEX IF NOT EXISTS idx_mistakes_error_type ON mistakes(error_type);
    CREATE INDEX IF NOT EXISTS idx_mistakes_source_date ON mistakes(source_date);

    CREATE TABLE IF NOT EXISTS weekly_plan_items (
      id TEXT PRIMARY KEY,
      week_start_date TEXT NOT NULL,
      content TEXT NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_weekly_plan_week_start_date ON weekly_plan_items(week_start_date);

    CREATE TABLE IF NOT EXISTS semester_goals (
      id TEXT PRIMARY KEY,
      semester_name TEXT NOT NULL UNIQUE,
      chinese_target INTEGER NOT NULL,
      math_target INTEGER NOT NULL,
      english_target INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS point_items (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      kind TEXT NOT NULL,
      default_points INTEGER,
      min_points INTEGER,
      max_points INTEGER,
      config_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS point_events (
      id TEXT PRIMARY KEY,
      occurred_date TEXT NOT NULL,
      category TEXT NOT NULL,
      item_code TEXT NOT NULL,
      points_delta INTEGER NOT NULL,
      note TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_point_events_occurred_date ON point_events(occurred_date);
    CREATE INDEX IF NOT EXISTS idx_point_events_category ON point_events(category);
    CREATE INDEX IF NOT EXISTS idx_point_events_item_code ON point_events(item_code);

    CREATE TABLE IF NOT EXISTS daily_checkins (
      date TEXT PRIMARY KEY,
      chinese_done INTEGER NOT NULL DEFAULT 0,
      math_done INTEGER NOT NULL DEFAULT 0,
      english_done INTEGER NOT NULL DEFAULT 0,
      sleep_done INTEGER NOT NULL DEFAULT 0,
      parent_note TEXT,
      parent_points_delta INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phonics_words (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('vowel', 'consonant')),
      word TEXT NOT NULL,
      highlight_text TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_phonics_words_symbol ON phonics_words(symbol);
    CREATE INDEX IF NOT EXISTS idx_phonics_words_category ON phonics_words(category);
  `);
}

module.exports = {
  initSchema,
};
