process.env.NODE_ENV = "test";
process.env.MISTAKE_DB_PATH = ":memory:";

const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../src/server/app");
const { initSchema } = require("../src/server/db/schema");
const db = require("../src/server/db/database");
const { ensurePointsSeed } = require("../src/server/services/pointsSeed");

function createTestPng(filePath) {
  const onePixelPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0QAAAABJRU5ErkJggg==";
  fs.writeFileSync(filePath, Buffer.from(onePixelPngBase64, "base64"));
}

describe("错题 API", () => {
  beforeAll(() => {
    initSchema();
    process.env.USE_FAKE_OCR = "true";
  });

  beforeEach(() => {
    db.prepare("DELETE FROM mistakes").run();
    db.prepare("DELETE FROM weekly_plan_items").run();
    db.prepare("DELETE FROM semester_goals").run();
    db.prepare("DELETE FROM point_events").run();
    db.prepare("DELETE FROM daily_checkins").run();
    db.prepare("DELETE FROM point_items").run();
  });

  it("应创建并筛选错题", async () => {
    const resCreate = await request(app).post("/api/mistakes").field("subject", "数学").field("error_type", "计算问题")
      .field("question_text", "1+1=3")
      .field("analysis", "粗心")
      .field("solution_idea", "重新计算")
      .field("source_name", "单元测验")
      .field("source_date", "2026-05-10")
      .field("source_question_no", "第3题");

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.id).toBeTruthy();

    const resList = await request(app).get("/api/mistakes").query({ subject: "数学", errorType: "计算问题" });
    expect(resList.status).toBe(200);
    expect(resList.body.length).toBe(1);
  });

  it("应返回学科错误类型映射", async () => {
    const res = await request(app).get("/api/meta/error-types");
    expect(res.status).toBe(200);
    expect(res.body.subjects).toContain("语文");
    expect(res.body.errorTypesBySubject.英语).toContain("语法");
  });

  it("应导出指定学科 Word", async () => {
    const tempImage = path.join(process.cwd(), "test", "temp-export.png");
    createTestPng(tempImage);

    await request(app).post("/api/mistakes").field("subject", "语文").field("error_type", "基础")
      .field("question_text", "词语填空")
      .field("analysis", "基础不扎实")
      .field("solution_idea", "整理词语表")
      .field("source_name", "语文作业")
      .field("source_date", "2026-05-10")
      .field("source_question_no", "第5题")
      .attach("image", tempImage);

    const res = await request(app).post("/api/export/word").send({ subject: "语文" });
    expect(res.status).toBe(200);
    expect(fs.existsSync(res.body.filePath)).toBe(true);
  });

  it("应支持编辑错题并替换图片", async () => {
    const imageA = path.join(process.cwd(), "test", "temp-edit-a.png");
    const imageB = path.join(process.cwd(), "test", "temp-edit-b.png");
    createTestPng(imageA);
    createTestPng(imageB);

    const createRes = await request(app).post("/api/mistakes").field("subject", "英语").field("error_type", "语法")
      .field("question_text", "He go to school.")
      .field("analysis", "时态错误")
      .field("solution_idea", "改为goes")
      .field("source_name", "英语作业")
      .field("source_date", "2026-05-10")
      .field("source_question_no", "第2题")
      .attach("image", imageA);

    const itemBefore = await request(app).get(`/api/mistakes/${createRes.body.id}`);
    const oldImagePath = itemBefore.body.image_path;
    expect(fs.existsSync(oldImagePath)).toBe(true);

    const updateRes = await request(app).put(`/api/mistakes/${createRes.body.id}`).field("subject", "英语").field("error_type", "语法")
      .field("question_text", "He goes to school.")
      .field("analysis", "三单错误")
      .field("solution_idea", "主语是He用goes")
      .field("source_name", "英语周测")
      .field("source_date", "2026-05-11")
      .field("source_question_no", "第2题")
      .attach("image", imageB);

    expect(updateRes.status).toBe(200);
    const itemAfter = await request(app).get(`/api/mistakes/${createRes.body.id}`);
    expect(itemAfter.body.question_text).toBe("He goes to school.");
    expect(itemAfter.body.image_path).not.toBe(oldImagePath);
    expect(fs.existsSync(itemAfter.body.image_path)).toBe(true);
    expect(fs.existsSync(oldImagePath)).toBe(false);
  });

  it("应执行 OCR 接口并返回文本", async () => {
    const tempImage = path.join(process.cwd(), "test", "temp-ocr.txt");
    fs.writeFileSync(tempImage, "fake image content");

    const res = await request(app).post("/api/ocr").attach("image", tempImage);
    expect(res.status).toBe(200);
    expect(res.body.text).toBe("模拟OCR文本");
  });
});

describe("周计划 API", () => {
  beforeAll(() => {
    initSchema();
  });

  beforeEach(() => {
    db.prepare("DELETE FROM weekly_plan_items").run();
  });

  it("应按周创建/查询/更新/删除计划项", async () => {
    const createRes = await request(app).post("/api/weekly-plans").send({ weekStart: "2026-05-14", content: "每天20分钟英语听力" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeTruthy();

    const listRes = await request(app).get("/api/weekly-plans").query({ weekStart: "2026-05-11" });
    expect(listRes.status).toBe(200);
    expect(listRes.body.weekStart).toBe("2026-05-11");
    expect(listRes.body.items.length).toBe(1);
    expect(listRes.body.items[0].content).toBe("每天20分钟英语听力");

    const id = listRes.body.items[0].id;
    const updateRes = await request(app).put(`/api/weekly-plans/${id}`).send({ is_done: true, content: "每天20分钟英语听力（完成）" });
    expect(updateRes.status).toBe(200);

    const listRes2 = await request(app).get("/api/weekly-plans").query({ weekStart: "2026-05-11" });
    expect(listRes2.body.items[0].is_done).toBe(1);
    expect(listRes2.body.items[0].content).toBe("每天20分钟英语听力（完成）");

    const delRes = await request(app).delete(`/api/weekly-plans/${id}`);
    expect(delRes.status).toBe(200);

    const listRes3 = await request(app).get("/api/weekly-plans").query({ weekStart: "2026-05-11" });
    expect(listRes3.body.items.length).toBe(0);
  });
});

describe("学期目标 API", () => {
  beforeAll(() => {
    initSchema();
  });

  beforeEach(() => {
    db.prepare("DELETE FROM semester_goals").run();
  });

  it("应创建并更新学期目标", async () => {
    const createRes = await request(app)
      .post("/api/semester-goals")
      .send({ semester_name: "2026春", chinese_target: 90, math_target: 95, english_target: 95 });
    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeTruthy();

    const listRes = await request(app).get("/api/semester-goals");
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBe(1);
    expect(listRes.body.items[0].semester_name).toBe("2026春");

    const updateRes = await request(app).put("/api/semester-goals/2026春").send({ math_target: 96 });
    expect(updateRes.status).toBe(200);

    const getRes = await request(app).get("/api/semester-goals/2026春");
    expect(getRes.status).toBe(200);
    expect(getRes.body.math_target).toBe(96);
  });

  it("学期名重复应返回400", async () => {
    await request(app)
      .post("/api/semester-goals")
      .send({ semester_name: "2026春", chinese_target: 90, math_target: 95, english_target: 95 });
    const res = await request(app)
      .post("/api/semester-goals")
      .send({ semester_name: "2026春", chinese_target: 90, math_target: 95, english_target: 95 });
    expect(res.status).toBe(400);
  });
});

describe("积分 API", () => {
  beforeAll(() => {
    initSchema();
  });

  beforeEach(() => {
    db.prepare("DELETE FROM point_events").run();
    db.prepare("DELETE FROM daily_checkins").run();
    db.prepare("DELETE FROM point_items").run();
    ensurePointsSeed();
  });

  it("应返回默认积分条目", async () => {
    const res = await request(app).get("/api/points/items");
    expect(res.status).toBe(200);
    const codes = res.body.items.map((x) => x.code);
    expect(codes).toContain("daily_chinese");
    expect(codes).toContain("exam_score");
    expect(codes).toContain("adjust_manual");
  });

  it("应保存日打卡并写入明细", async () => {
    const date = "2026-05-17";
    const putRes = await request(app)
      .put(`/api/points/daily?date=${date}`)
      .send({
        chinese_done: true,
        math_done: true,
        english_done: false,
        sleep_done: true,
      });
    expect(putRes.status).toBe(200);

    const listRes = await request(app).get("/api/points/events").query({ from: date, to: date, page: 1, pageSize: 20 });
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBeGreaterThan(0);
    expect(listRes.body.summary.totalPoints).toBe(1 + 1 + 0 + 1);
  });

  it("应按规则计算考试积分（期中×2）", async () => {
    const date = "2026-05-17";
    const res = await request(app).post("/api/points/exams").send({
      date,
      subject: "数学",
      score: 96,
      exam_type: "midterm",
      note: "期中数学",
    });
    expect(res.status).toBe(201);
    expect(res.body.calculated_points).toBe(100);
    expect(res.body.final_points).toBe(100);
  });

  it("应支持独立加/扣分事件，并在总积分中体现", async () => {
    const date = "2026-05-17";
    await request(app)
      .put(`/api/points/daily?date=${date}`)
      .send({ chinese_done: true, math_done: false, english_done: false, sleep_done: false });

    const addRes = await request(app).post("/api/points/events").send({
      date,
      item_code: "adjust_manual",
      points_delta: 5,
      note: "主动复盘",
    });
    expect(addRes.status).toBe(201);

    const totalRes = await request(app).get("/api/points/total");
    expect(totalRes.status).toBe(200);
    expect(totalRes.body.totalPoints).toBe(1 + 5);
  });
});
