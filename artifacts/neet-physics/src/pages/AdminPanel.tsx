import { useState, useEffect, useCallback } from "react";
import {
  Users, TrendingUp, ClipboardList, ChevronDown, ChevronUp,
  LogOut, Phone, CheckCircle2, XCircle, Target, Settings, Save,
  RefreshCw, Trophy, ShieldCheck, ShieldX, Clock, IndianRupee,
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

type Tab = "approvals" | "daily" | "students" | "overview" | "leaderboard" | "topstudents";

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
          {([ ["approvals", "✅ Approvals"], ["daily", "Daily Report"], ["students", "All Students"], ["overview", "Overview"], ["leaderboard", "💎 Leaderboard"], ["topstudents", "🏅 Top Students"] ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
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
                  <button
                    onClick={() => toggleStudent(s.id)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
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
                        {(s as unknown as StudentStat).courseType === "test_only"
                          ? <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full shrink-0">MASTERY</span>
                          : <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full shrink-0">FOUNDATION</span>
                        }
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
                  </button>

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

      </div>
    </div>
  );
}
