export async function fetchMeta() {
  const res = await fetch("/api/meta/error-types");
  return res.json();
}

export async function fetchMistakes(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      qs.append(key, value);
    }
  });
  const res = await fetch(`/api/mistakes?${qs.toString()}`);
  return res.json();
}

export async function createMistake(formData) {
  const res = await fetch("/api/mistakes", {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function updateMistake(id, formData) {
  const res = await fetch(`/api/mistakes/${id}`, {
    method: "PUT",
    body: formData,
  });
  return res.json();
}

export async function runOcr(imageFile) {
  const data = new FormData();
  data.append("image", imageFile);
  const res = await fetch("/api/ocr", {
    method: "POST",
    body: data,
  });
  return res.json();
}

export async function exportWord(subject) {
  const res = await fetch("/api/export/word", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject }),
  });
  return res.json();
}

export async function fetchWeeklyPlans(weekStart) {
  const qs = new URLSearchParams({ weekStart });
  const res = await fetch(`/api/weekly-plans?${qs.toString()}`);
  return res.json();
}

export async function createWeeklyPlan(payload) {
  const res = await fetch("/api/weekly-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateWeeklyPlan(id, payload) {
  const res = await fetch(`/api/weekly-plans/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteWeeklyPlan(id) {
  const res = await fetch(`/api/weekly-plans/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function fetchSemesterGoals() {
  const res = await fetch("/api/semester-goals");
  return res.json();
}

export async function createSemesterGoal(payload) {
  const res = await fetch("/api/semester-goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateSemesterGoal(semesterName, payload) {
  const res = await fetch(`/api/semester-goals/${encodeURIComponent(semesterName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchPointItems() {
  const res = await fetch("/api/points/items");
  return res.json();
}

export async function createPointItem(payload) {
  const res = await fetch("/api/points/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updatePointItem(code, payload) {
  const res = await fetch(`/api/points/items/${encodeURIComponent(code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchDailyPoints(date) {
  const qs = new URLSearchParams({ date });
  const res = await fetch(`/api/points/daily?${qs.toString()}`);
  return res.json();
}

export async function updateDailyPoints(date, payload) {
  const qs = new URLSearchParams({ date });
  const res = await fetch(`/api/points/daily?${qs.toString()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function createExamPoints(payload) {
  const res = await fetch("/api/points/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function createPointEvent(payload) {
  const res = await fetch("/api/points/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchPointEvents(params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`/api/points/events?${qs.toString()}`);
  return res.json();
}

export async function fetchPointsTotal() {
  const res = await fetch("/api/points/total");
  return res.json();
}
