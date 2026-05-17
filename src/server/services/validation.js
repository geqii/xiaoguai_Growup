const { SUBJECTS, ERROR_TYPES_BY_SUBJECT } = require("../../shared/constants");

function validateMistakePayload(payload) {
  const requiredFields = [
    "subject",
    "error_type",
    "question_text",
    "analysis",
    "solution_idea",
    "source_name",
    "source_date",
    "source_question_no",
  ];

  for (const field of requiredFields) {
    if (!payload[field] || String(payload[field]).trim() === "") {
      return `${field} 为必填项`;
    }
  }

  if (!SUBJECTS.includes(payload.subject)) {
    return "subject 不合法";
  }

  const validTypes = ERROR_TYPES_BY_SUBJECT[payload.subject] || [];
  if (!validTypes.includes(payload.error_type)) {
    return "error_type 与学科不匹配";
  }

  return null;
}

module.exports = {
  validateMistakePayload,
};
