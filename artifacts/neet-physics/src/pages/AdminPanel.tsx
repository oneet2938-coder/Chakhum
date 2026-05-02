import { useState, useEffect, useCallback } from "react";
import {
  Users, TrendingUp, ClipboardList, ChevronDown, ChevronUp,
  LogOut, Phone, CheckCircle2, XCircle, Target, Settings, Save,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface StudentStat {
  id: number;
  name: string;
  phone: string;
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
  testsToday: number;
  target: number;
  completed: boolean;
  remaining: number;
}

type Tab = "daily" | "students" | "overview";

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
  const [tab, setTab] = useState<Tab>("daily");

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

  const fetchDailyReport = useCallback(async () => {
    setReportLoading(true);
    const data = await fetch("/api/admin/daily-report").then((r) => r.json());
    setDailyReport(data.report ?? []);
    setTarget(data.target ?? 20);
    setTargetInput(String(data.target ?? 20));
    setReportLoading(false);
  }, []);

  useEffect(() => {
    // Load settings + daily report
    fetchDailyReport();
    // Load all students + overview in parallel
    Promise.all([
      fetch("/api/admin/students").then((r) => r.json()),
      fetch("/api/admin/overview").then((r) => r.json()),
    ]).then(([s, o]) => {
      setStudents(s);
      setOverview(o);
      setMainLoading(false);
    });
  }, [fetchDailyReport]);

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
        <div className="flex gap-1 bg-muted/40 border border-border rounded-lg p-1 w-fit">
          {([ ["daily", "Daily Report"], ["students", "All Students"], ["overview", "Overview"] ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                tab === id
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

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
              ) : (
                <div className="divide-y divide-border">
                  {dailyReport.map((row, idx) => (
                    <div key={row.id} className={cn(
                      "flex items-center gap-4 px-4 py-3",
                      row.completed ? "bg-emerald-500/5" : ""
                    )}>
                      {/* Status icon */}
                      {row.completed
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        : <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      }

                      {/* Avatar + name */}
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{row.name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{row.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />{row.phone}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="w-32 shrink-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">
                            {row.questionsToday} / {row.target}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {Math.min(100, Math.round((row.questionsToday / row.target) * 100))}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all",
                              row.completed ? "bg-emerald-500" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(100, (row.questionsToday / row.target) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="w-36 shrink-0 text-right">
                        {row.completed ? (
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-1 rounded-md">
                            Practice Done ✓
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md">
                            {row.remaining} more needed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            ) : (
              students.map((s, idx) => (
                <div key={s.id} className="bg-card border border-card-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleStudent(s.id)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{s.name[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />{s.phone}
                      </p>
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
              ))
            )}
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
      </div>
    </div>
  );
}
