const express = require("express");
const { SUBJECTS, ERROR_TYPES_BY_SUBJECT } = require("../../shared/constants");

const router = express.Router();

router.get("/error-types", (req, res) => {
  res.json({
    subjects: SUBJECTS,
    errorTypesBySubject: ERROR_TYPES_BY_SUBJECT,
  });
});

module.exports = router;
