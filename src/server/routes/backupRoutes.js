const express = require("express");
const db = require("../db/database");
const { initSchema } = require("../db/schema");
const { ensurePointsSeed } = require("../services/pointsSeed");
const {
  BACKUP_DIR,
  createBackupSnapshot,
  listBackups,
  restoreBackupSnapshot,
} = require("../services/backupService");

const router = express.Router();

router.get("/", (req, res) => {
  if (!db.isFileDatabase()) {
    return res.json({
      enabled: false,
      backupDir: BACKUP_DIR,
      items: [],
      message: "当前环境使用内存数据库，已禁用恢复功能。",
    });
  }

  return res.json({
    enabled: true,
    backupDir: BACKUP_DIR,
    dbPath: db.getDbPath(),
    items: listBackups(),
  });
});

router.post("/", (req, res, next) => {
  try {
    const item = createBackupSnapshot();
    return res.status(201).json({
      message: "备份已创建",
      item,
    });
  } catch (error) {
    if (error.message.includes("内存数据库")) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

router.post("/restore", (req, res, next) => {
  try {
    const fileName = typeof req.body.file_name === "string" ? req.body.file_name.trim() : "";
    if (!fileName) {
      return res.status(400).json({ message: "file_name 为必填项" });
    }

    const restored = restoreBackupSnapshot(fileName);
    initSchema();
    ensurePointsSeed();

    return res.json({
      message: "数据库已恢复",
      restored,
    });
  } catch (error) {
    if (error.message.includes("内存数据库") || error.message.includes("备份文件")) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

module.exports = router;
