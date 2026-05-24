const fs = require("fs");
const path = require("path");
const db = require("../db/database");

const BACKUP_DIR = process.env.MISTAKE_BACKUP_DIR || path.join(process.cwd(), "backups");

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function escapeSqliteString(value) {
  return String(value).replace(/'/g, "''");
}

function formatBackupStamp(date = new Date()) {
  const iso = date.toISOString().replace(/\.\d{3}Z$/, "Z");
  return iso.replace(/[:T]/g, "-").replace(/Z$/, "");
}

function toBackupItem(fileName) {
  const filePath = path.join(BACKUP_DIR, fileName);
  const stat = fs.statSync(filePath);
  return {
    fileName,
    filePath,
    sizeBytes: stat.size,
    updatedAt: stat.mtime.toISOString(),
  };
}

function listBackups() {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith(".db"))
    .sort((a, b) => fs.statSync(path.join(BACKUP_DIR, b)).mtimeMs - fs.statSync(path.join(BACKUP_DIR, a)).mtimeMs)
    .map((fileName) => toBackupItem(fileName));
}

function assertFileDatabase() {
  if (!db.isFileDatabase()) {
    throw new Error("当前运行在内存数据库模式，暂不支持恢复到持久化数据库文件。");
  }
}

function createBackupSnapshot() {
  assertFileDatabase();
  ensureBackupDir();
  db.checkpointDatabase("RESTART");

  const fileName = `mistakes-backup-${formatBackupStamp()}.db`;
  const filePath = path.join(BACKUP_DIR, fileName);
  const escapedTarget = escapeSqliteString(filePath);

  db.exec(`VACUUM INTO '${escapedTarget}'`);
  return toBackupItem(fileName);
}

function resolveBackupPath(fileName) {
  if (typeof fileName !== "string" || !fileName.trim()) {
    throw new Error("备份文件名不能为空");
  }
  const safeName = path.basename(fileName.trim());
  if (safeName !== fileName.trim() || !safeName.endsWith(".db")) {
    throw new Error("备份文件名不合法");
  }
  const filePath = path.join(BACKUP_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    throw new Error("备份文件不存在");
  }
  return { fileName: safeName, filePath };
}

function safeUnlink(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Ignore cleanup failures to avoid masking the main restore error.
  }
}

function restoreBackupSnapshot(fileName) {
  assertFileDatabase();
  ensureBackupDir();

  const { fileName: safeName, filePath } = resolveBackupPath(fileName);
  const dbPath = db.getDbPath();
  const tempRestorePath = `${dbPath}.restore-${Date.now()}`;
  let reopened = false;

  db.closeDatabase();
  try {
    safeUnlink(`${dbPath}-shm`);
    safeUnlink(`${dbPath}-wal`);
    fs.copyFileSync(filePath, tempRestorePath);
    fs.renameSync(tempRestorePath, dbPath);
    db.reopenDatabase();
    reopened = true;
    return {
      fileName: safeName,
      filePath,
      restoredTo: dbPath,
    };
  } finally {
    safeUnlink(tempRestorePath);
    if (!reopened) {
      db.reopenDatabase();
    }
  }
}

module.exports = {
  BACKUP_DIR,
  createBackupSnapshot,
  listBackups,
  restoreBackupSnapshot,
};
