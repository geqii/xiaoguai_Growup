const fs = require("fs");
const path = require("path");
const { dimensions } = require("image-size");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } = require("docx");

const MAX_IMAGE_WIDTH = 520;

function createImageParagraph(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return new Paragraph("图片：无");
  }

  try {
    const imageData = fs.readFileSync(imagePath);
    const meta = dimensions(imageData);
    const width = meta?.width || MAX_IMAGE_WIDTH;
    const height = meta?.height || 320;
    const scaledWidth = Math.min(width, MAX_IMAGE_WIDTH);
    const scaledHeight = Math.max(1, Math.round((height * scaledWidth) / width));

    return new Paragraph({
      children: [
        new ImageRun({
          data: imageData,
          transformation: {
            width: scaledWidth,
            height: scaledHeight,
          },
        }),
      ],
    });
  } catch (error) {
    return new Paragraph(`图片读取失败：${imagePath}`);
  }
}

async function exportSubjectToWord(subject, mistakes) {
  const outputDir = path.join(process.cwd(), "src", "exports", subject);
  fs.mkdirSync(outputDir, { recursive: true });

  const children = [
    new Paragraph({
      text: `${subject}错题汇总`,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [new TextRun(`导出时间：${new Date().toLocaleString("zh-CN")}`)],
    }),
  ];

  mistakes.forEach((item, index) => {
    children.push(
      new Paragraph({
        text: `第${index + 1}题`,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph(`来源：${item.source_name} | 日期：${item.source_date} | 题号：${item.source_question_no}`),
      new Paragraph(`错误类型：${item.error_type}`),
      new Paragraph(`题目文本：${item.question_text}`),
      new Paragraph(`解题思路：${item.solution_idea}`),
      new Paragraph(`错误原因分析：${item.analysis}`),
      createImageParagraph(item.image_path)
    );
  });

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(outputDir, `${subject}-错题汇总.docx`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = {
  exportSubjectToWord,
};
