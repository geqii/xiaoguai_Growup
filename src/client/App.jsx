import React, { useEffect, useMemo, useState } from "react";
import { PHONICS_AUDIO_MAP } from "../shared/phonicsAudioMap";
import {
  createBackup,
  createExamPoints,
  createMistake,
  createPhonicsWord,
  createPointEvent,
  createPointItem,
  createSemesterGoal,
  createWeeklyPlan,
  deletePhonicsWord,
  deleteWeeklyPlan,
  fetchBackups,
  fetchDailyPoints,
  fetchSemesterGoals,
  fetchPhonicsCatalog,
  fetchPointEvents,
  fetchPointItems,
  fetchPointsTotal,
  exportWord,
  fetchMeta,
  fetchMistakes,
  fetchWeeklyPlans,
  runOcr,
  restoreBackup,
  updateDailyPoints,
  updatePointItem,
  updateSemesterGoal,
  updateMistake,
  updateWeeklyPlan,
} from "./clientApi";
import "./App.css";

const baseForm = {
  subject: "数学",
  error_type: "计算问题",
  question_text: "",
  analysis: "",
  solution_idea: "",
  source_name: "",
  source_date: "",
  source_question_no: "",
};

const REQUIRED_LABELS = {
  question_text: "题目文本",
  solution_idea: "解题思路",
  analysis: "错误原因分析",
  source_name: "试卷/作业名",
  source_date: "日期",
  source_question_no: "题号",
};

const PHONICS_PAGE_SIZE = {
  vowel: 8,
  consonant: 10,
};

function App() {
  const [tab, setTab] = useState("create");
  const [meta, setMeta] = useState({ subjects: [], errorTypesBySubject: {} });
  const [form, setForm] = useState(baseForm);
  const [imageFile, setImageFile] = useState(null);
  const [list, setList] = useState([]);
  const [filters, setFilters] = useState({ subject: "数学", errorType: "", keyword: "" });
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);

  const [weekDate, setWeekDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [weeklyItems, setWeeklyItems] = useState([]);
  const [newWeeklyContent, setNewWeeklyContent] = useState("");
  const [editingWeeklyId, setEditingWeeklyId] = useState("");
  const [editingWeeklyContent, setEditingWeeklyContent] = useState("");

  const [semesterGoals, setSemesterGoals] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [semesterEditing, setSemesterEditing] = useState(false);
  const [semesterForm, setSemesterForm] = useState({
    semester_name: "",
    chinese_target: 90,
    math_target: 95,
    english_target: 95,
  });

  const [pointsDate, setPointsDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [dailyCheckin, setDailyCheckin] = useState(null);
  const [dailySummary, setDailySummary] = useState(null);
  const [pointItems, setPointItems] = useState([]);
  const [pointsTotal, setPointsTotal] = useState(null);

  const [examForm, setExamForm] = useState({
    date: "",
    subject: "数学",
    score: "",
    chinese_has_essay: false,
    exam_type: "unit_test",
    note: "",
    override_points: "",
  });

  const [manualForm, setManualForm] = useState({
    date: "",
    item_code: "weekly_weekend_good",
    points_delta: "",
    note: "",
  });

  const [adjustForm, setAdjustForm] = useState({
    points_delta: "",
    note: "",
  });

  const [eventsQuery, setEventsQuery] = useState({
    from: "",
    to: "",
    category: "",
    page: 1,
    pageSize: 20,
  });
  const [eventsResult, setEventsResult] = useState(null);
  const [phonicsData, setPhonicsData] = useState({
    vowels: [],
    consonants: [],
  });
  const [speakingKey, setSpeakingKey] = useState("");
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [phonicsPages, setPhonicsPages] = useState({
    vowel: 1,
    consonant: 1,
  });
  const [phonicsForm, setPhonicsForm] = useState({
    category: "vowel",
    symbol: "",
    word: "",
    highlight_text: "",
    note: "",
  });
  const [backupState, setBackupState] = useState({
    enabled: true,
    backupDir: "",
    dbPath: "",
    items: [],
    message: "",
  });
  const [backupBusy, setBackupBusy] = useState(false);

  const [newItemForm, setNewItemForm] = useState({
    code: "",
    name: "",
    category: "other",
    kind: "manual",
    default_points: "",
    min_points: "",
    max_points: "",
  });
  const [editingItemCode, setEditingItemCode] = useState("");
  const [editingItemForm, setEditingItemForm] = useState(null);

  useEffect(() => {
    fetchMeta().then((data) => {
      setMeta(data);
    });
  }, []);

  useEffect(() => {
    if (tab !== "points") {
      return;
    }
    fetchPointItems().then((data) => {
      setPointItems(Array.isArray(data.items) ? data.items : []);
    });
    fetchPointsTotal().then((data) => {
      setPointsTotal(data);
    });
  }, [tab]);

  useEffect(() => {
    if (tab !== "points") {
      return;
    }
    fetchDailyPoints(pointsDate).then((data) => {
      setDailyCheckin(data.checkin || null);
      setDailySummary(data.summary || null);
    });
  }, [tab, pointsDate]);

  useEffect(() => {
    if (tab !== "phonics") {
      return;
    }
    loadPhonics();
  }, [tab]);

  useEffect(() => {
    if (tab !== "backup") {
      return;
    }
    loadBackups();
  }, [tab]);

  useEffect(() => {
    if (tab !== "points") {
      return;
    }
    if (!eventsQuery.from || !eventsQuery.to) {
      const today = pointsDate;
      const from = today.slice(0, 8) + "01";
      setEventsQuery((prev) => ({ ...prev, from, to: today }));
      return;
    }
    fetchPointEvents({
      from: eventsQuery.from,
      to: eventsQuery.to,
      category: eventsQuery.category,
      page: String(eventsQuery.page),
      pageSize: String(eventsQuery.pageSize),
    }).then((data) => setEventsResult(data));
  }, [tab, eventsQuery, pointsDate]);

  useEffect(() => {
    if (tab !== "points") {
      return;
    }
    setExamForm((prev) => ({ ...prev, date: pointsDate }));
    setManualForm((prev) => ({ ...prev, date: pointsDate, item_code: prev.item_code || "weekly_weekend_good" }));
  }, [tab, pointsDate]);

  const currentErrorTypes = useMemo(() => {
    return meta.errorTypesBySubject[form.subject] || [];
  }, [meta, form.subject]);

  const filterErrorTypes = useMemo(() => {
    return meta.errorTypesBySubject[filters.subject] || [];
  }, [meta, filters.subject]);

  useEffect(() => {
    if (currentErrorTypes.length && !currentErrorTypes.includes(form.error_type)) {
      setForm((prev) => ({ ...prev, error_type: currentErrorTypes[0] }));
    }
  }, [currentErrorTypes, form.error_type]);

  useEffect(() => {
    if (filterErrorTypes.length && !filterErrorTypes.includes(filters.errorType)) {
      setFilters((prev) => ({ ...prev, errorType: "" }));
    }
  }, [filterErrorTypes, filters.errorType]);

  function computeWeekStartYmd(dateYmd) {
    const m = String(dateYmd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      return "";
    }
    const y = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const date = new Date(y, month - 1, day);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const dow = date.getDay(); // 0..6, 0 is Sun
    const diff = (dow + 6) % 7; // Monday => 0
    date.setDate(date.getDate() - diff);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  function addDaysYmd(ymd, days) {
    const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      return "";
    }
    const y = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const date = new Date(y, month - 1, day);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    date.setDate(date.getDate() + days);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  function formatDateTimeLabel(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }

  function formatSizeLabel(sizeBytes) {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return "-";
    }
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function renderUnderlinedWord(word, highlightText) {
    const text = String(word || "");
    const target = String(highlightText || "").trim();
    if (!text || !target) {
      return text || "-";
    }
    const lowerText = text.toLowerCase();
    const lowerTarget = target.toLowerCase();
    const index = lowerText.indexOf(lowerTarget);
    if (index < 0) {
      return text;
    }
    return (
      <>
        {text.slice(0, index)}
        <span className="phonics-underline">{text.slice(index, index + target.length)}</span>
        {text.slice(index + target.length)}
      </>
    );
  }

  function playPhonicsAudio(item) {
    const config = PHONICS_AUDIO_MAP[item.symbol];
    if (!config?.enabled || !config.audioFile) {
      setMessage("这个音标暂未接入可靠本地音频，先不要用它来带读孩子");
      return;
    }
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }

    const player = new window.Audio(config.audioFile);
    setAudioPlayer(player);
    setSpeakingKey(`${item.symbol}:symbol`);
    player.onended = () => {
      setSpeakingKey("");
      setAudioPlayer(null);
    };
    player.onerror = () => {
      setSpeakingKey("");
      setAudioPlayer(null);
      setMessage("本地音频播放失败");
    };
    player.play().catch(() => {
      setSpeakingKey("");
      setAudioPlayer(null);
      setMessage("本地音频播放失败");
    });
  }

  function speakSampleWord(item) {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance === "undefined") {
      setMessage("当前浏览器暂不支持例词朗读");
      return;
    }
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      setAudioPlayer(null);
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(item.sampleWord);
    utterance.lang = "en-GB";
    utterance.rate = 0.85;
    utterance.onstart = () => setSpeakingKey(`${item.symbol}:word`);
    utterance.onend = () => setSpeakingKey("");
    utterance.onerror = () => {
      setSpeakingKey("");
      setMessage("例词发音失败，请稍后再试");
    };
    window.speechSynthesis.speak(utterance);
  }

  const weekStart = useMemo(() => computeWeekStartYmd(weekDate), [weekDate]);
  const weekEnd = useMemo(() => addDaysYmd(weekStart, 6), [weekStart]);
  const currentPhonicsOptions = useMemo(() => {
    return phonicsForm.category === "consonant" ? phonicsData.consonants : phonicsData.vowels;
  }, [phonicsData, phonicsForm.category]);

  useEffect(() => {
    if (!currentPhonicsOptions.length) {
      if (phonicsForm.symbol) {
        setPhonicsForm((prev) => ({ ...prev, symbol: "" }));
      }
      return;
    }
    const matched = currentPhonicsOptions.some((item) => item.symbol === phonicsForm.symbol);
    if (!matched) {
      setPhonicsForm((prev) => ({ ...prev, symbol: currentPhonicsOptions[0].symbol }));
    }
  }, [currentPhonicsOptions, phonicsForm.symbol]);

  useEffect(() => {
    if (tab !== "weekly") {
      return;
    }
    if (!weekStart) {
      return;
    }
    fetchWeeklyPlans(weekStart).then((data) => {
      setWeeklyItems(Array.isArray(data.items) ? data.items : []);
    });
  }, [tab, weekStart]);

  useEffect(() => {
    if (tab !== "weekly") {
      return;
    }
    fetchSemesterGoals().then((data) => {
      const items = Array.isArray(data.items) ? data.items : [];
      setSemesterGoals(items);
      if (!selectedSemester && items.length > 0) {
        setSelectedSemester(items[0].semester_name);
      }
    });
  }, [tab, selectedSemester]);

  const currentSemesterGoal = useMemo(() => {
    return semesterGoals.find((x) => x.semester_name === selectedSemester) || null;
  }, [semesterGoals, selectedSemester]);

  useEffect(() => {
    if (!currentSemesterGoal) {
      return;
    }
    setSemesterForm({
      semester_name: currentSemesterGoal.semester_name,
      chinese_target: currentSemesterGoal.chinese_target,
      math_target: currentSemesterGoal.math_target,
      english_target: currentSemesterGoal.english_target,
    });
  }, [currentSemesterGoal]);

  function startSemesterEdit() {
    setSemesterEditing(true);
    if (!currentSemesterGoal) {
      setSemesterForm({
        semester_name: "",
        chinese_target: 90,
        math_target: 95,
        english_target: 95,
      });
    }
  }

  function cancelSemesterEdit() {
    setSemesterEditing(false);
    if (currentSemesterGoal) {
      setSemesterForm({
        semester_name: currentSemesterGoal.semester_name,
        chinese_target: currentSemesterGoal.chinese_target,
        math_target: currentSemesterGoal.math_target,
        english_target: currentSemesterGoal.english_target,
      });
    }
  }

  async function saveSemesterGoal() {
    const name = String(semesterForm.semester_name || "").trim();
    const chinese = Number(semesterForm.chinese_target);
    const math = Number(semesterForm.math_target);
    const english = Number(semesterForm.english_target);
    if (!name) {
      setMessage("请填写学期名称");
      return;
    }
    const isValid =
      Number.isInteger(chinese) &&
      Number.isInteger(math) &&
      Number.isInteger(english) &&
      chinese >= 0 &&
      chinese <= 100 &&
      math >= 0 &&
      math <= 100 &&
      english >= 0 &&
      english <= 100;
    if (!isValid) {
      setMessage("目标分数需为0~100的整数");
      return;
    }

    if (currentSemesterGoal && currentSemesterGoal.semester_name === name) {
      const data = await updateSemesterGoal(name, {
        chinese_target: chinese,
        math_target: math,
        english_target: english,
      });
      if (data.semester_name) {
        const refreshed = await fetchSemesterGoals();
        const items = Array.isArray(refreshed.items) ? refreshed.items : [];
        setSemesterGoals(items);
        setSemesterEditing(false);
        setMessage("学期目标已更新");
        return;
      }
      setMessage(data.message || "更新失败");
      return;
    }

    const data = await createSemesterGoal({
      semester_name: name,
      chinese_target: chinese,
      math_target: math,
      english_target: english,
    });
    if (data.id) {
      const refreshed = await fetchSemesterGoals();
      const items = Array.isArray(refreshed.items) ? refreshed.items : [];
      setSemesterGoals(items);
      setSelectedSemester(name);
      setSemesterEditing(false);
      setMessage("学期目标已创建");
      return;
    }
    setMessage(data.message || "创建失败");
  }

  async function addWeeklyItem() {
    const content = String(newWeeklyContent || "").trim();
    if (!content) {
      setMessage("请先填写周计划内容");
      return;
    }
    const data = await createWeeklyPlan({ weekStart, content });
    if (data.id) {
      setNewWeeklyContent("");
      const refreshed = await fetchWeeklyPlans(weekStart);
      setWeeklyItems(Array.isArray(refreshed.items) ? refreshed.items : []);
      setMessage("新增计划成功");
      return;
    }
    setMessage(data.message || "新增计划失败");
  }

  async function toggleWeeklyDone(item) {
    const data = await updateWeeklyPlan(item.id, { is_done: !item.is_done });
    if (data.id) {
      setWeeklyItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, is_done: item.is_done ? 0 : 1 } : x))
      );
      return;
    }
    setMessage(data.message || "更新失败");
  }

  function startWeeklyEdit(item) {
    setEditingWeeklyId(item.id);
    setEditingWeeklyContent(item.content || "");
  }

  function cancelWeeklyEdit() {
    setEditingWeeklyId("");
    setEditingWeeklyContent("");
  }

  async function saveWeeklyEdit(item) {
    const content = String(editingWeeklyContent || "").trim();
    if (!content) {
      setMessage("计划内容不能为空");
      return;
    }
    const data = await updateWeeklyPlan(item.id, { content });
    if (data.id) {
      setWeeklyItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, content } : x)));
      cancelWeeklyEdit();
      setMessage("更新成功");
      return;
    }
    setMessage(data.message || "更新失败");
  }

  async function removeWeeklyItem(item) {
    const ok = window.confirm("确定删除该计划吗？");
    if (!ok) {
      return;
    }
    const data = await deleteWeeklyPlan(item.id);
    if (data.id) {
      setWeeklyItems((prev) => prev.filter((x) => x.id !== item.id));
      setMessage("删除成功");
      return;
    }
    setMessage(data.message || "删除失败");
  }

  async function saveDailyCheckin() {
    if (!dailyCheckin) {
      return;
    }
    const beforeTotal = pointsTotal?.totalPoints ?? null;
    const data = await updateDailyPoints(pointsDate, dailyCheckin);
    if (data.date) {
      const refreshed = await fetchDailyPoints(pointsDate);
      setDailyCheckin(refreshed.checkin || null);
      setDailySummary(refreshed.summary || null);
      const total = await fetchPointsTotal();
      setPointsTotal(total);
      if (beforeTotal !== null) {
        setMessage(`今日打卡已保存；累计总积分：${beforeTotal} → ${total.totalPoints}`);
      } else {
        setMessage("今日打卡已保存");
      }
      setEventsQuery((prev) => ({ ...prev, page: 1 }));
      return;
    }
    setMessage(data.message || "保存失败");
  }

  async function submitExam() {
    const score = String(examForm.score || "").trim();
    if (!examForm.date) {
      setMessage("请选择日期");
      return;
    }
    if (!score) {
      setMessage("请输入分数");
      return;
    }
    const override = String(examForm.override_points || "").trim();
    const payload = {
      date: examForm.date,
      subject: examForm.subject,
      score: Number(score),
      chinese_has_essay: !!examForm.chinese_has_essay,
      exam_type: examForm.exam_type,
      note: examForm.note,
      override_points: override ? Number(override) : undefined,
    };
    const data = await createExamPoints(payload);
    if (data.id) {
      setMessage(`考试录入成功：自动${data.calculated_points}，最终${data.final_points}`);
      setExamForm((prev) => ({ ...prev, score: "", note: "", override_points: "" }));
      fetchPointsTotal().then((t) => setPointsTotal(t));
      setEventsQuery((prev) => ({ ...prev, page: 1 }));
      return;
    }
    setMessage(data.message || "考试录入失败");
  }

  async function submitManualEvent() {
    const points = String(manualForm.points_delta || "").trim();
    if (!manualForm.date) {
      setMessage("请选择日期");
      return;
    }
    if (!manualForm.item_code) {
      setMessage("请选择事件类型");
      return;
    }
    if (!points) {
      setMessage("请输入积分");
      return;
    }
    const data = await createPointEvent({
      date: manualForm.date,
      item_code: manualForm.item_code,
      points_delta: Number(points),
      note: manualForm.note,
    });
    if (data.id) {
      setMessage("事件已录入");
      setManualForm((prev) => ({ ...prev, points_delta: "", note: "" }));
      fetchPointsTotal().then((t) => setPointsTotal(t));
      setEventsQuery((prev) => ({ ...prev, page: 1 }));
      return;
    }
    setMessage(data.message || "录入失败");
  }

  async function submitAdjustEvent() {
    const points = String(adjustForm.points_delta || "").trim();
    if (!points) {
      setMessage("请输入加/扣分");
      return;
    }
    const data = await createPointEvent({
      date: pointsDate,
      item_code: "adjust_manual",
      points_delta: Number(points),
      note: adjustForm.note,
    });
    if (data.id) {
      setMessage("加/扣分已记录");
      setAdjustForm({ points_delta: "", note: "" });
      fetchPointsTotal().then((t) => setPointsTotal(t));
      setEventsQuery((prev) => ({ ...prev, page: 1 }));
      return;
    }
    setMessage(data.message || "录入失败");
  }

  async function loadPhonics() {
    const data = await fetchPhonicsCatalog();
    setPhonicsData({
      vowels: Array.isArray(data.vowels) ? data.vowels : [],
      consonants: Array.isArray(data.consonants) ? data.consonants : [],
    });
  }

  async function submitPhonicsWord() {
    const word = String(phonicsForm.word || "").trim();
    if (!phonicsForm.symbol) {
      setMessage("请先选择音标");
      return;
    }
    if (!word) {
      setMessage("请先填写单词");
      return;
    }
    const data = await createPhonicsWord({
      category: phonicsForm.category,
      symbol: phonicsForm.symbol,
      word,
      highlight_text: phonicsForm.highlight_text,
      note: phonicsForm.note,
    });
    if (data.id) {
      setPhonicsForm((prev) => ({
        ...prev,
        word: "",
        highlight_text: "",
        note: "",
      }));
      await loadPhonics();
      setMessage("单词已添加到对应音标");
      return;
    }
    setMessage(data.message || "添加失败");
  }

  async function removePhonicsWord(id) {
    const ok = window.confirm("确定删除这个自定义单词吗？");
    if (!ok) {
      return;
    }
    const data = await deletePhonicsWord(id);
    if (data.id) {
      await loadPhonics();
      setMessage("单词已删除");
      return;
    }
    setMessage(data.message || "删除失败");
  }

  async function loadBackups() {
    const data = await fetchBackups();
    setBackupState({
      enabled: data.enabled !== false,
      backupDir: data.backupDir || "",
      dbPath: data.dbPath || "",
      items: Array.isArray(data.items) ? data.items : [],
      message: data.message || "",
    });
  }

  async function handleCreateBackup() {
    setBackupBusy(true);
    const data = await createBackup();
    setBackupBusy(false);
    if (data.item?.fileName) {
      setMessage(`备份成功：${data.item.fileName}`);
      await loadBackups();
      return;
    }
    setMessage(data.message || "备份失败");
  }

  async function handleRestoreBackup(fileName) {
    const ok = window.confirm(`确定恢复备份 ${fileName} 吗？恢复后会覆盖当前数据库内容。`);
    if (!ok) {
      return;
    }
    setBackupBusy(true);
    const data = await restoreBackup(fileName);
    setBackupBusy(false);
    if (data.restored?.fileName) {
      window.alert(`已恢复备份：${data.restored.fileName}。页面将刷新以载入最新数据。`);
      window.location.reload();
      return;
    }
    setMessage(data.message || "恢复失败");
  }

  function startEditPointItem(item) {
    setEditingItemCode(item.code);
    setEditingItemForm({
      name: item.name,
      is_active: item.is_active,
      default_points: item.default_points ?? "",
      min_points: item.min_points ?? "",
      max_points: item.max_points ?? "",
      config_json: item.config_json ?? "",
    });
  }

  function cancelEditPointItem() {
    setEditingItemCode("");
    setEditingItemForm(null);
  }

  async function savePointItem(code) {
    if (!editingItemForm) {
      return;
    }
    const payload = {
      name: editingItemForm.name,
      is_active: editingItemForm.is_active,
      default_points: editingItemForm.default_points === "" ? undefined : Number(editingItemForm.default_points),
      min_points: editingItemForm.min_points === "" ? undefined : Number(editingItemForm.min_points),
      max_points: editingItemForm.max_points === "" ? undefined : Number(editingItemForm.max_points),
      config_json: editingItemForm.config_json,
    };
    const data = await updatePointItem(code, payload);
    if (data.code) {
      const refreshed = await fetchPointItems();
      setPointItems(Array.isArray(refreshed.items) ? refreshed.items : []);
      setMessage("条目已更新");
      cancelEditPointItem();
      return;
    }
    setMessage(data.message || "更新失败");
  }

  async function createNewPointItem() {
    const code = String(newItemForm.code || "").trim();
    const name = String(newItemForm.name || "").trim();
    if (!code || !name) {
      setMessage("请填写条目代码与名称");
      return;
    }
    const payload = {
      code,
      name,
      category: newItemForm.category,
      kind: newItemForm.kind,
      default_points: newItemForm.default_points === "" ? undefined : Number(newItemForm.default_points),
      min_points: newItemForm.min_points === "" ? undefined : Number(newItemForm.min_points),
      max_points: newItemForm.max_points === "" ? undefined : Number(newItemForm.max_points),
    };
    const data = await createPointItem(payload);
    if (data.id) {
      const refreshed = await fetchPointItems();
      setPointItems(Array.isArray(refreshed.items) ? refreshed.items : []);
      setNewItemForm({
        code: "",
        name: "",
        category: "other",
        kind: "manual",
        default_points: "",
        min_points: "",
        max_points: "",
      });
      setMessage("条目已创建");
      return;
    }
    setMessage(data.message || "创建失败");
  }

  function renderPhonicsSection(title, category, items) {
    const pageSize = PHONICS_PAGE_SIZE[category];
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(phonicsPages[category] || 1, totalPages);
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    return (
      <section className="card form-grid">
        <div className="phonics-section-header">
          <div>
            <div className="semester-title">{title}</div>
            <div className="semester-subtitle">点击翻页可查看更多音标卡片</div>
          </div>
          <div className="phonics-page-badge">
            第{page}页 / 共{totalPages}页
          </div>
        </div>
        <div className="phonics-grid">
          {pagedItems.map((item) => (
            <article key={item.symbol} className="phonics-card">
              <div className="phonics-top-row">
                <div className="phonics-symbol">{item.symbol}</div>
                <div className="phonics-speak-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-small phonics-speak-btn"
                    onClick={() => playPhonicsAudio(item)}
                    disabled={!PHONICS_AUDIO_MAP[item.symbol]?.enabled}
                    title={PHONICS_AUDIO_MAP[item.symbol]?.enabled ? "播放本地固定音频" : "该音标暂未接入可靠本地音频"}
                  >
                    {speakingKey === `${item.symbol}:symbol` ? "播放中..." : "读音标"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small phonics-speak-btn"
                    onClick={() => speakSampleWord(item)}
                  >
                    {speakingKey === `${item.symbol}:word` ? "播放中..." : "读例词"}
                  </button>
                </div>
              </div>
              <div className="phonics-tip">{item.tip}</div>
              <div className="phonics-sample">
                例词：{renderUnderlinedWord(item.sampleWord, item.highlightText)}
              </div>
              <div className="phonics-custom-title">我的补充单词</div>
              {item.customWords?.length ? (
                <div className="phonics-word-list">
                  {item.customWords.map((word) => (
                    <button
                      key={word.id}
                      type="button"
                      className="phonics-word-chip"
                      onClick={() => removePhonicsWord(word.id)}
                      title={word.note ? `${word.word}：${word.note}` : "点击删除"}
                    >
                      {renderUnderlinedWord(word.word, word.highlight_text)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="phonics-empty">还没有自己添加的单词</div>
              )}
            </article>
          ))}
        </div>
        <div className="points-pagination phonics-pagination">
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={page <= 1}
            onClick={() => setPhonicsPages((prev) => ({ ...prev, [category]: Math.max(1, page - 1) }))}
          >
            上一页
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={page >= totalPages}
            onClick={() => setPhonicsPages((prev) => ({ ...prev, [category]: Math.min(totalPages, page + 1) }))}
          >
            下一页
          </button>
        </div>
      </section>
    );
  }

  async function handleOcr() {
    if (!imageFile) {
      setMessage("请先上传图片");
      return;
    }
    const data = await runOcr(imageFile);
    setForm((prev) => ({ ...prev, question_text: data.text || "" }));
    setMessage("OCR 完成，可继续手动修正文本");
  }

  async function handleSave() {
    const missing = Object.entries(REQUIRED_LABELS)
      .filter(([key]) => !form[key] || String(form[key]).trim() === "")
      .map(([, label]) => label);
    if (missing.length > 0) {
      setMessage(`请先填写：${missing.join("、")}`);
      return;
    }

    const payload = new FormData();
    Object.entries(form).forEach(([k, v]) => payload.append(k, v));
    if (imageFile) {
      payload.append("image", imageFile);
    }
    const data = await createMistake(payload);
    if (data.id) {
      setMessage(`保存成功，ID: ${data.id}`);
      setForm({
        ...baseForm,
        subject: form.subject,
        error_type: meta.errorTypesBySubject[form.subject]?.[0] || "",
      });
      setImageFile(null);
      return;
    }
    setMessage(data.message || "保存失败");
  }

  async function handleQuery() {
    const data = await fetchMistakes(filters);
    setList(data);
  }

  async function handleExport() {
    const data = await exportWord(filters.subject);
    setMessage(`导出完成：${data.filePath || "失败"}`);
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditImageFile(null);
    setEditForm({
      subject: row.subject,
      error_type: row.error_type,
      question_text: row.question_text,
      analysis: row.analysis,
      solution_idea: row.solution_idea,
      source_name: row.source_name,
      source_date: row.source_date,
      source_question_no: row.source_question_no,
    });
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm(null);
    setEditImageFile(null);
  }

  async function saveEdit() {
    if (!editingId || !editForm) {
      return;
    }
    const missing = Object.entries(REQUIRED_LABELS)
      .filter(([key]) => !editForm[key] || String(editForm[key]).trim() === "")
      .map(([, label]) => label);
    if (missing.length > 0) {
      setMessage(`请先填写：${missing.join("、")}`);
      return;
    }

    const payload = new FormData();
    Object.entries(editForm).forEach(([k, v]) => payload.append(k, v));
    if (editImageFile) {
      payload.append("image", editImageFile);
    }
    const data = await updateMistake(editingId, payload);
    if (data.id) {
      setMessage(`更新成功，ID: ${data.id}`);
      cancelEdit();
      await handleQuery();
      return;
    }
    setMessage(data.message || "更新失败");
  }

  return (
    <div className="app-root">
      <h1 className="page-title">错题记录本</h1>
      <div className="tab-bar">
        <button type="button" className={`btn ${tab === "create" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("create")}>
          快速录入
        </button>
        <button type="button" className={`btn ${tab === "list" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("list")}>
          查看筛选
        </button>
        <button type="button" className={`btn ${tab === "weekly" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("weekly")}>
          周计划
        </button>
        <button type="button" className={`btn ${tab === "points" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("points")}>
          积分
        </button>
        <button type="button" className={`btn ${tab === "phonics" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("phonics")}>
          英语音标
        </button>
        <button type="button" className={`btn ${tab === "backup" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("backup")}>
          备份恢复
        </button>
      </div>
      <p className="status-text">{message}</p>
      {tab === "points" ? (
        <div className="form-grid">
          <section className="card points-total-card">
            <div className="points-total-title">累计总积分</div>
            <div className="points-total-value">{pointsTotal?.totalPoints ?? 0}</div>
            <div className="points-total-sub">
              日{pointsTotal?.byCategory?.daily || 0} / 周{pointsTotal?.byCategory?.weekly || 0} / 考试{pointsTotal?.byCategory?.exam || 0} / 其他
              {pointsTotal?.byCategory?.other || 0}
            </div>
          </section>

          <section className="card form-grid">
            <div className="week-header">
              <label className="form-field" style={{ maxWidth: 260 }}>
                日期
                <input type="date" value={pointsDate} onChange={(e) => setPointsDate(e.target.value)} />
              </label>
              <div className="week-range">
                {dailySummary ? `今日打卡：${dailySummary.totalPoints}（最多4分）` : ""}
              </div>
            </div>
            <div className="points-hint">
              作息提醒：周一~周五 06:40 起床；周日~周四 21:30 上床；周五~周六 22:00 上床（勾选即可，不要求填实际时间）
            </div>
            {dailyCheckin ? (
              <div className="points-check-row">
                <label className="points-check">
                  <input
                    type="checkbox"
                    checked={!!dailyCheckin.chinese_done}
                    onChange={(e) => setDailyCheckin((p) => ({ ...p, chinese_done: e.target.checked ? 1 : 0 }))}
                  />
                  语文 +1
                </label>
                <label className="points-check">
                  <input
                    type="checkbox"
                    checked={!!dailyCheckin.math_done}
                    onChange={(e) => setDailyCheckin((p) => ({ ...p, math_done: e.target.checked ? 1 : 0 }))}
                  />
                  数学 +1
                </label>
                <label className="points-check">
                  <input
                    type="checkbox"
                    checked={!!dailyCheckin.english_done}
                    onChange={(e) => setDailyCheckin((p) => ({ ...p, english_done: e.target.checked ? 1 : 0 }))}
                  />
                  英语 +1
                </label>
                <label className="points-check">
                  <input
                    type="checkbox"
                    checked={!!dailyCheckin.sleep_done}
                    onChange={(e) => setDailyCheckin((p) => ({ ...p, sleep_done: e.target.checked ? 1 : 0 }))}
                  />
                  早起早睡 +1
                </label>
              </div>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={saveDailyCheckin} disabled={!dailyCheckin}>
              保存今日打卡
            </button>
          </section>

          <section className="card form-grid">
            <div className="semester-title">独立加/扣积分（不计入今日4分）</div>
            <div className="points-parent-row">
              <label className="form-field">
                事件备注
                <input value={adjustForm.note} onChange={(e) => setAdjustForm((p) => ({ ...p, note: e.target.value }))} placeholder="例如：主动复盘/拖延扣分..." />
              </label>
              <label className="form-field" style={{ maxWidth: 220 }}>
                加/扣分（可负数）
                <input
                  type="number"
                  value={adjustForm.points_delta}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, points_delta: e.target.value }))}
                  placeholder="例如：5 或 -5"
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitAdjustEvent}
            >
              记录加/扣分
            </button>
          </section>

          <section className="card form-grid">
            <div className="semester-title">考试录入（自动算分）</div>
            <div className="points-exam-grid">
              <label className="form-field">
                日期
                <input type="date" value={examForm.date} onChange={(e) => setExamForm((p) => ({ ...p, date: e.target.value }))} />
              </label>
              <label className="form-field">
                科目
                <select value={examForm.subject} onChange={(e) => setExamForm((p) => ({ ...p, subject: e.target.value }))}>
                  <option value="语文">语文</option>
                  <option value="数学">数学</option>
                  <option value="英语">英语</option>
                </select>
              </label>
              <label className="form-field">
                分数
                <input
                  type="number"
                  value={examForm.score}
                  onChange={(e) => setExamForm((p) => ({ ...p, score: e.target.value }))}
                  placeholder="0~100"
                />
              </label>
              <label className="form-field">
                考试类型
                <select value={examForm.exam_type} onChange={(e) => setExamForm((p) => ({ ...p, exam_type: e.target.value }))}>
                  <option value="unit_test">单元测验 ×1</option>
                  <option value="midterm">期中考试 ×2</option>
                  <option value="final">期末考试 ×3</option>
                </select>
              </label>
            </div>
            {examForm.subject === "语文" ? (
              <label className="points-check">
                <input
                  type="checkbox"
                  checked={!!examForm.chinese_has_essay}
                  onChange={(e) => setExamForm((p) => ({ ...p, chinese_has_essay: e.target.checked }))}
                />
                语文含作文
              </label>
            ) : null}
            <div className="points-exam-grid">
              <label className="form-field">
                说明（可选）
                <input value={examForm.note} onChange={(e) => setExamForm((p) => ({ ...p, note: e.target.value }))} />
              </label>
              <label className="form-field">
                覆盖最终积分（可选）
                <input
                  type="number"
                  value={examForm.override_points}
                  onChange={(e) => setExamForm((p) => ({ ...p, override_points: e.target.value }))}
                  placeholder="留空则按规则计算"
                />
              </label>
            </div>
            <button type="button" className="btn btn-primary" onClick={submitExam}>
              提交考试
            </button>
          </section>

          <section className="card form-grid">
            <div className="semester-title">周/其他积分事件</div>
            <div className="points-exam-grid">
              <label className="form-field">
                日期
                <input type="date" value={manualForm.date} onChange={(e) => setManualForm((p) => ({ ...p, date: e.target.value }))} />
              </label>
              <label className="form-field">
                事件类型
                <select value={manualForm.item_code} onChange={(e) => setManualForm((p) => ({ ...p, item_code: e.target.value }))}>
                  {pointItems
                    .filter((x) => x.kind === "manual" && x.is_active)
                    .map((x) => (
                      <option key={x.code} value={x.code}>
                        {x.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="form-field">
                积分
                <input
                  type="number"
                  value={manualForm.points_delta}
                  onChange={(e) => setManualForm((p) => ({ ...p, points_delta: e.target.value }))}
                />
              </label>
              <label className="form-field">
                说明（可选）
                <input value={manualForm.note} onChange={(e) => setManualForm((p) => ({ ...p, note: e.target.value }))} />
              </label>
            </div>
            <button type="button" className="btn btn-primary" onClick={submitManualEvent}>
              录入事件
            </button>
          </section>

          <section className="card form-grid">
            <div className="semester-title">积分明细</div>
            <div className="points-filter-row">
              <label className="form-field">
                从
                <input
                  type="date"
                  value={eventsQuery.from}
                  onChange={(e) => setEventsQuery((p) => ({ ...p, from: e.target.value, page: 1 }))}
                />
              </label>
              <label className="form-field">
                到
                <input
                  type="date"
                  value={eventsQuery.to}
                  onChange={(e) => setEventsQuery((p) => ({ ...p, to: e.target.value, page: 1 }))}
                />
              </label>
              <label className="form-field">
                分类
                <select
                  value={eventsQuery.category}
                  onChange={(e) => setEventsQuery((p) => ({ ...p, category: e.target.value, page: 1 }))}
                >
                  <option value="">全部</option>
                  <option value="daily">日积分</option>
                  <option value="weekly">周积分</option>
                  <option value="exam">考试</option>
                  <option value="other">其他</option>
                </select>
              </label>
            </div>
            {eventsResult?.summary ? (
              <div className="points-summary">
                总分：{eventsResult.summary.totalPoints}；日{eventsResult.summary.byCategory?.daily || 0} / 周{eventsResult.summary.byCategory?.weekly || 0} /
                考试{eventsResult.summary.byCategory?.exam || 0} / 其他{eventsResult.summary.byCategory?.other || 0}
              </div>
            ) : null}
            <ul className="plan-list">
              {(eventsResult?.items || []).map((e) => (
                <li key={e.id} className="plan-item">
                  <div className="points-event-date">{e.occurred_date}</div>
                  <div className="plan-content">
                    <div className="points-event-title">
                      {e.category} / {e.item_code}
                    </div>
                    <div className="points-event-note">{e.note || ""}</div>
                  </div>
                  <div className={`points-event-points ${e.points_delta >= 0 ? "points-plus" : "points-minus"}`}>
                    {e.points_delta >= 0 ? `+${e.points_delta}` : e.points_delta}
                  </div>
                </li>
              ))}
            </ul>
            {eventsResult ? (
              <div className="points-pagination">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  disabled={eventsQuery.page <= 1}
                  onClick={() => setEventsQuery((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                >
                  上一页
                </button>
                <div className="points-page-info">
                  第{eventsQuery.page}页 / 共{Math.max(1, Math.ceil((eventsResult.totalCount || 0) / eventsQuery.pageSize))}页
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  disabled={eventsQuery.page >= Math.ceil((eventsResult.totalCount || 0) / eventsQuery.pageSize)}
                  onClick={() => setEventsQuery((p) => ({ ...p, page: p.page + 1 }))}
                >
                  下一页
                </button>
              </div>
            ) : null}
          </section>

          <section className="card form-grid">
            <div className="semester-title">积分条目管理</div>
            <div className="points-exam-grid">
              <label className="form-field">
                代码
                <input value={newItemForm.code} onChange={(e) => setNewItemForm((p) => ({ ...p, code: e.target.value }))} placeholder="例如：other_bonus" />
              </label>
              <label className="form-field">
                名称
                <input value={newItemForm.name} onChange={(e) => setNewItemForm((p) => ({ ...p, name: e.target.value }))} placeholder="例如：额外奖励" />
              </label>
              <label className="form-field">
                分类
                <select value={newItemForm.category} onChange={(e) => setNewItemForm((p) => ({ ...p, category: e.target.value }))}>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                  <option value="exam">exam</option>
                  <option value="other">other</option>
                </select>
              </label>
              <label className="form-field">
                类型
                <select value={newItemForm.kind} onChange={(e) => setNewItemForm((p) => ({ ...p, kind: e.target.value }))}>
                  <option value="manual">manual</option>
                  <option value="fixed">fixed</option>
                </select>
              </label>
            </div>
            <div className="points-exam-grid">
              <label className="form-field">
                default_points（fixed）
                <input
                  type="number"
                  value={newItemForm.default_points}
                  onChange={(e) => setNewItemForm((p) => ({ ...p, default_points: e.target.value }))}
                />
              </label>
              <label className="form-field">
                min_points（manual）
                <input type="number" value={newItemForm.min_points} onChange={(e) => setNewItemForm((p) => ({ ...p, min_points: e.target.value }))} />
              </label>
              <label className="form-field">
                max_points（manual）
                <input type="number" value={newItemForm.max_points} onChange={(e) => setNewItemForm((p) => ({ ...p, max_points: e.target.value }))} />
              </label>
              <button type="button" className="btn btn-primary" onClick={createNewPointItem}>
                新增条目
              </button>
            </div>
            <ul className="plan-list">
              {pointItems.map((item) => (
                <li key={item.code} className="plan-item">
                  <div className="points-event-date">{item.category}</div>
                  <div className="plan-content">
                    <div className="points-event-title">
                      {item.code} / {item.name} / {item.kind} {item.is_active ? "" : "(停用)"}
                    </div>
                    {editingItemCode === item.code && editingItemForm ? (
                      <div className="form-grid">
                        <div className="points-exam-grid">
                          <label className="form-field">
                            名称
                            <input
                              value={editingItemForm.name}
                              onChange={(e) => setEditingItemForm((p) => ({ ...p, name: e.target.value }))}
                            />
                          </label>
                          <label className="form-field">
                            启用
                            <select
                              value={editingItemForm.is_active}
                              onChange={(e) => setEditingItemForm((p) => ({ ...p, is_active: Number(e.target.value) }))}
                            >
                              <option value={1}>是</option>
                              <option value={0}>否</option>
                            </select>
                          </label>
                          <label className="form-field">
                            default_points
                            <input
                              type="number"
                              value={editingItemForm.default_points}
                              onChange={(e) => setEditingItemForm((p) => ({ ...p, default_points: e.target.value }))}
                            />
                          </label>
                          <label className="form-field">
                            min_points
                            <input
                              type="number"
                              value={editingItemForm.min_points}
                              onChange={(e) => setEditingItemForm((p) => ({ ...p, min_points: e.target.value }))}
                            />
                          </label>
                          <label className="form-field">
                            max_points
                            <input
                              type="number"
                              value={editingItemForm.max_points}
                              onChange={(e) => setEditingItemForm((p) => ({ ...p, max_points: e.target.value }))}
                            />
                          </label>
                        </div>
                        {item.kind === "exam" ? (
                          <label className="form-field">
                            config_json
                            <textarea
                              rows={6}
                              value={editingItemForm.config_json}
                              onChange={(e) => setEditingItemForm((p) => ({ ...p, config_json: e.target.value }))}
                            />
                          </label>
                        ) : null}
                        <div className="action-row">
                          <button type="button" className="btn btn-primary btn-small" onClick={() => savePointItem(item.code)}>
                            保存
                          </button>
                          <button type="button" className="btn btn-secondary btn-small" onClick={cancelEditPointItem}>
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="points-item-meta">
                        default={item.default_points ?? "-"}；range={item.min_points ?? "-"}~{item.max_points ?? "-"}
                      </div>
                    )}
                  </div>
                  <div className="plan-actions">
                    {editingItemCode === item.code ? null : (
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => startEditPointItem(item)}>
                        编辑
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : tab === "phonics" ? (
        <div className="form-grid">
          <section className="card phonics-hero">
            <div className="phonics-hero-title">英语音标复习</div>
            <div className="phonics-hero-subtitle">音标按钮现在优先播放本地固定音频；没有可靠本地音频的音标会先禁用，避免误导孩子。例词按钮只作为辅助朗读。</div>
          </section>

          <section className="card form-grid">
            <div className="semester-title">添加自己的单词</div>
            <div className="phonics-form-grid">
              <label className="form-field">
                分类
                <select value={phonicsForm.category} onChange={(e) => setPhonicsForm((prev) => ({ ...prev, category: e.target.value }))}>
                  <option value="vowel">元音</option>
                  <option value="consonant">辅音</option>
                </select>
              </label>
              <label className="form-field">
                音标
                <select value={phonicsForm.symbol} onChange={(e) => setPhonicsForm((prev) => ({ ...prev, symbol: e.target.value }))}>
                  {currentPhonicsOptions.map((item) => (
                    <option key={item.symbol} value={item.symbol}>
                      {item.symbol} / {item.sampleWord}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                单词
                <input value={phonicsForm.word} onChange={(e) => setPhonicsForm((prev) => ({ ...prev, word: e.target.value }))} placeholder="例如：green" />
              </label>
              <label className="form-field">
                下划线字母
                <input
                  value={phonicsForm.highlight_text}
                  onChange={(e) => setPhonicsForm((prev) => ({ ...prev, highlight_text: e.target.value }))}
                  placeholder="例如：ee"
                />
              </label>
            </div>
            <label className="form-field">
              备注（可选）
              <input value={phonicsForm.note} onChange={(e) => setPhonicsForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="例如：这个词在课本里常见" />
            </label>
            <button type="button" className="btn btn-primary" onClick={submitPhonicsWord}>
              添加到对应音标
            </button>
          </section>

          {renderPhonicsSection("元音音标", "vowel", phonicsData.vowels)}
          {renderPhonicsSection("辅音音标", "consonant", phonicsData.consonants)}
        </div>
      ) : tab === "backup" ? (
        <div className="form-grid">
          <section className="card backup-hero">
            <div className="backup-hero-title">数据库备份与恢复</div>
            <div className="backup-hero-subtitle">立即生成当前 SQLite 快照，也可以从历史备份恢复。</div>
            <div className="backup-meta-grid">
              <div className="backup-meta-card">
                <div className="backup-meta-label">数据库文件</div>
                <div className="backup-meta-value">{backupState.dbPath || "当前环境未启用文件数据库"}</div>
              </div>
              <div className="backup-meta-card">
                <div className="backup-meta-label">备份目录</div>
                <div className="backup-meta-value">{backupState.backupDir || "-"}</div>
              </div>
            </div>
            <div className="backup-action-row">
              <button type="button" className="btn btn-primary" onClick={handleCreateBackup} disabled={backupBusy || !backupState.enabled}>
                {backupBusy ? "处理中..." : "立即备份"}
              </button>
              <div className="backup-inline-tip">
                {backupState.message || "恢复会覆盖当前数据库内容，建议先点一次“立即备份”。"}
              </div>
            </div>
          </section>

          <section className="card form-grid">
            <div className="semester-title">历史备份</div>
            {backupState.items.length > 0 ? (
              <ul className="plan-list">
                {backupState.items.map((item) => (
                  <li key={item.fileName} className="plan-item backup-item">
                    <div className="backup-item-main">
                      <div className="points-event-title">{item.fileName}</div>
                      <div className="backup-item-meta">
                        创建时间：{formatDateTimeLabel(item.updatedAt)} | 大小：{formatSizeLabel(item.sizeBytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      disabled={backupBusy || !backupState.enabled}
                      onClick={() => handleRestoreBackup(item.fileName)}
                    >
                      恢复此备份
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="backup-empty">还没有备份文件，先点击上方“立即备份”。</div>
            )}
          </section>
        </div>
      ) : tab === "weekly" ? (
        <section className="card form-grid">
          <div className="card semester-card">
            <div className="semester-header">
              <div className="semester-left">
                <div className="semester-title">学期目标</div>
                <div className="semester-subtitle">提醒为主，按学期留档</div>
              </div>
              <div className="semester-right">
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                  <option value="" disabled>
                    选择学期
                  </option>
                  {semesterGoals.map((x) => (
                    <option key={x.semester_name} value={x.semester_name}>
                      {x.semester_name}
                    </option>
                  ))}
                </select>
                {!semesterEditing ? (
                  <button type="button" className="btn btn-secondary" onClick={startSemesterEdit}>
                    {currentSemesterGoal ? "编辑" : "新建"}
                  </button>
                ) : (
                  <div className="action-row">
                    <button type="button" className="btn btn-primary" onClick={saveSemesterGoal}>
                      保存
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={cancelSemesterEdit}>
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>
            {!semesterEditing ? (
              currentSemesterGoal ? (
                <div className="goal-row">
                  <div className="goal-pill">语文 ≥ {currentSemesterGoal.chinese_target}</div>
                  <div className="goal-pill">数学 ≥ {currentSemesterGoal.math_target}</div>
                  <div className="goal-pill">英语 ≥ {currentSemesterGoal.english_target}</div>
                </div>
              ) : (
                <div className="semester-empty">还没有学期目标，点右上角“新建”创建一份。</div>
              )
            ) : (
              <div className="semester-form">
                <label className="form-field">
                  学期名称
                  <input
                    value={semesterForm.semester_name}
                    onChange={(e) => setSemesterForm((p) => ({ ...p, semester_name: e.target.value }))}
                    placeholder="例如：2026春 / 2025-2026下"
                    disabled={!!currentSemesterGoal}
                  />
                </label>
                <div className="semester-score-grid">
                  <label className="form-field">
                    语文目标
                    <input
                      type="number"
                      value={semesterForm.chinese_target}
                      onChange={(e) => setSemesterForm((p) => ({ ...p, chinese_target: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-field">
                    数学目标
                    <input
                      type="number"
                      value={semesterForm.math_target}
                      onChange={(e) => setSemesterForm((p) => ({ ...p, math_target: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="form-field">
                    英语目标
                    <input
                      type="number"
                      value={semesterForm.english_target}
                      onChange={(e) => setSemesterForm((p) => ({ ...p, english_target: Number(e.target.value) }))}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
          <div className="week-header">
            <label className="form-field" style={{ maxWidth: 260 }}>
              周选择
              <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
            </label>
            <div className="week-range">
              {weekStart && weekEnd ? `本周：${weekStart} ~ ${weekEnd}` : ""}
            </div>
          </div>
          <div className="week-add-row">
            <label className="form-field">
              本周计划
              <textarea
                rows={4}
                value={newWeeklyContent}
                onChange={(e) => setNewWeeklyContent(e.target.value)}
                placeholder="例如：每天20分钟英语听力；周三完成数学错题复盘..."
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={addWeeklyItem}>
              新增计划
            </button>
          </div>
          <ul className="plan-list">
            {weeklyItems.map((item) => (
              <li key={item.id} className={`plan-item ${item.is_done ? "plan-item-done" : ""}`}>
                <input type="checkbox" checked={!!item.is_done} onChange={() => toggleWeeklyDone(item)} />
                <div className="plan-content">
                  {editingWeeklyId === item.id ? (
                    <textarea
                      rows={3}
                      value={editingWeeklyContent}
                      onChange={(e) => setEditingWeeklyContent(e.target.value)}
                    />
                  ) : (
                    item.content
                  )}
                </div>
                <div className="plan-actions">
                  {editingWeeklyId === item.id ? (
                    <>
                      <button type="button" className="btn btn-primary btn-small" onClick={() => saveWeeklyEdit(item)}>
                        保存
                      </button>
                      <button type="button" className="btn btn-secondary btn-small" onClick={cancelWeeklyEdit}>
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => startWeeklyEdit(item)}>
                        编辑
                      </button>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => removeWeeklyItem(item)}>
                        删除
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : tab === "create" ? (
        <section className="card form-grid">
          <label className="form-field">
            学科
            <select
              value={form.subject}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  subject: e.target.value,
                  error_type: meta.errorTypesBySubject[e.target.value]?.[0] || "",
                }))
              }
            >
              {(meta.subjects || []).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            错误类型
            <select
              value={form.error_type}
              onChange={(e) => setForm((prev) => ({ ...prev, error_type: e.target.value }))}
            >
              {currentErrorTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            上传错题图片
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </label>
          <button type="button" className="btn btn-secondary" onClick={handleOcr}>
            识别题目文本（OCR）
          </button>
          <label className="form-field">
            题目文本
            <textarea
              rows={8}
              value={form.question_text}
              onChange={(e) => setForm((prev) => ({ ...prev, question_text: e.target.value }))}
            />
          </label>
          <label className="form-field">
            解题思路
            <textarea
              rows={5}
              value={form.solution_idea}
              onChange={(e) => setForm((prev) => ({ ...prev, solution_idea: e.target.value }))}
            />
          </label>
          <label className="form-field">
            错误原因分析
            <textarea
              rows={5}
              value={form.analysis}
              onChange={(e) => setForm((prev) => ({ ...prev, analysis: e.target.value }))}
            />
          </label>
          <label className="form-field">
            试卷/作业名
            <input
              value={form.source_name}
              onChange={(e) => setForm((prev) => ({ ...prev, source_name: e.target.value }))}
            />
          </label>
          <label className="form-field">
            日期
            <input
              type="date"
              value={form.source_date}
              onChange={(e) => setForm((prev) => ({ ...prev, source_date: e.target.value }))}
            />
          </label>
          <label className="form-field">
            题号
            <input
              value={form.source_question_no}
              onChange={(e) => setForm((prev) => ({ ...prev, source_question_no: e.target.value }))}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            保存错题
          </button>
        </section>
      ) : (
        <section className="card form-grid">
          <div className="filter-row">
            <select
              value={filters.subject}
              onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value, errorType: "" }))}
            >
              {(meta.subjects || []).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
            <select
              value={filters.errorType}
              onChange={(e) => setFilters((prev) => ({ ...prev, errorType: e.target.value }))}
            >
              <option value="">全部错误类型</option>
              {filterErrorTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              placeholder="关键词"
              value={filters.keyword}
              onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            />
            <button type="button" className="btn btn-primary" onClick={handleQuery}>
              查询
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleExport}>
              导出学科Word
            </button>
          </div>
          <ul className="list-wrap">
            {list.map((row) => (
              <li key={row.id} className="mistake-item">
                <strong>{row.subject}</strong> | {row.error_type} | {row.source_name} {row.source_question_no}
                <div>题目：{row.question_text}</div>
                <div>解题思路：{row.solution_idea}</div>
                <div>错误分析：{row.analysis}</div>
                <button type="button" className="btn btn-secondary" onClick={() => startEdit(row)}>
                  编辑
                </button>
              </li>
            ))}
          </ul>
          {editingId && editForm ? (
            <div className="card form-grid">
              <h3>编辑错题</h3>
              <label className="form-field">
                学科
                <select
                  value={editForm.subject}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                      error_type: meta.errorTypesBySubject[e.target.value]?.[0] || "",
                    }))
                  }
                >
                  {(meta.subjects || []).map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                错误类型
                <select
                  value={editForm.error_type}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, error_type: e.target.value }))}
                >
                  {(meta.errorTypesBySubject[editForm.subject] || []).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                题目文本
                <textarea
                  rows={8}
                  value={editForm.question_text}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, question_text: e.target.value }))}
                />
              </label>
              <label className="form-field">
                解题思路
                <textarea
                  rows={5}
                  value={editForm.solution_idea}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, solution_idea: e.target.value }))}
                />
              </label>
              <label className="form-field">
                错误原因分析
                <textarea
                  rows={5}
                  value={editForm.analysis}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, analysis: e.target.value }))}
                />
              </label>
              <label className="form-field">
                试卷/作业名
                <input
                  value={editForm.source_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, source_name: e.target.value }))}
                />
              </label>
              <label className="form-field">
                日期
                <input
                  type="date"
                  value={editForm.source_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, source_date: e.target.value }))}
                />
              </label>
              <label className="form-field">
                题号
                <input
                  value={editForm.source_question_no}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, source_question_no: e.target.value }))}
                />
              </label>
              <label className="form-field">
                更换图片
                <input type="file" accept="image/*" onChange={(e) => setEditImageFile(e.target.files?.[0] || null)} />
              </label>
              <div className="action-row">
                <button type="button" className="btn btn-primary" onClick={saveEdit}>
                  保存修改
                </button>
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  取消
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

export default App;
