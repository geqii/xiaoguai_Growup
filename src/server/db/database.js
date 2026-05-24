const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DEFAULT_DB_PATH = path.join(__dirname, "mistakes.db");
const DB_PATH =
  process.env.MISTAKE_DB_PATH ||
  (process.env.NODE_ENV === "test" || process.env.VITEST ? ":memory:" : DEFAULT_DB_PATH);

function isFileDatabase() {
  return DB_PATH !== ":memory:";
}

function ensureDbDir(dbPath) {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
}

function openDatabase(dbPath) {
  ensureDbDir(dbPath);
  const instance = new Database(dbPath);
  if (dbPath !== ":memory:") {
    instance.pragma("journal_mode = WAL");
  }
  return instance;
}

let currentDb = openDatabase(DB_PATH);

function getDb() {
  return currentDb;
}

function getDbPath() {
  return DB_PATH;
}

function checkpointDatabase(mode = "TRUNCATE") {
  if (!isFileDatabase()) {
    return null;
  }
  return currentDb.pragma(`wal_checkpoint(${mode})`);
}

function closeDatabase() {
  if (currentDb?.open) {
    currentDb.close();
  }
}

function reopenDatabase() {
  closeDatabase();
  currentDb = openDatabase(DB_PATH);
  return currentDb;
}

module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop === "getDb") {
        return getDb;
      }
      if (prop === "getDbPath") {
        return getDbPath;
      }
      if (prop === "isFileDatabase") {
        return isFileDatabase;
      }
      if (prop === "checkpointDatabase") {
        return checkpointDatabase;
      }
      if (prop === "closeDatabase") {
        return closeDatabase;
      }
      if (prop === "reopenDatabase") {
        return reopenDatabase;
      }
      const value = currentDb[prop];
      return typeof value === "function" ? value.bind(currentDb) : value;
    },
  }
);
