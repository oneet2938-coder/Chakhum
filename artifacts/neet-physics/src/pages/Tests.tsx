import { useListTests, useListAttempts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Clock, FileText, ChevronRight, CalendarDays, Trophy, FlaskConical, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const DIFFICULTY_COLORS = {
  easy: "bg-emerald-500/15 text-emerald-400",
  medium: "bg-amber-500/15 text-amber-400",
  hard: "bg-rose-500/15 text-rose-400",
  mixed: "bg-primary/15 text-primary",
};

function getNextSaturday() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSaturday = day === 6 ? 7 : 6 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSaturday);
  next.setHours(10, 0, 0, 0);
  return next;
}

function useCountdown(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
}

export default function Tests() {
  const { user } = useAuth();
  const { data: tests, isLoading } = useListTests();
  const { data: attempts } = useListAttempts();

  const isMastery = user?.role === "student" && user.courseType === "test_only";
  const nextSat = getNextSaturday();
  const countdown = useCountdown(nextSat);
  const nextSatStr = nextSat.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const attemptsByTest: Record<number, number[]> = {};
  (attempts ?? []).forEach((a) => {
    if (!attemptsByTest[a.testId]) attemptsByTest[a.testId] = [];
    attemptsByTest[a.testId].push(a.score);
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-7 w-40 bg-muted rounded animate-pulse" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Mastery Test Series banner ── */}
      <div className={cn(
        "rounded-xl overflow-hidden border",
        isMastery ? "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" : "border-border bg-card"
      )}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live Series</span>
              </div>
              <h2 className="text-xl font-black text-foreground">Mastery Test Series</h2>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <CalendarDays className="w-3 h-3" /> Every Saturday · Full-length NEET mock
              </p>
            </div>
            {isMastery
              ? <div className="shrink-0 flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
                  <Trophy className="w-3.5 h-3.5" /> Enrolled
                </div>
              : <div className="shrink-0 flex items-center gap-1.5 bg-muted border border-border text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                  <Lock className="w-3.5 h-3.5" /> ₹5,000/yr
                </div>
            }
          </div>

          {/* Next test countdown */}
          <div className="bg-background/60 rounded-lg p-3 mb-4">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Next Test — {nextSatStr}</p>
            <div className="flex items-center gap-3">
              {[
                { val: countdown.days, label: "days" },
                { val: countdown.hours, label: "hrs" },
                { val: countdown.minutes, label: "min" },
              ].map(({ val, label }) => (
                <div key={label} className="flex-1 bg-card border border-border rounded-lg py-2 text-center">
                  <p className="text-xl font-black tabular-nums text-foreground">{String(val).padStart(2, "0")}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Series schedule */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {["Week 1 · Ch 1–10", "Week 2 · Ch 11–20", "Week 3 · Ch 21–29"].map((w, i) => (
              <div key={w} className={cn("rounded-lg px-2 py-2 border text-[10px]",
                i === 0
                  ? "bg-primary/10 border-primary/20 text-primary font-semibold"
                  : "bg-muted/30 border-border text-muted-foreground"
              )}>
                {w}
              </div>
            ))}
          </div>

          {!isMastery && (
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              Enroll in the <span className="text-primary font-semibold">Mastery Test Series</span> (₹5,000/yr) to join Saturday tests
            </p>
          )}
        </div>
      </div>

      {/* ── Practice Mock Tests ── */}
      <div>
        <div className="mb-3">
          <h1 className="text-lg font-bold text-foreground">Practice Mock Tests</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Timed full-length tests — attempt anytime</p>
        </div>

        <div className="space-y-3">
          {(tests ?? []).map((test) => {
            const scores = attemptsByTest[test.id] ?? [];
            const best = scores.length > 0 ? Math.max(...scores) : null;

            return (
              <Link
                key={test.id}
                href={`/tests/${test.id}`}
                data-testid={`test-card-${test.id}`}
                className="bg-card border border-card-border rounded-lg p-4 hover:border-primary/40 transition-all flex items-center justify-between group block"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-foreground truncate">{test.title}</h3>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider shrink-0",
                        DIFFICULTY_COLORS[test.difficulty as keyof typeof DIFFICULTY_COLORS] ?? DIFFICULTY_COLORS.mixed
                      )}>
                        {test.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 truncate">{test.description}</p>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />{test.questionCount} questions
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />{test.durationMinutes} min
                      </span>
                      {scores.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {scores.length} attempt{scores.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {best !== null && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Best</p>
                      <p className={cn("text-sm font-bold tabular-nums",
                        best >= 70 ? "text-emerald-400" : best >= 50 ? "text-amber-400" : "text-rose-400"
                      )}>{best}%</p>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            );
          })}
          {(tests?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No tests available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
