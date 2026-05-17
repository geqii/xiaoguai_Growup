const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const mistakeRoutes = require("./routes/mistakeRoutes");
const ocrRoutes = require("./routes/ocrRoutes");
const exportRoutes = require("./routes/exportRoutes");
const metaRoutes = require("./routes/metaRoutes");
const weeklyPlanRoutes = require("./routes/weeklyPlanRoutes");
const semesterGoalRoutes = require("./routes/semesterGoalRoutes");
const pointsRoutes = require("./routes/pointsRoutes");

const app = express();
const logDir = path.join(process.cwd(), "logs");
fs.mkdirSync(logDir, { recursive: true });

const accessLogStream = fs.createWriteStream(path.join(logDir, "access.log"), { flags: "a" });
const errorLogPath = path.join(logDir, "error.log");

app.use(cors());
app.use(express.json());
app.use(morgan("combined", { stream: accessLogStream }));
app.use("/uploads", express.static(path.join(process.cwd(), "src", "uploads")));

app.use("/api/mistakes", mistakeRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/weekly-plans", weeklyPlanRoutes);
app.use("/api/semester-goals", semesterGoalRoutes);
app.use("/api/points", pointsRoutes);

const distDir = path.join(process.cwd(), "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("/", (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.status(200).send("后端服务运行中。请访问前端开发地址：http://localhost:5174");
  });
}

app.use((err, req, res, next) => {
  fs.appendFileSync(errorLogPath, `[${new Date().toISOString()}] ${err.stack}\n`);
  res.status(500).json({ message: "服务器内部错误" });
});

module.exports = app;
