import { useState, useEffect } from "react";
import { Users, TrendingUp, ClipboardList, Target, ChevronDown, ChevronUp, LogOut, Phone, Award, AlertTriangle } from "lucide-react";
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
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<Record<number, StudentAttempt[]>>({});
  const [loadingAttempts, setLoadingAttempts] = useState<Record<number, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/students").then((r) => r.json()),
      fetch("/api/admin/overview").then((r) => r.json()),
    ]).then(([s, o]) => {
      setStudents(s);
      setOverview(o);
      setLoading(false);
    });
  }, []);

  async function toggleStudent(id: number) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!attempts[id]) {
      setLoadingAttempts((p) => ({ ...p, [id]: true }));
      const data = await fetch(`/api/admin/students/${id}/attempts`).then((r) => r.json());
      setAttempts((p) => ({ ...p, [id]: data }));
      setLoadingAttempts((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Target className="w-4 h-4 text-primary-foreground" />
          </div>
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

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Overview stats */}
        {loading ? (
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

            {/* Top topics */}
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

        {/* Student list */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Student Roster
            {!loading && <span className="ml-2 text-muted-foreground font-normal">({students.length})</span>}
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : students.length === 0 ? (
            <div className="bg-card border border-card-border rounded-lg p-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No students registered yet.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Students will appear here once they log in.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s, idx) => (
                <div key={s.id} className="bg-card border border-card-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleStudent(s.id)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    {/* Rank */}
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{s.name[0].toUpperCase()}</span>
                    </div>

                    {/* Name + phone */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" /> {s.phone}
                      </p>
                    </div>

                    {/* Stats */}
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
                        <p className="text-xs font-medium text-muted-foreground">
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
                          {(attempts[s.id] ?? []).reverse().map((a) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
