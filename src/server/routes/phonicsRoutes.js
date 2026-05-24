const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../db/database");
const { VOWELS, CONSONANTS, PHONICS_BY_SYMBOL } = require("../../shared/phonicsCatalog");

const router = express.Router();

function withCustomWords(items, rowsBySymbol) {
  return items.map((item) => ({
    ...item,
    customWords: rowsBySymbol[item.symbol] || [],
  }));
}

function buildCatalogResponse() {
  const rows = db
    .prepare(
      `SELECT id, symbol, category, word, highlight_text, note, created_at, updated_at
       FROM phonics_words
       ORDER BY created_at DESC`
    )
    .all();

  const rowsBySymbol = {};
  for (const row of rows) {
    if (!rowsBySymbol[row.symbol]) {
      rowsBySymbol[row.symbol] = [];
    }
    rowsBySymbol[row.symbol].push(row);
  }

  return {
    vowels: withCustomWords(VOWELS, rowsBySymbol),
    consonants: withCustomWords(CONSONANTS, rowsBySymbol),
  };
}

router.get("/catalog", (req, res) => {
  return res.json(buildCatalogResponse());
});

router.post("/words", (req, res) => {
  const symbol = typeof req.body.symbol === "string" ? req.body.symbol.trim() : "";
  const category = typeof req.body.category === "string" ? req.body.category.trim() : "";
  const word = typeof req.body.word === "string" ? req.body.word.trim() : "";
  const highlightText = typeof req.body.highlight_text === "string" ? req.body.highlight_text.trim() : "";
  const note = typeof req.body.note === "string" ? req.body.note.trim() : "";

  if (!symbol || !PHONICS_BY_SYMBOL[symbol]) {
    return res.status(400).json({ message: "symbol 不合法" });
  }
  if (!["vowel", "consonant"].includes(category)) {
    return res.status(400).json({ message: "category 不合法" });
  }
  if (PHONICS_BY_SYMBOL[symbol].category !== category) {
    return res.status(400).json({ message: "symbol 与 category 不匹配" });
  }
  if (!word) {
    return res.status(400).json({ message: "word 为必填项" });
  }

  const duplicate = db
    .prepare("SELECT id FROM phonics_words WHERE symbol = ? AND lower(word) = lower(?)")
    .get(symbol, word);
  if (duplicate) {
    return res.status(400).json({ message: "该音标下已存在相同单词" });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO phonics_words
      (id, symbol, category, word, highlight_text, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, symbol, category, word, highlightText || null, note || null, now, now);

  return res.status(201).json({ id });
});

router.delete("/words/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM phonics_words WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "记录不存在" });
  }

  db.prepare("DELETE FROM phonics_words WHERE id = ?").run(req.params.id);
  return res.json({ id: req.params.id });
});

module.exports = router;
