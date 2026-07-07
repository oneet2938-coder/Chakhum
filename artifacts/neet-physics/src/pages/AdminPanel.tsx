import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, TrendingUp, ClipboardList, ChevronDown, ChevronUp,
  LogOut, Phone, CheckCircle2, XCircle, Target, Settings, Save,
  RefreshCw, Trophy, ShieldCheck, ShieldX, Clock, IndianRupee, ArrowLeftRight, Trash2,
  Sparkles, CalendarDays, Plus, ImageUp, FileText, Eye, BookOpen, AlertCircle,
  Bot, Search, Copy, Filter, ChevronLeft, ChevronRight, X, Database,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getRankForQuestions, RANKS } from "@/lib/ranks";
import RankBadge, { RankIcon } from "@/components/RankBadge";

interface StudentStat {
  id: number;
  name: string;
  phone: string;
  courseType: string;
  status: string;
  joinedAt: string;
  testCount: number;
  avgScore: number;
  bestScore: number;
  totalQuestions: number;
  accuracy: number;
  lastActivity: string | null;
}

interface Overview {
  totalStudents: number;
  totalAttempts: number;
  avgScore: number;
  topTopics: { name: string; accuracy: number; attempts: number }[];
}

interface StudentAttempt {
  id: number;
  testTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSeconds: number;
  completedAt: string;
}

interface DailyReportRow {
  id: number;
  name: string;
  phone: string;
  questionsToday: number;
  fromTests: number;
  fromPractice: number;
  target: number;
  completed: boolean;
  remaining: number;
}

interface LeaderboardRow {
  id: number;
  name: string;
  phone: string;
  totalQuestions: number;
  diamonds: number;
  rank: { level: number; title: string; color: string; bg: string; border: string; icon: string };
  position: number;
}

interface TopStudentTopic {
  topicName: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface TopStudentData {
  id: number;
  name: string;
  phone: string;
  totalQuestions: number;
  diamonds: number;
  activeDays: number;
  avgPerDay: number;
  testCount: number;
  avgScore: number;
  bestScore: number;
  topicStats: TopStudentTopic[];
  weakTopics: TopStudentTopic[];
  strongTopics: TopStudentTopic[];
  recentActivity: { date: string; count: number }[];
}

interface PendingStudent {
  id: number;
  name: string;
  phone: string;
  status: string;
  courseType: string;
  createdAt: string;
}

type Tab = "approvals" | "daily" | "students" | "overview" | "leaderboard" | "topstudents" | "dailypractice" | "aitools" | "tests" | "testseries" | "apisettings";

interface TestSeriesItem {
  id: number; title: string; description: string;
  price_rupees: number; is_published: boolean;
  sub_test_count: number; created_at: string;
}
interface SeriesTestItem {
  id: number; series_id: number; title: string; description: string;
  topic_ids: number[]; duration_minutes: number; total_marks: number;
  order_index: number; scheduled_at: string | null;
}

interface GeneratedMCQ {
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  difficulty: string;
}

interface ManualQuestion {
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  difficulty: string;
  imageB64?: string | null;
  imageMime?: string;
  imageName?: string | null;
}

function parseGeminiPaste(raw: string): ManualQuestion[] {
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/\*\*/g, "").trim());
  const questions: ManualQuestion[] = [];
  let current: { text: string; options: string[]; correctOption?: number; explanation?: string } | null = null;
  let mode: "question" | "explanation" | null = null;

  const questionStart = /^(?:q(?:uestion)?\.?\s*\d+\s*[:.)]?|(\d+)\s*[.)])\s*(.*)$/i;
  const optionLine = /^[(\[]?([a-dA-D])[)\].:]\s*(.+)$/;
  const answerLine = /^(?:correct\s*answer|correct\s*option|answer|ans)\s*[:\-]?\s*\(?([a-dA-D])\)?\.?\s*(.*)$/i;
  const explanationLine = /^(?:explanation|reason|solution)\s*[:\-]?\s*(.*)$/i;

  function pushCurrent() {
    if (current && current.text.trim() && current.options.filter(Boolean).length >= 2) {
      const opts = [...current.options];
      while (opts.length < 4) opts.push("");
      questions.push({
        text: current.text.trim(),
        options: opts.slice(0, 4),
        correctOption: current.correctOption ?? 0,
        explanation: current.explanation?.trim() ?? "",
        difficulty: "medium",
      });
    }
    current = null;
    mode = null;
  }

  for (const line of lines) {
    if (!line) continue;
    const qMatch = line.match(questionStart);
    const optMatch = line.match(optionLine);
    const ansMatch = line.match(answerLine);
    const expMatch = line.match(explanationLine);

    if (qMatch && !optMatch) {
      pushCurrent();
      current = { text: qMatch[2] || "", options: [] };
      mode = "question";
      continue;
    }

    if (!current) {
      current = { text: line, options: [] };
      mode = "question";
      continue;
    }

    if (optMatch) {
      const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65;
      current.options[idx] = optMatch[2].trim();
      mode = null;
      continue;
    }

    if (ansMatch) {
      const idx = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
      current.correctOption = idx;
      mode = null;
      continue;
    }

    if (expMatch) {
      current.explanation = (current.explanation ? current.explanation + " " : "") + expMatch[1];
      mode = "explanation";
      continue;
    }

    if (mode === "explanation") {
      current.explanation = (current.explanation ? current.explanation + " " : "") + line;
    } else if (mode === "question") {
      current.text = (current.text ? current.text + " " : "") + line;
    }
  }
  pushCurrent();
  return questions;
}

interface PracticeSetRow {
  id: number;
  title: string;
  description: string;
  practice_date: string;
  question_count: number;
  completion_count: number;
}

interface TopicOption { id: number; name: string; subject?: string; }
interface SubtopicOption { id: number; name: string; }

const SUBJECT_GROUP_LABEL: Record<string, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
};

function TopicSelectOptions({ topics }: { topics: TopicOption[] }) {
  const groups: Record<string, TopicOption[]> = {};
  for (const t of topics) {
    const key = t.subject ?? "physics";
    (groups[key] ??= []).push(t);
  }
  const order = ["physics", "chemistry", "biology"];
  const keys = [...order.filter((k) => groups[k]), ...Object.keys(groups).filter((k) => !order.includes(k))];
  return (
    <>
      {keys.map((key) => (
        <optgroup key={key} label={SUBJECT_GROUP_LABEL[key] ?? key}>
          {groups[key].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </optgroup>
      ))}
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("approvals");

  // Settings
  const [target, setTarget] = useState(20);
  const [targetInput, setTargetInput] = useState("20");
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);

  // Daily report
  const [dailyReport, setDailyReport] = useState<DailyReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState(true);

  // All students
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [mainLoading, setMainLoading] = useState(true);

  // Attempt drilldown
  const [expanded, setExpanded] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<Record<number, StudentAttempt[]>>({});
  const [loadingAttempts, setLoadingAttempts] = useState<Record<number, boolean>>({});

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Top Students
  const [topStudents, setTopStudents] = useState<TopStudentData[]>([]);
  const [tsLoading, setTsLoading] = useState(false);

  // Approvals
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  // Course type switching
  const [courseTypeLoading, setCourseTypeLoading] = useState<Record<number, boolean>>({});

  // Delete student
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<Record<number, boolean>>({});

  // AI Tools tab
  const [aiMode, setAiMode] = useState<"extractor" | "generator" | "manual">("extractor");
  const [aiText, setAiText] = useState("");
  const [aiImageB64, setAiImageB64] = useState<string | null>(null);
  const [aiImageMime, setAiImageMime] = useState<string>("image/jpeg");
  const [aiImageName, setAiImageName] = useState<string | null>(null);
  const [aiTopicId, setAiTopicId] = useState<number | "">("");
  const [aiSubtopicId, setAiSubtopicId] = useState<number | "">("");
  const [aiCount, setAiCount] = useState(10);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState<GeneratedMCQ[]>([]);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiTopics, setAiTopics] = useState<TopicOption[]>([]);
  const [aiSubtopics, setAiSubtopics] = useState<SubtopicOption[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Smart MCQ Extractor (2-step flow)
  type ExtractPhase = "input" | "analyzing" | "analyzed" | "extracting" | "extracted";
  const [extractPhase, setExtractPhase] = useState<ExtractPhase>("input");
  const [foundQuestions, setFoundQuestions] = useState<{ number: number; preview: string; topic: string }[]>([]);
  const [selectedQNums, setSelectedQNums] = useState<Set<number>>(new Set());
  const [extractError, setExtractError] = useState<string | null>(null);

  // AI Agent tab
  const [agentInstruction, setAgentInstruction] = useState("");
  const [agentTopicId, setAgentTopicId] = useState<number | "">("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResults, setAgentResults] = useState<any[]>([]);
  const [agentReasoning, setAgentReasoning] = useState("");
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentCopied, setAgentCopied] = useState(false);

  // Manual Add tab
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([]);
  const [manualPasteText, setManualPasteText] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const manualImageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // API Key settings
  const [keyStatus, setKeyStatus] = useState<{ hasEnvKey: boolean; hasDbKey: boolean; maskedKey: string | null } | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState(false);

  // Question Bank (Overview tab)
  interface QBQuestion {
    id: number; topicId: number; topicName: string; text: string;
    options: string[]; correctOption: number; explanation: string; difficulty: string;
  }
  const [qbQuestions, setQbQuestions] = useState<QBQuestion[]>([]);
  const [qbLoading, setQbLoading] = useState(false);
  const [qbSearch, setQbSearch] = useState("");
  const [qbTopicFilter, setQbTopicFilter] = useState<number | "">("");
  const [qbDiffFilter, setQbDiffFilter] = useState("");
  const [qbPage, setQbPage] = useState(1);
  const [qbExpanded, setQbExpanded] = useState<number | null>(null);
  const [qbDeleteConfirm, setQbDeleteConfirm] = useState<number | null>(null);
  const [qbTopics, setQbTopics] = useState<TopicOption[]>([]);
  const QB_PAGE_SIZE = 20;

  // Tests tab
  interface AdminTest {
    id: number; title: string; description: string; test_type: string;
    question_count: number; duration_minutes: number; difficulty: string;
    scheduled_date: string | null;
  }
  const [testsList, setTestsList] = useState<AdminTest[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [testDesc, setTestDesc] = useState("");
  const [testType, setTestType] = useState<"short" | "long" | "mastery_chapter">("short");
  const [testQIds, setTestQIds] = useState("");
  const [testDuration, setTestDuration] = useState(45);
  const [testDifficulty, setTestDifficulty] = useState("mixed");
  const [testCreating, setTestCreating] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testDeleteConfirm, setTestDeleteConfirm] = useState<number | null>(null);
  const [testEditId, setTestEditId] = useState<number | null>(null);
  const [testEditQIds, setTestEditQIds] = useState("");
  const [testEditSaving, setTestEditSaving] = useState(false);

  // Daily Practice tab
  const [dpSets, setDpSets] = useState<PracticeSetRow[]>([]);
  const [dpLoading, setDpLoading] = useState(false);
  const [dpTitle, setDpTitle] = useState("");
  const [dpDesc, setDpDesc] = useState("");
  const [dpDate, setDpDate] = useState(new Date().toISOString().split("T")[0]);
  const [dpQIds, setDpQIds] = useState("");
  const [dpCreating, setDpCreating] = useState(false);
  const [dpError, setDpError] = useState<string | null>(null);
  const [dpDeleteConfirm, setDpDeleteConfirm] = useState<number | null>(null);

  // Test Series tab
  const [seriesList, setSeriesList] = useState<TestSeriesItem[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [seriesTests, setSeriesTests] = useState<SeriesTestItem[]>([]);
  const [seriesTestsLoading, setSeriesTestsLoading] = useState(false);
  const [seriesTopics, setSeriesTopics] = useState<TopicOption[]>([]);
  // Create series form
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesDesc, setNewSeriesDesc] = useState("");
  const [newSeriesPrice, setNewSeriesPrice] = useState(0);
  const [seriesCreating, setSeriesCreating] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [seriesDeleteConfirm, setSeriesDeleteConfirm] = useState<number | null>(null);
  // Add sub-test form
  const [stTitle, setStTitle] = useState("");
  const [stDesc, setStDesc] = useState("");
  const [stTopicIds, setStTopicIds] = useState<number[]>([]);
  const [stDuration, setStDuration] = useState(60);
  const [stMarks, setStMarks] = useState(100);
  const [stScheduled, setStScheduled] = useState("");
  const [stCreating, setStCreating] = useState(false);
  const [stError, setStError] = useState<string | null>(null);
  const [stDeleteConfirm, setStDeleteConfirm] = useState<number | null>(null);
  // Edit series inline
  const [editSeriesId, setEditSeriesId] = useState<number | null>(null);
  const [editSeriesTitle, setEditSeriesTitle] = useState("");
  const [editSeriesDesc, setEditSeriesDesc] = useState("");
  const [editSeriesPrice, setEditSeriesPrice] = useState(0);
  const [editSeriesSaving, setEditSeriesSaving] = useState(false);

  const fetchSeriesList = useCallback(async () => {
    setSeriesLoading(true);
    const data = await fetch("/api/admin/test-series").then((r) => r.json());
    setSeriesList(Array.isArray(data) ? data : []);
    setSeriesLoading(false);
  }, []);

  const fetchSeriesTests = useCallback(async (sid: number) => {
    setSeriesTestsLoading(true);
    const data = await fetch(`/api/admin/test-series/${sid}/tests`).then((r) => r.json());
    setSeriesTests(Array.isArray(data) ? data : []);
    setSeriesTestsLoading(false);
  }, []);

  useEffect(() => {
    if (tab !== "testseries") return;
    fetchSeriesList();
    fetch("/api/topics").then((r) => r.json()).then(setSeriesTopics);
  }, [tab, fetchSeriesList]);

  useEffect(() => {
    if (selectedSeriesId !== null) fetchSeriesTests(selectedSeriesId);
    else setSeriesTests([]);
  }, [selectedSeriesId, fetchSeriesTests]);

  async function createSeries() {
    if (!newSeriesTitle.trim()) { setSeriesError("Title required"); return; }
    setSeriesCreating(true); setSeriesError(null);
    await fetch("/api/admin/test-series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSeriesTitle, description: newSeriesDesc, priceRupees: newSeriesPrice }),
    });
    setNewSeriesTitle(""); setNewSeriesDesc(""); setNewSeriesPrice(0);
    await fetchSeriesList();
    setSeriesCreating(false);
  }

  async function togglePublish(s: TestSeriesItem) {
    await fetch(`/api/admin/test-series/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !s.is_published }),
    });
    await fetchSeriesList();
  }

  async function deleteSeries(id: number) {
    await fetch(`/api/admin/test-series/${id}`, { method: "DELETE" });
    if (selectedSeriesId === id) setSelectedSeriesId(null);
    setSeriesDeleteConfirm(null);
    await fetchSeriesList();
  }

  async function saveEditSeries() {
    if (!editSeriesId) return;
    setEditSeriesSaving(true);
    await fetch(`/api/admin/test-series/${editSeriesId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editSeriesTitle, description: editSeriesDesc, priceRupees: editSeriesPrice }),
    });
    setEditSeriesId(null);
    setEditSeriesSaving(false);
    await fetchSeriesList();
  }

  async function addSeriesTest() {
    if (!selectedSeriesId || !stTitle.trim()) { setStError("Title required"); return; }
    setStCreating(true); setStError(null);
    await fetch(`/api/admin/test-series/${selectedSeriesId}/tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: stTitle, description: stDesc, topicIds: stTopicIds,
        durationMinutes: stDuration, totalMarks: stMarks,
        scheduledAt: stScheduled || null,
      }),
    });
    setStTitle(""); setStDesc(""); setStTopicIds([]); setStDuration(60); setStMarks(100); setStScheduled("");
    await fetchSeriesTests(selectedSeriesId);
    setStCreating(false);
  }

  async function deleteSeriesTest(tid: number) {
    if (!selectedSeriesId) return;
    await fetch(`/api/admin/test-series/${selectedSeriesId}/tests/${tid}`, { method: "DELETE" });
    setStDeleteConfirm(null);
    await fetchSeriesTests(selectedSeriesId);
  }

  const fetchApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    const data = await fetch("/api/admin/approvals").then((r) => r.json());
    setPendingStudents(Array.isArray(data) ? data : []);
    setApprovalsLoading(false);
  }, []);

  const fetchDailyReport = useCallback(async () => {
    setReportLoading(true);
    const data = await fetch("/api/admin/daily-report").then((r) => r.json());
    setDailyReport(data.report ?? []);
    setTarget(data.target ?? 20);
    setTargetInput(String(data.target ?? 20));
    setReportLoading(false);
  }, []);

  useEffect(() => {
    fetchDailyReport();
    Promise.all([
      fetch("/api/admin/students").then((r) => r.json()),
      fetch("/api/admin/overview").then((r) => r.json()),
    ]).then(([s, o]) => {
      setStudents(s);
      setOverview(o);
      setMainLoading(false);
    });
  }, [fetchDailyReport]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  useEffect(() => {
    if (tab !== "leaderboard") return;
    setLbLoading(true);
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => {
      setLeaderboard(d);
      setLbLoading(false);
    });
  }, [tab]);

  useEffect(() => {
    if (tab !== "topstudents") return;
    setTsLoading(true);
    fetch("/api/admin/top-students").then((r) => r.json()).then((d) => {
      setTopStudents(d);
      setTsLoading(false);
    });
  }, [tab]);

  async function approveStudent(id: number) {
    setActionLoading((p) => ({ ...p, [id]: true }));
    await fetch(`/api/admin/students/${id}/approve`, { method: "PUT" });
    await fetchApprovals();
    setActionLoading((p) => ({ ...p, [id]: false }));
  }

  async function rejectStudent(id: number) {
    setActionLoading((p) => ({ ...p, [id]: true }));
    await fetch(`/api/admin/students/${id}/reject`, { method: "PUT" });
    await fetchApprovals();
    setActionLoading((p) => ({ ...p, [id]: false }));
  }

  async function saveTarget() {
    const n = parseInt(targetInput);
    if (isNaN(n) || n < 1) return;
    setSavingTarget(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyPracticeTarget: n }),
    });
    setTarget(n);
    setSavingTarget(false);
    setTargetSaved(true);
    setTimeout(() => setTargetSaved(false), 2000);
    fetchDailyReport();
  }

  async function deleteStudent(id: number) {
    setDeleteLoading((p) => ({ ...p, [id]: true }));
    await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setDeleteConfirm(null);
    setDeleteLoading((p) => ({ ...p, [id]: false }));
    // Also remove from daily report
    setDailyReport((prev) => prev.filter((r) => r.id !== id));
  }

  async function switchCourseType(id: number, currentType: string) {
    const newType = currentType === "test_only" ? "foundation" : "test_only";
    setCourseTypeLoading((p) => ({ ...p, [id]: true }));
    await fetch(`/api/admin/students/${id}/course-type`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseType: newType }),
    });
    setStudents((prev) =>
      prev.map((s) => s.id === id ? { ...s, courseType: newType } : s)
    );
    // Refresh approvals in case a pending approval was created
    fetchApprovals();
    setCourseTypeLoading((p) => ({ ...p, [id]: false }));
  }

  async function toggleStudent(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!attempts[id]) {
      setLoadingAttempts((p) => ({ ...p, [id]: true }));
      const data = await fetch(`/api/admin/students/${id}/attempts`).then((r) => r.json());
      setAttempts((p) => ({ ...p, [id]: data }));
      setLoadingAttempts((p) => ({ ...p, [id]: false }));
    }
  }

  // Load topics for AI Tools
  useEffect(() => {
    if (tab !== "aitools") return;
    fetch("/api/topics").then((r) => r.json()).then(setAiTopics);
  }, [tab]);

  // Load subtopics when topic changes
  useEffect(() => {
    if (!aiTopicId) { setAiSubtopics([]); setAiSubtopicId(""); return; }
    fetch(`/api/topics/${aiTopicId}`).then((r) => r.json()).then((d) => {
      setAiSubtopics(d.subtopics ?? []);
      setAiSubtopicId("");
    });
  }, [aiTopicId]);

  // Question Bank fetch
  const fetchQB = useCallback(async () => {
    setQbLoading(true);
    const params = new URLSearchParams({ limit: "2000" });
    if (qbTopicFilter) params.set("topicId", String(qbTopicFilter));
    if (qbDiffFilter) params.set("difficulty", qbDiffFilter);
    const data = await fetch(`/api/questions?${params}`).then((r) => r.json());
    setQbQuestions(Array.isArray(data) ? data : []);
    setQbPage(1);
    setQbLoading(false);
  }, [qbTopicFilter, qbDiffFilter]);

  useEffect(() => {
    if (tab !== "overview") return;
    fetchQB();
    fetch("/api/topics").then((r) => r.json()).then(setQbTopics);
  }, [tab, fetchQB]);

  async function deleteQuestion(id: number) {
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    setQbQuestions((prev) => prev.filter((q) => q.id !== id));
    setQbDeleteConfirm(null);
    if (qbExpanded === id) setQbExpanded(null);
  }

  // Load daily practice sets
  const fetchDpSets = useCallback(async () => {
    setDpLoading(true);
    const data = await fetch("/api/admin/practice-sets").then((r) => r.json());
    setDpSets(Array.isArray(data) ? data : []);
    setDpLoading(false);
  }, []);

  useEffect(() => {
    if (tab !== "dailypractice") return;
    fetchDpSets();
  }, [tab, fetchDpSets]);

  const fetchTests = useCallback(async () => {
    setTestsLoading(true);
    try {
      const data = await fetch("/api/admin/tests").then(r => r.json());
      setTestsList(Array.isArray(data) ? data : []);
    } catch { setTestsList([]); }
    setTestsLoading(false);
  }, []);

  useEffect(() => {
    if (tab !== "tests") return;
    fetchTests();
  }, [tab, fetchTests]);

  async function createAdminTest() {
    if (!testTitle.trim()) { setTestError("Title is required"); return; }
    const ids = testQIds.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (!ids.length) { setTestError("Enter at least one question ID"); return; }
    setTestCreating(true); setTestError(null);
    const res = await fetch("/api/admin/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: testTitle, description: testDesc, testType, questionIds: ids, durationMinutes: testDuration, difficulty: testDifficulty }),
    });
    const data = await res.json();
    setTestCreating(false);
    if (!res.ok) { setTestError(data.error ?? "Failed to create"); return; }
    setTestTitle(""); setTestDesc(""); setTestQIds(""); fetchTests();
  }

  async function deleteAdminTest(id: number) {
    await fetch(`/api/admin/tests/${id}`, { method: "DELETE" });
    setTestDeleteConfirm(null); fetchTests();
  }

  async function saveTestQuestions(id: number) {
    const ids = testEditQIds.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (!ids.length) return;
    setTestEditSaving(true);
    await fetch(`/api/admin/tests/${id}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: ids }),
    });
    setTestEditSaving(false); setTestEditId(null); setTestEditQIds(""); fetchTests();
  }

  function handleImageUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const b64 = result.split(",")[1];
      setAiImageB64(b64);
      setAiImageMime(file.type);
      setAiImageName(file.name);
      setPdfName(null);
    };
    reader.readAsDataURL(file);
  }

  async function handlePdfUpload(file: File) {
    setPdfParsing(true);
    setPdfName(file.name);
    setAiImageB64(null);
    setAiImageName(null);
    setAiText("");
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch("/api/ai/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.text || data.text.length < 20) {
        throw new Error("Could not extract readable text from this PDF. Try uploading a photo/scan instead using the image button.");
      }
      setAiText(data.text);
    } catch (e: any) {
      setAiError(e.message ?? "PDF parsing failed");
      setPdfName(null);
    } finally {
      setPdfParsing(false);
    }
  }

  async function generateMCQs() {
    if (!aiText && !aiImageB64) return;
    setAiLoading(true);
    setAiError(null);
    setAiGenerated([]);
    try {
      const res = await fetch("/api/ai/generate-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: aiText || undefined,
          imageBase64: aiImageB64 || undefined,
          imageMediaType: aiImageMime || undefined,
          topicId: aiTopicId || undefined,
          subtopicId: aiSubtopicId || undefined,
          count: aiCount,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiGenerated(data.questions ?? []);
    } catch (e: any) {
      setAiError(e.message ?? "Generation failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function analyzeContent() {
    if (!aiText && !aiImageB64) return;
    setExtractPhase("analyzing");
    setExtractError(null);
    setFoundQuestions([]);
    setSelectedQNums(new Set());
    setAiGenerated([]);
    try {
      const res = await fetch("/api/ai/analyze-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText || undefined, imageBase64: aiImageB64 || undefined, imageMediaType: aiImageMime || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const list = data.found ?? [];
      setFoundQuestions(list);
      setSelectedQNums(new Set(list.map((q: any) => q.number)));
      setExtractPhase("analyzed");
    } catch (e: any) {
      setExtractError(e.message ?? "Analysis failed");
      setExtractPhase("input");
    }
  }

  async function extractSelected() {
    if (!selectedQNums.size) return;
    setExtractPhase("extracting");
    setExtractError(null);
    try {
      const res = await fetch("/api/ai/extract-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: aiText || undefined,
          imageBase64: aiImageB64 || undefined,
          imageMediaType: aiImageMime || undefined,
          selectedNumbers: Array.from(selectedQNums).sort((a, b) => a - b),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiGenerated(data.questions ?? []);
      setExtractPhase("extracted");
    } catch (e: any) {
      setExtractError(e.message ?? "Extraction failed");
      setExtractPhase("analyzed");
    }
  }

  function resetExtractor() {
    setExtractPhase("input");
    setFoundQuestions([]);
    setSelectedQNums(new Set());
    setAiGenerated([]);
    setExtractError(null);
    setAiSaved(false);
  }

  async function saveMCQs() {
    if (!aiGenerated.length || !aiTopicId) return;
    setAiSaving(true);
    const res = await fetch("/api/ai/save-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: aiGenerated.map((q: any) => ({
          ...q,
          // When source was an image upload, attach it to every question so students
          // always see the diagram/circuit/figure the question refers to.
          imageB64: aiImageB64 ? aiImageB64 : (q.imageB64 ?? undefined),
        })),
        topicId: aiTopicId,
        subtopicId: aiSubtopicId || undefined,
      }),
    });
    const data = await res.json();
    setAiSaving(false);
    if (data.saved) { setAiSaved(true); setAiGenerated([]); setAiText(""); setAiImageB64(null); setAiImageName(null); setTimeout(() => setAiSaved(false), 3000); }
  }

  async function runAgent() {
    if (!agentInstruction.trim()) return;
    setAgentLoading(true);
    setAgentError(null);
    setAgentResults([]);
    setAgentReasoning("");
    try {
      const res = await fetch("/api/ai/agent-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: agentInstruction,
          topicId: agentTopicId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Agent failed");
      setAgentResults(data.questions ?? []);
      setAgentReasoning(data.reasoning ?? "");
    } catch (e: any) {
      setAgentError(e.message ?? "Agent failed");
    } finally {
      setAgentLoading(false);
    }
  }

  function copyAgentIds() {
    const ids = agentResults.map((q) => q.id).join(", ");
    navigator.clipboard.writeText(ids);
    setAgentCopied(true);
    setTimeout(() => setAgentCopied(false), 2000);
  }

  function addBlankManualQuestion() {
    setManualQuestions((prev) => [
      ...prev,
      { text: "", options: ["", "", "", ""], correctOption: 0, explanation: "", difficulty: "medium", imageB64: null, imageName: null },
    ]);
  }

  function parseManualPaste() {
    setManualError(null);
    const parsed = parseGeminiPaste(manualPasteText);
    if (!parsed.length) {
      setManualError("Couldn't detect any questions in the pasted text. Try the format: question, then A) B) C) D) options, then Answer: B, then Explanation: …");
      return;
    }
    setManualQuestions((prev) => [...prev, ...parsed]);
    setManualPasteText("");
  }

  function updateManualQuestion(idx: number, patch: Partial<ManualQuestion>) {
    setManualQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function updateManualOption(idx: number, optIdx: number, value: string) {
    setManualQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, options: q.options.map((o, oi) => (oi === optIdx ? value : o)) } : q))
    );
  }

  function removeManualQuestion(idx: number) {
    setManualQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleManualImageUpload(idx: number, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const b64 = result.split(",")[1];
      updateManualQuestion(idx, { imageB64: b64, imageMime: file.type, imageName: file.name });
    };
    reader.readAsDataURL(file);
  }

  async function saveManualQuestions() {
    if (!manualQuestions.length || !aiTopicId) { setManualError("Select a topic and add at least one question."); return; }
    const invalid = manualQuestions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()) || !q.explanation.trim());
    if (invalid) { setManualError("Every question needs text, all 4 options filled in, and an explanation."); return; }

    setManualSaving(true);
    setManualError(null);
    try {
      const res = await fetch("/api/ai/save-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: manualQuestions.map((q) => ({
            text: q.text,
            options: q.options,
            correctOption: q.correctOption,
            explanation: q.explanation,
            difficulty: q.difficulty,
            imageB64: q.imageB64 ?? undefined,
          })),
          topicId: aiTopicId,
          subtopicId: aiSubtopicId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setManualSaved(true);
      setManualQuestions([]);
      setTimeout(() => setManualSaved(false), 3000);
    } catch (e: any) {
      setManualError(e.message ?? "Save failed");
    } finally {
      setManualSaving(false);
    }
  }

  async function fetchKeyStatus() {
    try {
      const res = await fetch("/api/admin/settings/openai-key");
      if (res.ok) setKeyStatus(await res.json());
    } catch {}
  }

  async function saveApiKey() {
    if (!newApiKey.trim()) return;
    setSavingKey(true);
    setKeyError(null);
    try {
      const res = await fetch("/api/admin/settings/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newApiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setKeySaved(true);
      setNewApiKey("");
      setTimeout(() => setKeySaved(false), 3000);
      fetchKeyStatus();
    } catch (e: any) {
      setKeyError(e.message ?? "Save failed");
    } finally {
      setSavingKey(false);
    }
  }

  async function removeApiKey() {
    setRemovingKey(true);
    try {
      await fetch("/api/admin/settings/openai-key", { method: "DELETE" });
      fetchKeyStatus();
    } finally {
      setRemovingKey(false);
    }
  }

  async function createPracticeSet() {
    if (!dpTitle || !dpDate || !dpQIds.trim()) { setDpError("Fill in title, date, and question IDs"); return; }
    const ids = dpQIds.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (!ids.length) { setDpError("Enter valid question IDs"); return; }
    setDpCreating(true);
    setDpError(null);
    const res = await fetch("/api/admin/practice-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: dpTitle, description: dpDesc, practiceDate: dpDate, questionIds: ids }),
    });
    if (res.ok) { setDpTitle(""); setDpDesc(""); setDpQIds(""); fetchDpSets(); }
    else {
      try { const d = await res.json(); setDpError(d.error ?? "Failed to create"); }
      catch { setDpError("Server error — check question IDs are valid"); }
    }
    setDpCreating(false);
  }

  async function deletePracticeSet(id: number) {
    await fetch(`/api/admin/practice-sets/${id}`, { method: "DELETE" });
    setDpDeleteConfirm(null);
    fetchDpSets();
  }

  const completedCount = dailyReport.filter((r) => r.completed).length;
  const pendingCount = dailyReport.filter((r) => !r.completed).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="EMC" className="w-7 h-7 rounded-md object-contain" />
          <div>
            <span className="text-sm font-bold text-foreground">EMC Admin Panel</span>
            <span className="ml-2 text-xs bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-semibold">TEACHER</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            Signed in as <span className="text-foreground font-medium">{user?.name}</span>
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 hover:border-primary/40 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-5">

        {/* ── Settings bar ── */}
        <div className="bg-card border border-card-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Settings className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Daily Practice Target</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex items-center">
              <Target className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="number"
                min={1}
                max={200}
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-24 bg-muted/50 border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>
            <span className="text-xs text-muted-foreground">questions per day</span>
            <button
              onClick={saveTarget}
              disabled={savingTarget || parseInt(targetInput) === target}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all",
                targetSaved
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-primary/10 border-primary/25 text-primary hover:bg-primary/20 disabled:opacity-40"
              )}
            >
              {targetSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {targetSaved ? "Saved!" : savingTarget ? "Saving…" : "Save"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Current target: <span className="text-foreground font-semibold">{target} questions</span>
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-muted/40 border border-border rounded-lg p-1 w-fit flex-wrap">
          {([ ["approvals", "✅ Approvals"], ["daily", "Daily Report"], ["students", "All Students"], ["overview", "Overview"], ["leaderboard", "💎 Leaderboard"], ["topstudents", "🏅 Top Students"], ["tests", "📝 Tests"], ["testseries", "📋 Test Series"], ["dailypractice", "📅 Daily Practice"], ["aitools", "🤖 AI Tools"], ["apisettings", "🔑 API Key"] ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); if (id === "apisettings") fetchKeyStatus(); }}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all relative",
                tab === id
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground",
                id === "leaderboard" && tab !== "leaderboard" && "text-yellow-500/80 hover:text-yellow-400",
                id === "topstudents" && tab !== "topstudents" && "text-orange-400/80 hover:text-orange-400",
                id === "approvals" && tab !== "approvals" && "text-emerald-400/80 hover:text-emerald-400"
              )}
            >
              {label}
              {id === "approvals" && pendingStudents.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {pendingStudents.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Approvals Tab ── */}
        {tab === "approvals" && (
          <div className="space-y-4">
            {/* Hero: Mastery Test Series info */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/25 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Paid Test Series</p>
                  <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Every Saturday</span>
                </div>
                <h3 className="text-lg font-black text-foreground">Mastery Test Series</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Approve students who have paid ₹5,000 to grant full access</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-center gap-1 text-primary">
                  <IndianRupee className="w-5 h-5" />
                  <span className="text-2xl font-black">5,000</span>
                </div>
                <p className="text-[10px] text-muted-foreground">per year / student</p>
              </div>
            </div>

            {/* Pending list */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-foreground">Pending Approvals</h3>
                  {pendingStudents.length > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {pendingStudents.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={fetchApprovals}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", approvalsLoading && "animate-spin")} />
                  Refresh
                </button>
              </div>

              {approvalsLoading ? (
                <div className="space-y-px">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : pendingStudents.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No students waiting for approval.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingStudents.map((s) => (
                    <div key={s.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-amber-400">{s.name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                          <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">MASTERY</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />{s.phone}
                          <span className="mx-1 text-border">·</span>
                          Registered {formatDate(s.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => approveStudent(s.id)}
                          disabled={actionLoading[s.id]}
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {actionLoading[s.id] ? "…" : "Approve"}
                        </button>
                        <button
                          onClick={() => rejectStudent(s.id)}
                          disabled={actionLoading[s.id]}
                          className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 transition-all disabled:opacity-50"
                        >
                          <ShieldX className="w-3.5 h-3.5" />
                          {actionLoading[s.id] ? "…" : "Reject"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="bg-card border border-card-border rounded-xl p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">How approval works</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { n: "1", title: "Student registers", desc: "Student enters name & phone — access is locked" },
                  { n: "2", title: "Student pays ₹5,000", desc: "Online (UPI) or offline cash to teacher" },
                  { n: "3", title: "Teacher approves", desc: "Click Approve here — student gets instant full access" },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="bg-muted/30 rounded-lg p-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-black flex items-center justify-center mb-2">{n}</div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">{title}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Daily Report Tab ── */}
        {tab === "daily" && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-card-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Today's Target</p>
                </div>
                <p className="text-3xl font-bold text-foreground tabular-nums">{target}</p>
                <p className="text-xs text-muted-foreground mt-0.5">questions / student</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-emerald-300 font-medium uppercase tracking-wider">Completed</p>
                </div>
                <p className="text-3xl font-bold text-emerald-400 tabular-nums">{completedCount}</p>
                <p className="text-xs text-emerald-300/70 mt-0.5">of {dailyReport.length} students</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <p className="text-xs text-rose-300 font-medium uppercase tracking-wider">Pending</p>
                </div>
                <p className="text-3xl font-bold text-rose-400 tabular-nums">{pendingCount}</p>
                <p className="text-xs text-rose-300/70 mt-0.5">haven't completed yet</p>
              </div>
            </div>

            {/* Report table */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  Today's Practice Report
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    ({new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" })})
                  </span>
                </h3>
                <button
                  onClick={fetchDailyReport}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", reportLoading && "animate-spin")} />
                  Refresh
                </button>
              </div>

              {reportLoading ? (
                <div className="space-y-px">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : dailyReport.length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No students registered yet.</p>
                </div>
              ) : (() => {
                const pending = dailyReport.filter((r) => !r.completed).sort((a, b) => a.questionsToday - b.questionsToday);
                const completed = dailyReport.filter((r) => r.completed).sort((a, b) => b.questionsToday - a.questionsToday);

                const renderRow = (row: DailyReportRow) => (
                  <div key={row.id} className={cn(
                    "flex items-center gap-4 px-4 py-3 transition-colors",
                    row.completed ? "bg-emerald-500/5 hover:bg-emerald-500/8" : "bg-rose-500/5 hover:bg-rose-500/8"
                  )}>
                    {row.completed
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      : <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    }
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                      row.completed ? "bg-emerald-500/20" : "bg-rose-500/20"
                    )}>
                      <span className={cn("text-[10px] font-bold",
                        row.completed ? "text-emerald-400" : "text-rose-400"
                      )}>{row.name[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{row.name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />{row.phone}
                      </p>
                    </div>

                    {/* Question breakdown */}
                    <div className="hidden sm:flex items-center gap-3 shrink-0 text-center">
                      <div>
                        <p className="text-xs font-bold tabular-nums text-foreground">{row.fromPractice ?? 0}</p>
                        <p className="text-[9px] text-muted-foreground">practice</p>
                      </div>
                      <div className="text-muted-foreground/40 text-xs">+</div>
                      <div>
                        <p className="text-xs font-bold tabular-nums text-foreground">{row.fromTests ?? 0}</p>
                        <p className="text-[9px] text-muted-foreground">tests</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-28 shrink-0">
                      <div className="flex justify-between mb-1">
                        <span className={cn("text-[10px] font-semibold tabular-nums",
                          row.completed ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {row.questionsToday} / {row.target}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {Math.min(100, Math.round((row.questionsToday / row.target) * 100))}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all",
                            row.completed ? "bg-emerald-500" : row.questionsToday > 0 ? "bg-amber-400" : "bg-rose-500/50"
                          )}
                          style={{ width: `${Math.min(100, (row.questionsToday / row.target) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="w-32 shrink-0 text-right">
                      {row.completed ? (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-md whitespace-nowrap">
                          ✓ Done
                        </span>
                      ) : row.questionsToday === 0 ? (
                        <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md whitespace-nowrap">
                          Not started
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md whitespace-nowrap">
                          {row.remaining} more
                        </span>
                      )}
                    </div>
                  </div>
                );

                return (
                  <div>
                    {/* ── PENDING SECTION ── */}
                    {pending.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border-b border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                            Pending
                          </span>
                          <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums">
                            {pending.length}
                          </span>
                        </div>
                        <div className="divide-y divide-rose-500/10">
                          {pending.map(renderRow)}
                        </div>
                      </div>
                    )}

                    {/* ── COMPLETED SECTION ── */}
                    {completed.length > 0 && (
                      <div className={cn(pending.length > 0 && "border-t-2 border-border")}>
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            Completed
                          </span>
                          <span className="ml-auto bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums">
                            {completed.length}
                          </span>
                        </div>
                        <div className="divide-y divide-emerald-500/10">
                          {completed.map(renderRow)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── All Students Tab ── */}
        {tab === "students" && (
          <div className="space-y-2">
            {mainLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : students.length === 0 ? (
              <div className="bg-card border border-card-border rounded-lg p-8 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No students registered yet.</p>
              </div>
            ) : (() => {
              const pendingIds = new Set(dailyReport.filter(r => !r.completed).map(r => r.id));
              const completedIds = new Set(dailyReport.filter(r => r.completed).map(r => r.id));
              const sortedStudents = [...students].sort((a, b) => {
                const aP = pendingIds.has(a.id) ? 0 : completedIds.has(b.id) ? 1 : 2;
                const bP = pendingIds.has(b.id) ? 0 : completedIds.has(a.id) ? 1 : 2;
                return aP - bP;
              });
              return sortedStudents.map((s, idx) => {
                const dailyRow = dailyReport.find(r => r.id === s.id);
                const isPending = pendingIds.has(s.id);
                const isDone = completedIds.has(s.id);
                return (
                <div key={s.id} className="bg-card border border-card-border rounded-lg overflow-hidden">
                  <div
                    onClick={() => toggleStudent(s.id)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      isDone ? "bg-emerald-500/20" : isPending ? "bg-rose-500/20" : "bg-primary/20"
                    )}>
                      <span className={cn("text-xs font-bold",
                        isDone ? "text-emerald-400" : isPending ? "text-rose-400" : "text-primary"
                      )}>{s.name[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                        {s.courseType === "test_only"
                          ? <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full shrink-0">TEST SERIES</span>
                          : <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full shrink-0">FOUNDATION</span>
                        }
                        <button
                          onClick={(e) => { e.stopPropagation(); switchCourseType(s.id, s.courseType); }}
                          disabled={courseTypeLoading[s.id]}
                          title={s.courseType === "test_only" ? "Switch to Foundation" : "Switch to Test Series"}
                          className={cn(
                            "flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-all shrink-0",
                            courseTypeLoading[s.id]
                              ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/10"
                          )}
                        >
                          <ArrowLeftRight className="w-2.5 h-2.5" />
                          {courseTypeLoading[s.id] ? "…" : s.courseType === "test_only" ? "→ Foundation" : "→ Test Series"}
                        </button>
                        {deleteConfirm === s.id ? (
                          <span className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[9px] text-rose-400 font-bold">Remove?</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteStudent(s.id); }}
                              disabled={deleteLoading[s.id]}
                              className="text-[9px] font-black text-white bg-rose-500 px-1.5 py-0.5 rounded border border-rose-500 hover:bg-rose-600 transition-all disabled:opacity-50"
                            >
                              {deleteLoading[s.id] ? "…" : "Yes"}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                              className="text-[9px] font-bold text-muted-foreground border border-border px-1.5 py-0.5 rounded hover:text-foreground transition-all"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(s.id); }}
                            title="Remove student"
                            className="shrink-0 p-1 rounded text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {isDone && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 rounded-full">
                            ✓ TODAY
                          </span>
                        )}
                        {isPending && dailyRow && (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
                            {dailyRow.questionsToday === 0 ? "NOT STARTED" : `${dailyRow.questionsToday}/${dailyRow.target}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />{s.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 shrink-0 mr-2">
                      <div className="text-center">
                        <p className="text-sm font-bold tabular-nums text-foreground">{s.testCount}</p>
                        <p className="text-[10px] text-muted-foreground">tests</p>
                      </div>
                      <div className="text-center">
                        <p className={cn("text-sm font-bold tabular-nums",
                          s.accuracy >= 70 ? "text-emerald-400" :
                          s.accuracy >= 50 ? "text-amber-400" :
                          s.testCount > 0 ? "text-rose-400" : "text-muted-foreground"
                        )}>
                          {s.testCount > 0 ? `${s.accuracy}%` : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">accuracy</p>
                      </div>
                      <div className="text-center">
                        <p className={cn("text-sm font-bold tabular-nums",
                          s.bestScore >= 70 ? "text-primary" : "text-muted-foreground"
                        )}>
                          {s.testCount > 0 ? `${s.bestScore}%` : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">best</p>
                      </div>
                    </div>
                    {expanded === s.id
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </div>

                  {expanded === s.id && (
                    <div className="border-t border-border px-4 py-3">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDate(s.joinedAt)}
                          {s.lastActivity && ` · Last active ${formatDate(s.lastActivity)}`}
                        </p>
                        {s.testCount > 0 && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Avg: <span className="text-foreground font-semibold">{s.avgScore}%</span></span>
                            <span>Questions: <span className="text-foreground font-semibold">{s.totalQuestions}</span></span>
                          </div>
                        )}
                      </div>
                      {loadingAttempts[s.id] ? (
                        <div className="space-y-1.5">
                          {[...Array(2)].map((_, i) => <div key={i} className="h-9 bg-muted rounded animate-pulse" />)}
                        </div>
                      ) : (attempts[s.id] ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No tests taken yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {[...(attempts[s.id] ?? [])].reverse().map((a) => (
                            <div key={a.id} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{a.testTitle}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {a.correctAnswers}/{a.totalQuestions} correct · {formatTime(a.timeTakenSeconds)} · {formatDate(a.completedAt)}
                                </p>
                              </div>
                              <span className={cn("text-sm font-bold tabular-nums ml-3 shrink-0",
                                a.score >= 70 ? "text-emerald-400" : a.score >= 50 ? "text-amber-400" : "text-rose-400"
                              )}>
                                {a.score}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              });
            })()}
          </div>
        )}

        {/* ── Overview Tab ── */}
        {tab === "overview" && (
          <div className="space-y-4">
            {mainLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card border border-card-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-primary" />
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Students</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground tabular-nums">{overview?.totalStudents ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">registered</p>
                  </div>
                  <div className="bg-card border border-card-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="w-4 h-4 text-accent" />
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tests Taken</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground tabular-nums">{overview?.totalAttempts ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">total attempts</p>
                  </div>
                  <div className="bg-card border border-card-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg Score</p>
                    </div>
                    <p className={cn("text-3xl font-bold tabular-nums",
                      (overview?.avgScore ?? 0) >= 70 ? "text-emerald-400" :
                      (overview?.avgScore ?? 0) >= 50 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {overview?.avgScore ?? 0}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">class average</p>
                  </div>
                </div>

                {(overview?.topTopics?.length ?? 0) > 0 && (
                  <div className="bg-card border border-card-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Most Practiced Topics</h3>
                    <div className="space-y-2.5">
                      {overview?.topTopics.map((t) => (
                        <div key={t.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-foreground font-medium">{t.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {t.accuracy}% · {t.attempts} attempts
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full",
                                t.accuracy >= 70 ? "bg-emerald-500" :
                                t.accuracy >= 50 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${t.accuracy}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Question Bank ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Question Bank</h2>
                  <span className="text-xs bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold tabular-nums">
                    {qbQuestions.length} questions
                  </span>
                </div>
                <button
                  onClick={fetchQB}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", qbLoading && "animate-spin")} /> Refresh
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search questions…"
                    value={qbSearch}
                    onChange={(e) => { setQbSearch(e.target.value); setQbPage(1); }}
                    className="w-full pl-8 pr-3 py-2 bg-muted/40 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
                  />
                  {qbSearch && (
                    <button onClick={() => setQbSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <select
                  value={qbTopicFilter}
                  onChange={(e) => { setQbTopicFilter(e.target.value ? Number(e.target.value) : ""); setQbPage(1); }}
                  className="bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/60 min-w-[140px]"
                >
                  <option value="">All topics</option>
                  <TopicSelectOptions topics={qbTopics} />
                </select>
                <select
                  value={qbDiffFilter}
                  onChange={(e) => { setQbDiffFilter(e.target.value); setQbPage(1); }}
                  className="bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/60"
                >
                  <option value="">All difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Table */}
              <div className="bg-card border border-card-border rounded-xl overflow-hidden">
                {qbLoading ? (
                  <div className="space-y-px">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-muted/20 animate-pulse border-b border-border last:border-0" />)}
                  </div>
                ) : (() => {
                  const filtered = qbQuestions.filter((q) => {
                    const matchSearch = !qbSearch || q.text.toLowerCase().includes(qbSearch.toLowerCase()) || String(q.id).includes(qbSearch);
                    return matchSearch;
                  });
                  const totalPages = Math.max(1, Math.ceil(filtered.length / QB_PAGE_SIZE));
                  const paginated = filtered.slice((qbPage - 1) * QB_PAGE_SIZE, qbPage * QB_PAGE_SIZE);

                  if (filtered.length === 0) return (
                    <div className="py-14 text-center">
                      <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                      <p className="text-sm text-muted-foreground">No questions found.</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Try generating some in the AI Tools tab.</p>
                    </div>
                  );

                  return (
                    <>
                      <div className="divide-y divide-border">
                        {paginated.map((q) => (
                          <div key={q.id}>
                            {/* Row */}
                            <div
                              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/15 cursor-pointer transition-colors"
                              onClick={() => setQbExpanded(qbExpanded === q.id ? null : q.id)}
                            >
                              <span className="text-[11px] font-mono text-muted-foreground w-10 shrink-0 tabular-nums">#{q.id}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground truncate leading-relaxed">{q.text}</p>
                                <span className="text-[10px] text-muted-foreground/70">{q.topicName}</span>
                              </div>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider shrink-0",
                                q.difficulty === "easy" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                                q.difficulty === "hard" ? "bg-rose-500/15 text-rose-400 border-rose-500/25" :
                                "bg-amber-500/15 text-amber-400 border-amber-500/25"
                              )}>{q.difficulty}</span>
                              {qbExpanded === q.id
                                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              }
                            </div>

                            {/* Expanded detail */}
                            {qbExpanded === q.id && (
                              <div className="px-4 pb-4 pt-1 bg-muted/10 border-t border-border space-y-3">
                                <p className="text-sm text-foreground leading-relaxed">{q.text}</p>
                                <div className="space-y-1.5">
                                  {q.options.map((opt, i) => (
                                    <div key={i} className={cn(
                                      "flex items-center gap-2 px-3 py-1.5 rounded text-xs border",
                                      i === q.correctOption
                                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                                        : "bg-muted/30 border-border text-muted-foreground"
                                    )}>
                                      <span className="font-mono font-bold shrink-0 w-4">{String.fromCharCode(65 + i)}</span>
                                      <span>{opt}</span>
                                      {i === q.correctOption && <CheckCircle2 className="w-3 h-3 ml-auto shrink-0" />}
                                    </div>
                                  ))}
                                </div>
                                {q.explanation && (
                                  <div className="bg-muted/30 rounded-lg px-3 py-2">
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      <span className="font-semibold text-foreground">Explanation: </span>{q.explanation}
                                    </p>
                                  </div>
                                )}
                                <div className="flex items-center gap-3 pt-1">
                                  <span className="text-[10px] text-muted-foreground font-mono">ID: {q.id}</span>
                                  {qbDeleteConfirm === q.id ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                                        className="text-[11px] font-bold text-white bg-rose-500 px-2.5 py-1 rounded-md hover:bg-rose-400 transition-colors"
                                      >Confirm Delete</button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setQbDeleteConfirm(null); }}
                                        className="text-[11px] text-muted-foreground hover:text-foreground"
                                      >Cancel</button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setQbDeleteConfirm(q.id); }}
                                      className="flex items-center gap-1 text-[11px] text-rose-400/70 hover:text-rose-400 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                          <p className="text-[11px] text-muted-foreground">
                            Showing {(qbPage - 1) * QB_PAGE_SIZE + 1}–{Math.min(qbPage * QB_PAGE_SIZE, filtered.length)} of {filtered.length}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setQbPage((p) => Math.max(1, p - 1))}
                              disabled={qbPage === 1}
                              className="p-1.5 rounded hover:bg-muted/50 disabled:opacity-30 transition-colors"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[11px] text-muted-foreground px-2 tabular-nums">{qbPage} / {totalPages}</span>
                            <button
                              onClick={() => setQbPage((p) => Math.min(totalPages, p + 1))}
                              disabled={qbPage === totalPages}
                              className="p-1.5 rounded hover:bg-muted/50 disabled:opacity-30 transition-colors"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

          </div>
        )}
        {/* ── Leaderboard Tab ── */}
        {tab === "leaderboard" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">💎</span>
              <div>
                <p className="text-sm font-bold text-yellow-300">365-Day Diamond Challenge</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Students earn 1 diamond for each day they complete the daily practice target.
                  Most diamonds after 365 days wins a prize!
                </p>
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" /> Diamond Standings
                </h3>
                <button
                  onClick={() => {
                    setLbLoading(true);
                    fetch("/api/leaderboard").then((r) => r.json()).then((d) => { setLeaderboard(d); setLbLoading(false); });
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", lbLoading && "animate-spin")} /> Refresh
                </button>
              </div>

              {lbLoading ? (
                <div className="space-y-px">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/30 animate-pulse" />)}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-10 text-center">
                  <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No students yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leaderboard.map((row) => {
                    const posLabel = row.position === 1 ? "🥇" : row.position === 2 ? "🥈" : row.position === 3 ? "🥉" : `#${row.position}`;
                    const { rank, next, progressToNext } = getRankForQuestions(row.totalQuestions);
                    return (
                      <div key={row.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                        {/* Position */}
                        <div className="w-7 text-center text-sm shrink-0 font-bold">{posLabel}</div>

                        {/* Rank icon */}
                        <RankIcon rank={rank} size="sm" />

                        {/* Name + badge + progress */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-semibold text-foreground truncate">{row.name}</p>
                            <RankBadge rank={rank} size="xs" />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Phone className="w-2.5 h-2.5 shrink-0" />
                            <span>{row.phone}</span>
                          </div>
                          {next && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full bg-gradient-to-r", rank.gradientFrom, rank.gradientTo)}
                                  style={{ width: `${progressToNext}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-muted-foreground">{row.totalQuestions}/{next.minQ} → {next.title}</span>
                            </div>
                          )}
                        </div>

                        {/* Diamonds */}
                        <div className="text-center shrink-0 w-16">
                          <div className="flex items-center gap-1 justify-center">
                            <span className="text-base">💎</span>
                            <span className="text-lg font-bold tabular-nums text-cyan-300">{row.diamonds}</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground">diamonds</p>
                        </div>

                        {/* Questions */}
                        <div className="text-center shrink-0 w-14">
                          <p className="text-sm font-bold tabular-nums text-foreground">{row.totalQuestions}</p>
                          <p className="text-[9px] text-muted-foreground">questions</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rank guide for teacher */}
            <div className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Medical Rank System</h3>
              <div className="grid grid-cols-5 gap-2">
                {RANKS.map((r) => (
                  <div key={r.level} className={cn("rounded-lg px-2 py-3 text-center border", r.bg, r.border)}>
                    <RankIcon rank={r} size="sm" className="mx-auto mb-1.5" />
                    <p className={cn("text-[10px] font-bold leading-tight", r.color)}>{r.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{r.minQ === 0 ? "Start" : `${r.minQ}+ Qs`}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Top Students Tab ── */}
        {tab === "topstudents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Top 5 Students</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Ranked by diamonds earned · detailed topic & activity breakdown</p>
              </div>
              <button
                onClick={() => { setTsLoading(true); fetch("/api/admin/top-students").then(r => r.json()).then(d => { setTopStudents(d); setTsLoading(false); }); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", tsLoading && "animate-spin")} />
                Refresh
              </button>
            </div>

            {tsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-muted/30 animate-pulse rounded-xl" />)}
              </div>
            ) : topStudents.length === 0 ? (
              <div className="py-16 text-center bg-card border border-card-border rounded-xl">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No student data yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topStudents.map((s, idx) => {
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                  const maxActivity = Math.max(...s.recentActivity.map(r => r.count), 1);
                  return (
                    <div key={s.id} className="bg-card border border-card-border rounded-xl overflow-hidden">
                      {/* Card header */}
                      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
                        <span className="text-2xl leading-none">{medal}</span>
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">{s.name[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.phone}</p>
                        </div>
                        {/* Key stats in header */}
                        <div className="flex items-center gap-4 shrink-0 flex-wrap">
                          <div className="text-center">
                            <div className="flex items-center gap-1 justify-center">
                              <span className="text-base">💎</span>
                              <span className="text-lg font-bold tabular-nums text-cyan-300">{s.diamonds}</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground">diamonds</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold tabular-nums text-foreground">{s.totalQuestions}</p>
                            <p className="text-[9px] text-muted-foreground">unique Qs</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold tabular-nums text-emerald-400">{s.avgPerDay}</p>
                            <p className="text-[9px] text-muted-foreground">avg / day</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold tabular-nums text-purple-300">{s.testCount}</p>
                            <p className="text-[9px] text-muted-foreground">tests taken</p>
                          </div>
                          {s.testCount > 0 && (
                            <div className="text-center">
                              <p className="text-lg font-bold tabular-nums text-amber-300">{s.avgScore}%</p>
                              <p className="text-[9px] text-muted-foreground">avg score</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">

                        {/* Activity chart — last 14 days */}
                        <div className="p-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Last 14 Days</p>
                          <div className="flex items-end gap-1 h-12">
                            {s.recentActivity.map((day) => {
                              const pct = maxActivity > 0 ? (day.count / maxActivity) * 100 : 0;
                              const isToday = day.date === new Date().toISOString().split("T")[0];
                              return (
                                <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${day.date}: ${day.count} questions`}>
                                  <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(pct, day.count > 0 ? 8 : 2)}%` }}>
                                    <div className={cn(
                                      "w-full h-full rounded-t-sm",
                                      day.count === 0 ? "bg-muted/40" : isToday ? "bg-primary" : "bg-primary/50"
                                    )} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[9px] text-muted-foreground">14d ago</span>
                            <span className="text-[9px] text-muted-foreground">Today</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Active <span className="text-foreground font-semibold">{s.activeDays}</span> day{s.activeDays !== 1 ? "s" : ""}
                            {s.bestScore > 0 && <> · Best score <span className="text-amber-300 font-semibold">{s.bestScore}%</span></>}
                          </p>
                        </div>

                        {/* Weak topics */}
                        <div className="p-4">
                          <p className="text-xs font-semibold text-rose-400/80 uppercase tracking-wider mb-3">Weak Chapters</p>
                          {s.weakTopics.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No weak areas detected yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {s.weakTopics.map((t) => (
                                <div key={t.topicName}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs text-foreground truncate flex-1 pr-2">{t.topicName}</span>
                                    <span className="text-xs font-bold text-rose-400 shrink-0">{t.accuracy}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500/70 rounded-full" style={{ width: `${t.accuracy}%` }} />
                                  </div>
                                  <p className="text-[9px] text-muted-foreground mt-0.5">{t.correct}/{t.total} correct</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Strong topics + top topics */}
                        <div className="p-4">
                          <p className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-3">Strong Chapters</p>
                          {s.strongTopics.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Keep practicing to unlock strengths.</p>
                          ) : (
                            <div className="space-y-2">
                              {s.strongTopics.map((t) => (
                                <div key={t.topicName}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs text-foreground truncate flex-1 pr-2">{t.topicName}</span>
                                    <span className="text-xs font-bold text-emerald-400 shrink-0">{t.accuracy}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${t.accuracy}%` }} />
                                  </div>
                                  <p className="text-[9px] text-muted-foreground mt-0.5">{t.correct}/{t.total} correct</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Most practiced topic tags */}
                          {s.topicStats.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Most Practiced</p>
                              <div className="flex flex-wrap gap-1">
                                {s.topicStats.slice(0, 4).map((t) => (
                                  <span key={t.topicName} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary/80">
                                    {t.topicName} ({t.total})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── DAILY PRACTICE TAB ── */}
        {tab === "dailypractice" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground">Daily Practice Sets</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Create a question set for students to complete each day.</p>
            </div>

            {/* Create form */}
            <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Create New Set
              </h3>
              {dpError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {dpError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={dpDate}
                    onChange={(e) => setDpDate(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Kinematics Drill"
                    value={dpTitle}
                    onChange={(e) => setDpTitle(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description (optional)</label>
                <input
                  type="text"
                  placeholder="Short description for students"
                  value={dpDesc}
                  onChange={(e) => setDpDesc(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Question IDs (comma-separated)</label>
                <textarea
                  placeholder="e.g. 101, 204, 318, 455, 612"
                  value={dpQIds}
                  onChange={(e) => setDpQIds(e.target.value)}
                  rows={3}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 resize-none font-mono"
                />
                <p className="text-[11px] text-muted-foreground">Find question IDs in the Overview tab → question bank.</p>
              </div>
              <button
                onClick={createPracticeSet}
                disabled={dpCreating}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {dpCreating ? "Creating…" : "Create Practice Set"}
              </button>
            </div>

            {/* Existing sets */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">All Sets</h3>
                <button onClick={fetchDpSets} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className={cn("w-3.5 h-3.5", dpLoading && "animate-spin")} /> Refresh
                </button>
              </div>
              {dpLoading ? (
                <div className="divide-y divide-border">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted/20 animate-pulse" />)}
                </div>
              ) : dpSets.length === 0 ? (
                <div className="py-10 text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No practice sets yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {dpSets.map((s) => (
                    <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(s.practice_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {s.question_count} Qs</p>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="text-sm font-bold text-emerald-400 tabular-nums">{s.completion_count}</p>
                        <p className="text-[10px] text-muted-foreground">completed</p>
                      </div>
                      {dpDeleteConfirm === s.id ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => deletePracticeSet(s.id)} className="text-[11px] font-bold text-white bg-rose-500 px-2.5 py-1 rounded-md hover:bg-rose-400 transition-colors">Confirm</button>
                          <button onClick={() => setDpDeleteConfirm(null)} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setDpDeleteConfirm(s.id)} className="shrink-0 p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AI TOOLS TAB ── */}
        {tab === "aitools" && (
          <div className="space-y-6">
            {/* Always-mounted hidden file inputs — shared across both AI modes */}
            <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); if (e.target) e.target.value = ""; }} />
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> AI MCQ Tools
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Generate questions from scratch or extract specific ones from existing content.</p>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-muted/40 border border-border rounded-lg p-1 w-fit">
              {([["generator", "⚡ Quick Generate"], ["extractor", "🔍 Smart Extractor"], ["manual", "✍️ Manual Add"]] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setAiMode(mode)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                    aiMode === mode ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                  )}
                >{label}</button>
              ))}
            </div>

            {/* ── QUICK GENERATOR ── */}
            {aiMode === "generator" && (
              <>
                <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                  <p className="text-xs text-muted-foreground">Paste notes, a topic, or any text — Claude generates fresh MCQs ready to save.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chapter / Topic *</label>
                      <select value={aiTopicId} onChange={(e) => setAiTopicId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60">
                        <option value="">Select topic…</option>
                        <TopicSelectOptions topics={aiTopics} />
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subtopic (optional)</label>
                      <select value={aiSubtopicId} onChange={(e) => setAiSubtopicId(e.target.value ? Number(e.target.value) : "")}
                        disabled={!aiTopicId || aiSubtopics.length === 0}
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 disabled:opacity-50">
                        <option value="">Any subtopic</option>
                        {aiSubtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">No. of Questions</label>
                      <input type="number" min={1} max={50} value={aiCount}
                        onChange={(e) => setAiCount(Math.min(50, Math.max(1, Number(e.target.value))))}
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Paste Text / Notes
                    </label>
                    <textarea placeholder="Paste chapter notes, a concept, problem description, or anything you want MCQs about…"
                      value={aiText} onChange={(e) => setAiText(e.target.value)} rows={5}
                      className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 resize-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ImageUp className="w-3 h-3" /> Upload PDF or Image
                    </label>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                    <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); if (e.target) e.target.value = ""; }} />
                    {(aiImageName || pdfName) ? (
                      <div className="flex items-center gap-3 bg-primary/10 border border-primary/25 rounded-lg px-3 py-2">
                        {pdfName ? <FileText className="w-4 h-4 text-primary shrink-0" /> : <ImageUp className="w-4 h-4 text-primary shrink-0" />}
                        <span className="text-xs text-foreground font-medium truncate flex-1">{pdfName ?? aiImageName}</span>
                        {pdfParsing && <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />}
                        {!pdfParsing && <button onClick={() => { setAiImageB64(null); setAiImageName(null); setPdfName(null); setAiText(""); }} className="text-[11px] text-muted-foreground hover:text-rose-400 transition-colors">Remove</button>}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => pdfInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-dashed border-rose-500/30 rounded-lg text-xs text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/15 transition-all flex-1 justify-center font-medium">
                          <FileText className="w-4 h-4" /> Upload PDF
                        </button>
                        <button onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all flex-1 justify-center">
                          <ImageUp className="w-4 h-4" /> Upload Image
                        </button>
                      </div>
                    )}
                    {pdfName && !pdfParsing && aiText && (
                      <p className="text-[11px] text-emerald-400">✓ PDF parsed — {aiText.length.toLocaleString()} characters extracted. Ready to generate!</p>
                    )}
                  </div>
                  {aiError && (
                    <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {aiError}
                    </div>
                  )}
                  {aiSaved && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Questions saved to the question bank!
                    </div>
                  )}
                  <button onClick={generateMCQs} disabled={aiLoading || (!aiText && !aiImageB64) || !aiTopicId}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40">
                    <Sparkles className="w-4 h-4" />
                    {aiLoading ? "Generating…" : `Generate ${aiCount} MCQ${aiCount > 1 ? "s" : ""}`}
                  </button>
                </div>
                {aiGenerated.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" /> Generated MCQs ({aiGenerated.length})
                      </h3>
                      <button onClick={saveMCQs} disabled={aiSaving}
                        className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50">
                        <Save className="w-3.5 h-3.5" /> {aiSaving ? "Saving…" : "Save All to Bank"}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {aiGenerated.map((q, idx) => (
                        <div key={idx} className="bg-card border border-card-border rounded-xl p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground shrink-0 mt-0.5">Q{idx + 1}</span>
                            <p className="text-sm text-foreground leading-relaxed flex-1">{q.text}</p>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider shrink-0",
                              q.difficulty === "easy" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                              q.difficulty === "hard" ? "bg-rose-500/15 text-rose-400 border-rose-500/25" :
                              "bg-amber-500/15 text-amber-400 border-amber-500/25")}>{q.difficulty}</span>
                          </div>
                          <div className="space-y-1.5">
                            {q.options.map((opt, i) => (
                              <div key={i} className={cn("flex items-center gap-2 px-3 py-1.5 rounded text-xs border",
                                i === q.correctOption ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" : "bg-muted/30 border-border text-muted-foreground")}>
                                <span className="font-mono font-bold shrink-0">{String.fromCharCode(65 + i)}</span>
                                <span>{opt}</span>
                                {i === q.correctOption && <CheckCircle2 className="w-3 h-3 ml-auto shrink-0" />}
                              </div>
                            ))}
                          </div>
                          <div className="bg-muted/30 rounded-lg px-3 py-2">
                            <p className="text-[11px] text-muted-foreground leading-relaxed"><span className="font-semibold text-foreground">Explanation: </span>{q.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={saveMCQs} disabled={aiSaving}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50">
                      <Save className="w-4 h-4" /> {aiSaving ? "Saving…" : `Save ${aiGenerated.length} Questions to Bank`}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── SMART EXTRACTOR ── */}
            {aiMode === "extractor" && (
            <div className="contents">

            {/* ── STEP 1: Content Input ── */}
            <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                <div className={cn("flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border", extractPhase === "input" || extractPhase === "analyzing" ? "bg-primary/15 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground")}>
                  <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">1</span> Upload Content
                </div>
                <div className="h-px w-4 bg-border" />
                <div className={cn("flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border", extractPhase === "analyzed" || extractPhase === "extracting" ? "bg-primary/15 border-primary/30 text-primary" : "bg-muted/30 border-border text-muted-foreground")}>
                  <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">2</span> Select Questions
                </div>
                <div className="h-px w-4 bg-border" />
                <div className={cn("flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border", extractPhase === "extracted" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-muted/30 border-border text-muted-foreground")}>
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">3</span> Extract &amp; Save
                </div>
              </div>

              {/* Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chapter / Topic (for saving) *</label>
                  <select
                    value={aiTopicId}
                    onChange={(e) => setAiTopicId(e.target.value ? Number(e.target.value) : "")}
                    disabled={extractPhase !== "input"}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 disabled:opacity-50"
                  >
                    <option value="">Select topic…</option>
                    <TopicSelectOptions topics={aiTopics} />
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subtopic (optional)</label>
                  <select
                    value={aiSubtopicId}
                    onChange={(e) => setAiSubtopicId(e.target.value ? Number(e.target.value) : "")}
                    disabled={extractPhase !== "input" || !aiTopicId || aiSubtopics.length === 0}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 disabled:opacity-50"
                  >
                    <option value="">Any subtopic</option>
                    {aiSubtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Text input */}
              {extractPhase === "input" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Paste Text / Questions
                    </label>
                    <textarea
                      placeholder={"Paste your question paper, notes, or any text with physics questions…\n\n1. A ball is thrown upward with v₀ = 20 m/s. Find the maximum height.\n2. State Newton's second law…"}
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      rows={7}
                      className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ImageUp className="w-3 h-3" /> Upload PDF or Image (question paper, scan, etc.)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                    />
                    {(aiImageName || pdfName) ? (
                      <div className="flex items-center gap-3 bg-primary/10 border border-primary/25 rounded-lg px-3 py-2">
                        {pdfName ? <FileText className="w-4 h-4 text-primary shrink-0" /> : <ImageUp className="w-4 h-4 text-primary shrink-0" />}
                        <span className="text-xs text-foreground font-medium truncate flex-1">{pdfName ?? aiImageName}</span>
                        {pdfParsing && <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />}
                        {!pdfParsing && <button onClick={() => { setAiImageB64(null); setAiImageName(null); setPdfName(null); setAiText(""); setExtractPhase("input"); }} className="text-[11px] text-muted-foreground hover:text-rose-400 transition-colors">Remove</button>}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => pdfInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-dashed border-rose-500/30 rounded-lg text-xs text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/15 transition-all flex-1 justify-center font-medium"
                        >
                          <FileText className="w-4 h-4" /> Upload PDF
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all flex-1 justify-center"
                        >
                          <ImageUp className="w-4 h-4" /> Upload Image
                        </button>
                      </div>
                    )}
                    {pdfName && !pdfParsing && aiText && (
                      <p className="text-[11px] text-emerald-400">✓ PDF parsed — {aiText.length.toLocaleString()} characters extracted. Ready to analyze!</p>
                    )}
                  </div>
                </>
              )}

              {/* Already have content but in phase 2+ — show summary */}
              {extractPhase !== "input" && (aiText || aiImageName) && (
                <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2">
                  {aiImageName ? <ImageUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {aiImageName ? aiImageName : `${aiText.slice(0, 80)}${aiText.length > 80 ? "…" : ""}`}
                  </span>
                  <button onClick={resetExtractor} className="text-[11px] text-muted-foreground hover:text-primary transition-colors shrink-0">Change</button>
                </div>
              )}

              {/* Error */}
              {extractError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {extractError}
                </div>
              )}

              {/* Saved success */}
              {aiSaved && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Questions saved to the question bank!
                </div>
              )}

              {/* Analyze button */}
              {extractPhase === "input" && (
                <button
                  onClick={analyzeContent}
                  disabled={!aiText && !aiImageB64}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <Search className="w-4 h-4" />
                  Analyze Content — Find All Questions
                </button>
              )}

              {/* Analyzing spinner */}
              {extractPhase === "analyzing" && (
                <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                  Reading your content and identifying all questions…
                </div>
              )}
            </div>

            {/* ── STEP 2: Question Selection ── */}
            {(extractPhase === "analyzed" || extractPhase === "extracting") && foundQuestions.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      AI found {foundQuestions.length} question{foundQuestions.length !== 1 ? "s" : ""}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Check the ones you want to extract as proper NEET MCQs.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedQNums(new Set(foundQuestions.map(q => q.number)))}
                      className="text-[11px] text-primary hover:opacity-75 transition-opacity"
                    >All</button>
                    <span className="text-muted-foreground text-[11px]">·</span>
                    <button
                      onClick={() => setSelectedQNums(new Set())}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >None</button>
                  </div>
                </div>

                <div className="space-y-2">
                  {foundQuestions.map((q) => (
                    <label
                      key={q.number}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        selectedQNums.has(q.number)
                          ? "bg-primary/8 border-primary/30"
                          : "bg-muted/20 border-border hover:border-border/80"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedQNums.has(q.number)}
                        onChange={(e) => {
                          const next = new Set(selectedQNums);
                          e.target.checked ? next.add(q.number) : next.delete(q.number);
                          setSelectedQNums(next);
                        }}
                        className="mt-0.5 accent-primary shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-bold text-primary/80">Q{q.number}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 border border-border text-muted-foreground">{q.topic}</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{q.preview}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={extractSelected}
                  disabled={selectedQNums.size === 0 || extractPhase === "extracting"}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {extractPhase === "extracting" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Extracting {selectedQNums.size} question{selectedQNums.size !== 1 ? "s" : ""}…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extract {selectedQNums.size} Selected Question{selectedQNums.size !== 1 ? "s" : ""} as MCQs
                    </>
                  )}
                </button>
              </div>
            )}

            {/* No questions found */}
            {extractPhase === "analyzed" && foundQuestions.length === 0 && (
              <div className="bg-card border border-card-border rounded-xl p-6 text-center space-y-2">
                <Search className="w-7 h-7 text-muted-foreground mx-auto opacity-40" />
                <p className="text-sm text-muted-foreground">No distinct questions found in the content.</p>
                <p className="text-xs text-muted-foreground/60">Try pasting more specific question text.</p>
                <button onClick={resetExtractor} className="text-xs text-primary hover:opacity-75 mt-2">Start over</button>
              </div>
            )}

            {/* ── STEP 3: Extracted MCQs ── */}
            {extractPhase === "extracted" && aiGenerated.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" /> Extracted MCQs ({aiGenerated.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={resetExtractor} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">Extract more</button>
                    <button
                      onClick={saveMCQs}
                      disabled={aiSaving || !aiTopicId}
                      className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {aiSaving ? "Saving…" : "Save All to Question Bank"}
                    </button>
                  </div>
                </div>
                {!aiTopicId && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Select a topic above before saving.
                  </div>
                )}
                <div className="space-y-3">
                  {aiGenerated.map((q, idx) => (
                    <div key={idx} className="bg-card border border-card-border rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground shrink-0 mt-0.5">Q{idx + 1}</span>
                        <p className="text-sm text-foreground leading-relaxed flex-1">{q.text}</p>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider shrink-0",
                          q.difficulty === "easy" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                          q.difficulty === "hard" ? "bg-rose-500/15 text-rose-400 border-rose-500/25" :
                          "bg-amber-500/15 text-amber-400 border-amber-500/25"
                        )}>
                          {q.difficulty}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {q.options.map((opt, i) => (
                          <div key={i} className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded text-xs border",
                            i === q.correctOption
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                              : "bg-muted/30 border-border text-muted-foreground"
                          )}>
                            <span className="font-mono font-bold shrink-0">{String.fromCharCode(65 + i)}</span>
                            <span>{opt}</span>
                            {i === q.correctOption && <CheckCircle2 className="w-3 h-3 ml-auto shrink-0" />}
                          </div>
                        ))}
                      </div>
                      <div className="bg-muted/30 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-muted-foreground leading-relaxed"><span className="font-semibold text-foreground">Explanation: </span>{q.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={saveMCQs}
                  disabled={aiSaving || !aiTopicId}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {aiSaving ? "Saving…" : `Save ${aiGenerated.length} Questions to Bank`}
                </button>
              </div>
            )}
            </div>)}

            {/* ── MANUAL ADD ── */}
            {aiMode === "manual" && (
              <div className="space-y-4">
                <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Type your own question, or paste a question copied from Gemini (or any AI) — it'll be auto-parsed into fields you can review and edit before saving.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chapter / Topic *</label>
                      <select value={aiTopicId} onChange={(e) => setAiTopicId(e.target.value ? Number(e.target.value) : "")}
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60">
                        <option value="">Select topic…</option>
                        <TopicSelectOptions topics={aiTopics} />
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subtopic (optional)</label>
                      <select value={aiSubtopicId} onChange={(e) => setAiSubtopicId(e.target.value ? Number(e.target.value) : "")}
                        disabled={!aiTopicId || aiSubtopics.length === 0}
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 disabled:opacity-50">
                        <option value="">Any subtopic</option>
                        {aiSubtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Bot className="w-3 h-3" /> Paste from Gemini / AI (optional)
                    </label>
                    <textarea
                      placeholder={"Paste a question exactly as copied from Gemini, e.g.:\n\nQuestion: A ball is thrown upward with v = 20 m/s. Find max height.\nA) 10 m\nB) 20 m\nC) 15 m\nD) 25 m\nAnswer: B\nExplanation: Using v² = u² - 2gh…"}
                      value={manualPasteText}
                      onChange={(e) => setManualPasteText(e.target.value)}
                      rows={6}
                      className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none font-mono"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={parseManualPaste}
                        disabled={!manualPasteText.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 border border-primary/25 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all disabled:opacity-40"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Parse & Add
                      </button>
                      <button
                        onClick={addBlankManualQuestion}
                        className="flex items-center gap-1.5 px-4 py-2 bg-muted/40 border border-dashed border-border text-muted-foreground text-xs font-bold rounded-lg hover:border-primary/40 hover:text-foreground transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Blank Question
                      </button>
                    </div>
                  </div>

                  {manualError && (
                    <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {manualError}
                    </div>
                  )}
                  {manualSaved && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Questions saved to the question bank!
                    </div>
                  )}
                </div>

                {manualQuestions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" /> Questions to Save ({manualQuestions.length})
                      </h3>
                      <button onClick={saveManualQuestions} disabled={manualSaving || !aiTopicId}
                        className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50">
                        <Save className="w-3.5 h-3.5" /> {manualSaving ? "Saving…" : "Save All to Bank"}
                      </button>
                    </div>

                    <div className="space-y-3">
                      {manualQuestions.map((q, idx) => (
                        <div key={idx} className="bg-card border border-card-border rounded-xl p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground shrink-0 mt-2">Q{idx + 1}</span>
                            <textarea
                              value={q.text}
                              onChange={(e) => updateManualQuestion(idx, { text: e.target.value })}
                              placeholder="Question text…"
                              rows={2}
                              className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
                            />
                            <select
                              value={q.difficulty}
                              onChange={(e) => updateManualQuestion(idx, { difficulty: e.target.value })}
                              className={cn("text-[10px] px-1.5 py-1 rounded border font-semibold uppercase tracking-wider shrink-0 bg-muted/30",
                                q.difficulty === "easy" ? "text-emerald-400 border-emerald-500/25" :
                                q.difficulty === "hard" ? "text-rose-400 border-rose-500/25" :
                                "text-amber-400 border-amber-500/25")}
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                            <button onClick={() => removeManualQuestion(idx)} className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0 mt-2">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {q.options.map((opt, i) => (
                              <div key={i} className={cn("flex items-center gap-2 px-2 py-1 rounded border",
                                i === q.correctOption ? "bg-emerald-500/10 border-emerald-500/25" : "bg-muted/20 border-border")}>
                                <button
                                  onClick={() => updateManualQuestion(idx, { correctOption: i })}
                                  className={cn("font-mono font-bold shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all",
                                    i === q.correctOption ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70")}
                                  title="Mark as correct answer"
                                >
                                  {String.fromCharCode(65 + i)}
                                </button>
                                <input
                                  value={opt}
                                  onChange={(e) => updateManualOption(idx, i, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-1"
                                />
                                {i === q.correctOption && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                              </div>
                            ))}
                          </div>

                          <textarea
                            value={q.explanation}
                            onChange={(e) => updateManualQuestion(idx, { explanation: e.target.value })}
                            placeholder="Explanation…"
                            rows={2}
                            className="w-full bg-muted/30 rounded-lg px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border focus:border-primary/60 resize-none"
                          />

                          {/* Optional image */}
                          <input
                            ref={(el) => { manualImageInputRefs.current[idx] = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleManualImageUpload(idx, f); if (e.target) e.target.value = ""; }}
                          />
                          {q.imageName ? (
                            <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-lg px-3 py-1.5">
                              <ImageUp className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="text-[11px] text-foreground font-medium truncate flex-1">{q.imageName}</span>
                              <button onClick={() => updateManualQuestion(idx, { imageB64: null, imageName: null })} className="text-[11px] text-muted-foreground hover:text-rose-400 transition-colors">Remove</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => manualImageInputRefs.current[idx]?.click()}
                              className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-dashed border-border rounded-lg text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
                            >
                              <ImageUp className="w-3.5 h-3.5" /> Attach Image (optional)
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button onClick={saveManualQuestions} disabled={manualSaving || !aiTopicId}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50">
                      <Save className="w-4 h-4" /> {manualSaving ? "Saving…" : `Save ${manualQuestions.length} Question${manualQuestions.length > 1 ? "s" : ""} to Bank`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── AI Question Selector Agent ── */}
            <div className="border-t border-border pt-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Bot className="w-4 h-4 text-violet-400" /> AI Question Selector
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tell the AI which questions to pull from your question bank — it will find and return them for you.
                </p>
              </div>

              <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Instruction</label>
                    <textarea
                      placeholder={`e.g. "Give me 10 hard questions on Newton's Laws for a surprise test" or "Find all medium-difficulty questions on Thermodynamics about heat transfer"`}
                      value={agentInstruction}
                      onChange={(e) => setAgentInstruction(e.target.value)}
                      rows={3}
                      className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 resize-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Filter by Topic (optional)</label>
                    <select
                      value={agentTopicId}
                      onChange={(e) => setAgentTopicId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-violet-500/50 h-[88px]"
                    >
                      <option value="">All topics</option>
                      <TopicSelectOptions topics={aiTopics} />
                    </select>
                  </div>
                </div>

                {agentError && (
                  <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {agentError}
                  </div>
                )}

                <button
                  onClick={runAgent}
                  disabled={agentLoading || !agentInstruction.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-40"
                >
                  <Search className="w-4 h-4" />
                  {agentLoading ? "Agent is thinking…" : "Run AI Agent"}
                </button>
              </div>

              {/* Agent results */}
              {agentResults.length > 0 && (
                <div className="space-y-4">
                  {agentReasoning && (
                    <div className="flex items-start gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
                      <Bot className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-violet-300 leading-relaxed">{agentReasoning}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      Selected {agentResults.length} question{agentResults.length !== 1 ? "s" : ""}
                    </h3>
                    <button
                      onClick={copyAgentIds}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all",
                        agentCopied
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                      )}
                    >
                      <Copy className="w-3 h-3" />
                      {agentCopied ? "Copied!" : "Copy IDs"}
                    </button>
                  </div>

                  <div className="text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2 font-mono">
                    {agentResults.map((q) => q.id).join(", ")}
                  </div>

                  <div className="space-y-2">
                    {agentResults.map((q, idx) => (
                      <div key={q.id} className="bg-card border border-card-border rounded-xl p-3 flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">#{q.id}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xs text-foreground leading-relaxed">{q.text}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary/80">{q.topicName}</span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider",
                              q.difficulty === "easy" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
                              q.difficulty === "hard" ? "bg-rose-500/15 text-rose-400 border-rose-500/25" :
                              "bg-amber-500/15 text-amber-400 border-amber-500/25"
                            )}>
                              {q.difficulty}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!agentLoading && agentInstruction && agentResults.length === 0 && agentReasoning && (
                <div className="py-8 text-center bg-card border border-card-border rounded-xl">
                  <Search className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No matching questions found.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{agentReasoning}</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── TESTS TAB ── */}
        {tab === "tests" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Tests Manager
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Create short or long tests from your question bank, and manage the Mastery Test Series.</p>
            </div>

            {/* ── Create New Test ── */}
            <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Create New Test
              </h3>

              {testError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {testError}
                </div>
              )}

              {/* Test type selector */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["short", "Short Test", "Up to 45 questions · 45 min"],
                  ["long", "Long Test", "Up to 180 questions · 3 hrs"],
                  ["mastery_chapter", "Mastery Chapter", "Chapter mastery test"],
                ] as [typeof testType, string, string][]).map(([val, label, desc]) => (
                  <button
                    key={val}
                    onClick={() => {
                      setTestType(val);
                      setTestDuration(val === "short" ? 45 : val === "long" ? 180 : 60);
                    }}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                      testType === val
                        ? "bg-primary/10 border-primary/40 text-foreground"
                        : "bg-muted/30 border-border text-muted-foreground hover:border-border/80"
                    )}
                  >
                    <span className="text-xs font-bold">{label}</span>
                    <span className="text-[10px] mt-0.5 opacity-70">{desc}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Test Title *</label>
                  <input
                    type="text"
                    placeholder={testType === "mastery_chapter" ? "e.g. Mastery Test: Kinematics" : testType === "short" ? "e.g. Quick Optics Quiz" : "e.g. NEET Full Mock #1"}
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description (optional)</label>
                  <input
                    type="text"
                    placeholder="Short note for students"
                    value={testDesc}
                    onChange={(e) => setTestDesc(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duration (minutes)</label>
                  <input
                    type="number" min={5} max={300}
                    value={testDuration}
                    onChange={(e) => setTestDuration(Math.max(5, Number(e.target.value)))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</label>
                  <select
                    value={testDifficulty}
                    onChange={(e) => setTestDifficulty(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
                  >
                    <option value="mixed">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Question IDs (comma-separated) *</label>
                <textarea
                  placeholder="e.g. 31, 32, 45, 67, 88, 101 — get IDs from Overview → Question Bank"
                  value={testQIds}
                  onChange={(e) => setTestQIds(e.target.value)}
                  rows={3}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  {testQIds.split(",").filter(s => !isNaN(parseInt(s.trim())) && s.trim()).length > 0
                    ? `${testQIds.split(",").filter(s => !isNaN(parseInt(s.trim())) && s.trim()).length} question(s) entered`
                    : "Find IDs in the Overview tab → Question Bank"}
                </p>
              </div>

              <button
                onClick={createAdminTest}
                disabled={testCreating}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                {testCreating ? "Creating…" : "Create Test"}
              </button>
            </div>

            {/* ── Existing Tests ── */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  All Tests
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted/50 border border-border text-muted-foreground font-mono">{testsList.length}</span>
                </h3>
                <button onClick={fetchTests} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className={cn("w-3.5 h-3.5", testsLoading && "animate-spin")} /> Refresh
                </button>
              </div>

              {testsLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading tests…</div>
              ) : testsList.length === 0 ? (
                <div className="p-8 text-center">
                  <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">No tests yet. Create one above.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {testsList.map((t) => (
                    <div key={t.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground truncate">{t.title}</span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider",
                              t.test_type === "short" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                              t.test_type === "long" ? "bg-violet-500/10 border-violet-500/20 text-violet-400" :
                              t.test_type === "mastery_chapter" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                              "bg-muted/50 border-border text-muted-foreground"
                            )}>
                              {t.test_type.replace("_", " ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Target className="w-3 h-3" />{t.question_count} questions</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.duration_minutes} min</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider text-[10px]",
                              t.difficulty === "easy" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                              t.difficulty === "hard" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                              "bg-muted/30 border-border text-muted-foreground"
                            )}>{t.difficulty}</span>
                          </div>
                          {t.description && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{t.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => { setTestEditId(t.id === testEditId ? null : t.id); setTestEditQIds(""); }}
                            className="text-[11px] text-primary hover:opacity-75 transition-opacity px-2 py-1 rounded border border-primary/20 bg-primary/5"
                          >
                            {testEditId === t.id ? "Cancel" : "Edit Qs"}
                          </button>
                          {testDeleteConfirm === t.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => deleteAdminTest(t.id)} className="text-[11px] text-rose-400 hover:text-rose-300 font-bold">Delete</button>
                              <button onClick={() => setTestDeleteConfirm(null)} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setTestDeleteConfirm(t.id)} className="p-1.5 text-muted-foreground hover:text-rose-400 transition-colors rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Edit questions inline */}
                      {testEditId === t.id && (
                        <div className="mt-2 bg-muted/30 border border-border rounded-lg p-3 space-y-2">
                          <p className="text-[11px] text-muted-foreground">Enter new question IDs to replace the current set:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="31, 32, 45, 67…"
                              value={testEditQIds}
                              onChange={(e) => setTestEditQIds(e.target.value)}
                              className="flex-1 bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 font-mono"
                            />
                            <button
                              onClick={() => saveTestQuestions(t.id)}
                              disabled={testEditSaving || !testEditQIds.trim()}
                              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {testEditSaving ? "Saving…" : "Save"}
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {testEditQIds.split(",").filter(s => !isNaN(parseInt(s.trim())) && s.trim()).length} question ID(s) entered
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── API Key Settings Tab ── */}
        {tab === "apisettings" && (
          <div className="space-y-5">
            <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Settings className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">OpenAI API Configuration</h2>
                  <p className="text-xs text-muted-foreground">Manage the OpenAI key used by AI MCQ Generator and AI Tutor</p>
                </div>
              </div>

              {/* Current status */}
              {keyStatus && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Current Status</p>
                  <div className="flex flex-wrap gap-3">
                    <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", keyStatus.hasEnvKey ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-muted border-border text-muted-foreground")}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", keyStatus.hasEnvKey ? "bg-emerald-400" : "bg-muted-foreground")} />
                      Environment variable: {keyStatus.hasEnvKey ? "Set ✓" : "Not set"}
                    </div>
                    <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", keyStatus.hasDbKey ? "bg-blue-500/10 border-blue-500/25 text-blue-400" : "bg-muted border-border text-muted-foreground")}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", keyStatus.hasDbKey ? "bg-blue-400" : "bg-muted-foreground")} />
                      Custom DB key: {keyStatus.hasDbKey ? `Active (${keyStatus.maskedKey})` : "Not set"}
                    </div>
                  </div>
                  {keyStatus.hasDbKey && (
                    <p className="text-[11px] text-blue-400 mt-1">→ The custom DB key takes priority over the environment variable.</p>
                  )}
                  {!keyStatus.hasEnvKey && !keyStatus.hasDbKey && (
                    <p className="text-[11px] text-rose-400 mt-1">⚠ No API key configured. AI features will fail until a key is set.</p>
                  )}
                </div>
              )}

              {/* Set new key */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground">Set Custom API Key</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter an OpenAI API key (starts with <code className="font-mono bg-muted px-1 rounded text-[10px]">sk-...</code>). 
                  This is stored in your database and will override the environment variable.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                  <button
                    onClick={saveApiKey}
                    disabled={savingKey || !newApiKey.trim()}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg border transition-all disabled:opacity-40",
                      keySaved
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "bg-primary/10 border-primary/25 text-primary hover:bg-primary/20"
                    )}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {keySaved ? "Saved!" : savingKey ? "Saving…" : "Save Key"}
                  </button>
                </div>
                {keyError && <p className="text-xs text-rose-400">{keyError}</p>}
              </div>

              {/* Remove custom key */}
              {keyStatus?.hasDbKey && (
                <div className="pt-3 border-t border-border space-y-2">
                  <p className="text-xs font-semibold text-foreground">Remove Custom Key</p>
                  <p className="text-[11px] text-muted-foreground">Remove the custom DB key and revert to using the environment variable.</p>
                  <button
                    onClick={removeApiKey}
                    disabled={removingKey}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-40"
                  >
                    {removingKey ? "Removing…" : "Remove Custom Key"}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
              <p className="text-xs font-semibold text-foreground">How AI Keys Work</p>
              <ul className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                <li className="flex gap-2"><span className="text-primary font-bold">1.</span> If a custom key is saved in the DB — it is used for all AI calls.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Otherwise, the <code className="font-mono bg-muted px-1 rounded text-[10px]">OPENAI_API_KEY</code> environment variable is used.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">3.</span> If neither is set, AI features (MCQ Generator, AI Tutor) will return errors.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Test Series Tab ── */}
        {tab === "testseries" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Test Series Manager
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Create paid or free test series with multiple sub-tests, each with its own syllabus and schedule.</p>
            </div>

            {/* ── Create New Series ── */}
            <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" /> Create New Series
              </h3>
              {seriesError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {seriesError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Series Title *</label>
                  <input
                    type="text" placeholder="e.g. NEET 2027 Full Mock Series"
                    value={newSeriesTitle} onChange={(e) => setNewSeriesTitle(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Price (₹)</label>
                  <input
                    type="number" min={0} placeholder="0 = Free"
                    value={newSeriesPrice} onChange={(e) => setNewSeriesPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="What students will get in this series…"
                  value={newSeriesDesc} onChange={(e) => setNewSeriesDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 resize-none"
                />
              </div>
              <button
                onClick={createSeries} disabled={seriesCreating || !newSeriesTitle.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                {seriesCreating ? "Creating…" : "Create Series"}
              </button>
            </div>

            {/* ── Series List ── */}
            <div className="grid grid-cols-1 gap-4">
              {seriesLoading ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Loading…</div>
              ) : seriesList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No series yet. Create one above.</div>
              ) : seriesList.map((s) => (
                <div key={s.id} className={cn("bg-card border rounded-xl overflow-hidden transition-all", selectedSeriesId === s.id ? "border-primary/50" : "border-card-border")}>
                  {/* Series Header */}
                  {editSeriesId === s.id ? (
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text" value={editSeriesTitle} onChange={(e) => setEditSeriesTitle(e.target.value)}
                          className="bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
                        />
                        <input
                          type="number" min={0} value={editSeriesPrice} onChange={(e) => setEditSeriesPrice(Math.max(0, Number(e.target.value)))}
                          className="bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
                        />
                      </div>
                      <textarea
                        value={editSeriesDesc} onChange={(e) => setEditSeriesDesc(e.target.value)} rows={2}
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEditSeries} disabled={editSeriesSaving}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg disabled:opacity-40">
                          <Save className="w-3.5 h-3.5" /> {editSeriesSaving ? "Saving…" : "Save"}
                        </button>
                        <button onClick={() => setEditSeriesId(null)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between p-4 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground truncate">{s.title}</span>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", s.is_published ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-muted/50 border-border text-muted-foreground")}>
                            {s.is_published ? "Published" : "Draft"}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
                            <IndianRupee className="w-2.5 h-2.5" />{s.price_rupees === 0 ? "Free" : `₹${s.price_rupees}`}
                          </span>
                        </div>
                        {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1">{s.sub_test_count} sub-test{s.sub_test_count !== 1 ? "s" : ""} · Created {formatDate(s.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <button onClick={() => togglePublish(s)}
                          className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all",
                            s.is_published ? "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20")}>
                          {s.is_published ? "Unpublish" : "Publish"}
                        </button>
                        <button onClick={() => { setEditSeriesId(s.id); setEditSeriesTitle(s.title); setEditSeriesDesc(s.description); setEditSeriesPrice(s.price_rupees); }}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground transition-all">
                          Edit
                        </button>
                        <button onClick={() => setSelectedSeriesId(selectedSeriesId === s.id ? null : s.id)}
                          className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all",
                            selectedSeriesId === s.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:text-foreground")}>
                          {selectedSeriesId === s.id ? "▲ Hide Tests" : "▼ Manage Tests"}
                        </button>
                        {seriesDeleteConfirm === s.id ? (
                          <>
                            <button onClick={() => deleteSeries(s.id)} className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-rose-500/50 bg-rose-500/20 text-rose-400">Confirm Delete</button>
                            <button onClick={() => setSeriesDeleteConfirm(null)} className="text-[11px] px-2 py-1 text-muted-foreground hover:text-foreground">Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => setSeriesDeleteConfirm(s.id)} className="p-1.5 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sub-tests section */}
                  {selectedSeriesId === s.id && (
                    <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Sub-Tests ({seriesTests.length})</h4>

                      {seriesTestsLoading ? (
                        <div className="text-xs text-muted-foreground py-4 text-center">Loading…</div>
                      ) : seriesTests.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-4 text-center">No sub-tests yet. Add one below.</div>
                      ) : (
                        <div className="space-y-2">
                          {seriesTests.map((st, idx) => (
                            <div key={st.id} className="bg-card border border-border rounded-lg p-3 flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">#{idx + 1}</span>
                                  <span className="text-sm font-semibold text-foreground">{st.title}</span>
                                </div>
                                {st.description && <p className="text-xs text-muted-foreground mt-0.5">{st.description}</p>}
                                <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{st.duration_minutes} min</span>
                                  <span className="flex items-center gap-1"><Target className="w-3 h-3" />{st.total_marks} marks</span>
                                  {st.topic_ids?.length > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{st.topic_ids.length} topic{st.topic_ids.length !== 1 ? "s" : ""}</span>}
                                  {st.scheduled_at && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDate(st.scheduled_at)}</span>}
                                </div>
                                {st.topic_ids?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {st.topic_ids.slice(0, 5).map((tid) => {
                                      const t = seriesTopics.find((x) => x.id === tid);
                                      return t ? <span key={tid} className="text-[10px] bg-primary/10 border border-primary/20 text-primary rounded px-1.5 py-0.5">{t.name}</span> : null;
                                    })}
                                    {st.topic_ids.length > 5 && <span className="text-[10px] text-muted-foreground">+{st.topic_ids.length - 5} more</span>}
                                  </div>
                                )}
                              </div>
                              <div className="shrink-0">
                                {stDeleteConfirm === st.id ? (
                                  <div className="flex gap-1">
                                    <button onClick={() => deleteSeriesTest(st.id)} className="text-[11px] font-bold px-2 py-1 rounded border border-rose-500/50 bg-rose-500/20 text-rose-400">Delete</button>
                                    <button onClick={() => setStDeleteConfirm(null)} className="text-[11px] px-2 py-1 text-muted-foreground">Cancel</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setStDeleteConfirm(st.id)} className="p-1.5 rounded border border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Sub-test Form */}
                      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                        <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5"><Plus className="w-3.5 h-3.5 text-primary" /> Add Sub-Test</h5>
                        {stError && <p className="text-xs text-rose-400">{stError}</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sub-Test Title *</label>
                            <input type="text" placeholder="e.g. Test 1 — Physics Mechanics"
                              value={stTitle} onChange={(e) => setStTitle(e.target.value)}
                              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Scheduled Date</label>
                            <input type="date" value={stScheduled} onChange={(e) => setStScheduled(e.target.value)}
                              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                          <input type="text" placeholder="Optional note about this test"
                            value={stDesc} onChange={(e) => setStDesc(e.target.value)}
                            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duration (min)</label>
                            <input type="number" min={5} max={300} value={stDuration} onChange={(e) => setStDuration(Math.max(5, Number(e.target.value)))}
                              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Marks</label>
                            <input type="number" min={1} value={stMarks} onChange={(e) => setStMarks(Math.max(1, Number(e.target.value)))}
                              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Syllabus Topics</label>
                          <div className="bg-muted/30 border border-border rounded-lg p-2 max-h-48 overflow-y-auto space-y-0.5">
                            {seriesTopics.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-2">Loading topics…</p>
                            ) : (
                              (() => {
                                const groups: Record<string, TopicOption[]> = {};
                                for (const t of seriesTopics) { const k = t.subject ?? "physics"; (groups[k] ??= []).push(t); }
                                const order = ["physics", "chemistry", "biology"];
                                const keys = [...order.filter((k) => groups[k]), ...Object.keys(groups).filter((k) => !order.includes(k))];
                                return keys.map((key) => (
                                  <div key={key}>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1 sticky top-0 bg-muted/80">{SUBJECT_GROUP_LABEL[key] ?? key}</p>
                                    {groups[key].map((t) => (
                                      <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 cursor-pointer">
                                        <input type="checkbox" checked={stTopicIds.includes(t.id)}
                                          onChange={(e) => setStTopicIds((prev) => e.target.checked ? [...prev, t.id] : prev.filter((x) => x !== t.id))}
                                          className="accent-primary w-3.5 h-3.5 shrink-0" />
                                        <span className="text-xs text-foreground">{t.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                ));
                              })()
                            )}
                          </div>
                          {stTopicIds.length > 0 && (
                            <p className="text-[11px] text-primary">{stTopicIds.length} topic{stTopicIds.length !== 1 ? "s" : ""} selected</p>
                          )}
                        </div>
                        <button onClick={addSeriesTest} disabled={stCreating || !stTitle.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40">
                          <Plus className="w-3.5 h-3.5" />
                          {stCreating ? "Adding…" : "Add Sub-Test"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
