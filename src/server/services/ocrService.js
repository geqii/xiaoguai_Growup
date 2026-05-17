const path = require("path");
const { createWorker } = require("tesseract.js");

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("chi_sim+eng");
      return worker;
    })();
  }
  return workerPromise;
}

async function recognizeImage(imagePath) {
  if (process.env.USE_FAKE_OCR === "true") {
    return "模拟OCR文本";
  }

  const worker = await getWorker();
  const { data } = await worker.recognize(path.resolve(imagePath));
  return data?.text?.trim() || "";
}

module.exports = {
  recognizeImage,
};
