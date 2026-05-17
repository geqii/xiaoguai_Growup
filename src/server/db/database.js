const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DEFAULT_DB_PATH = path.join(__dirname, "mistakes.db");
const DB_PATH =
  process.env.MISTAKE_DB_PATH ||
  (process.env.NODE_ENV === "test" || process.env.VITEST ? ":memory:" : DEFAULT_DB_PATH);

if (DB_PATH !== ":memory:") {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
if (DB_PATH !== ":memory:") {
  db.pragma("journal_mode = WAL");
}

module.exports = db;
