import { useListTests, useListAttempts } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Clock, FileText, ChevronRight, CalendarDays, Trophy,
  Lock, FlaskConical, CheckCircle2, Circle, AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

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

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  mastery_chapter: { label: "Chapter", color: "bg-primary/15 text-primary border-primary/20" },
  mastery_class:   { label: "Full Class", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  mastery_final:   { label: "Final", color: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
};

export default function Tests() {
  const { user } = useAuth();
  const { data: allTests, isLoading } = useListTests();
  const { data: attempts } = useListAttempts();

  const isMastery = user?.role === "student" && user.courseType === "test_only";

  const masteryTests = (allTests ?? []).filter(
    (t) => t.testType && t.testType !== "practice"
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextSat = getNextSaturday();
  const countdown = useCountdown(nextSat);
  const nextSatStr = nextSat.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const attemptsByTest: Record<number, number[]> = {};
  (attempts ?? []).forEach((a) => {
    if (!attemptsByTest[a.testId]) attemptsByTest[a.testId] = [];
    attemptsByTest[a.testId].push(a.score);
  });

  const class11Tests = masteryTests.filter((t) => (t as any).classLevel === "11" || (t as any).class_level === "11");
  const class12Tests = masteryTests.filter((t) => (t as any).classLevel === "12" || (t as any).class_level === "12");
  const fullTests    = masteryTests.filter(
    (t) => ((t as any).classLevel === "all" || (t as any).class_level === "all") ||
           (t as any).testType === "mastery_final"
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-7 w-48 bg-muted rounded animate-pulse" />
        {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Header Banner ── */}
      <div className={cn(
        "rounded-xl overflow-hidden border",
        isMastery
          ? "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
          : "border-border bg-card"
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
                <CalendarDays className="w-3 h-3" /> Every Saturday · NEET-pattern chapter tests
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

          {/* Countdown to next Saturday */}
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

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Chapter Tests", val: masteryTests.filter(t => (t as any).testType === "mastery_chapter").length },
              { label: "Full Class Tests", val: masteryTests.filter(t => (t as any).testType === "mastery_class").length },
              { label: "Final Test", val: masteryTests.filter(t => (t as any).testType === "mastery_final").length },
            ].map(({ label, val }) => (
              <div key={label} className="bg-muted/30 border border-border rounded-lg px-2 py-2 text-center">
                <p className="text-base font-black text-foreground">{val}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {!isMastery && (
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              Enroll in the <span className="text-primary font-semibold">Mastery Test Series</span> (₹5,000/yr) — approved by your teacher
            </p>
          )}
        </div>
      </div>

      {/* ── Class 11 Chapter Tests ── */}
      {class11Tests.length > 0 && (
        <TestSection
          title="Class 11 — Chapter Tests"
          subtitle="Units → Waves · Every Saturday 10 AM"
          tests={class11Tests}
          isMastery={isMastery}
          attemptsByTest={attemptsByTest}
          today={today}
        />
      )}

      {/* ── Class 12 Chapter Tests ── */}
      {class12Tests.length > 0 && (
        <TestSection
          title="Class 12 — Chapter Tests"
          subtitle="Electric Charges → Semiconductor · Every Saturday 10 AM"
          tests={class12Tests}
          isMastery={isMastery}
          attemptsByTest={attemptsByTest}
          today={today}
        />
      )}

      {/* ── Full / Final Tests ── */}
      {fullTests.length > 0 && (
        <TestSection
          title="Full Syllabus Tests"
          subtitle="Complete Class 11 & 12 · NEET mock"
          tests={fullTests}
          isMastery={isMastery}
          attemptsByTest={attemptsByTest}
          today={today}
        />
      )}

      {masteryTests.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
          Schedule not loaded yet. Check back shortly.
        </div>
      )}
    </div>
  );
}

type AnyTest = {
  id: number;
  title: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  difficulty: string;
  testType?: string | null;
  scheduledDate?: string | null;
  classLevel?: string | null;
};

function TestSection({
  title, subtitle, tests, isMastery, attemptsByTest, today,
}: {
  title: string;
  subtitle: string;
  tests: AnyTest[];
  isMastery: boolean;
  attemptsByTest: Record<number, number[]>;
  today: Date;
}) {
  const sorted = [...tests].sort((a, b) => {
    const da = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
    const db = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
    return da - db;
  });

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-2.5">
        {sorted.map((test) => (
          <TestCard
            key={test.id}
            test={test}
            isMastery={isMastery}
            scores={attemptsByTest[test.id] ?? []}
            today={today}
          />
        ))}
      </div>
    </div>
  );
}

function TestCard({
  test, isMastery, scores, today,
}: {
  test: AnyTest;
  isMastery: boolean;
  scores: number[];
  today: Date;
}) {
  const schedDate = test.scheduledDate ? new Date(test.scheduledDate) : null;
  const isPast = schedDate ? schedDate <= today : false;
  const isToday = schedDate
    ? schedDate.toDateString() === today.toDateString()
    : false;
  const best = scores.length > 0 ? Math.max(...scores) : null;
  const attempted = scores.length > 0;
  const typeInfo = TYPE_LABEL[(test.testType as string) ?? ""] ?? { label: "Test", color: "bg-muted text-muted-foreground border-border" };

  const dateStr = schedDate
    ? schedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const canAttempt = isMastery && isPast;

  const inner = (
    <div className={cn(
      "bg-card border rounded-lg p-4 flex items-center justify-between gap-3 transition-all",
      canAttempt ? "border-card-border hover:border-primary/40 cursor-pointer group" : "border-border opacity-70",
      isToday && "border-primary/40 bg-primary/5"
    )}>
      {/* Status icon */}
      <div className="shrink-0 w-8 flex items-center justify-center">
        {attempted
          ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          : isPast && isMastery
          ? <Circle className="w-5 h-5 text-muted-foreground" />
          : !isMastery
          ? <Lock className="w-4 h-4 text-muted-foreground" />
          : <Circle className="w-5 h-5 text-muted-foreground/40" />
        }
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground truncate">{test.title}</h3>
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider shrink-0", typeInfo.color)}>
            {typeInfo.label}
          </span>
          {isToday && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold uppercase tracking-wider shrink-0">TODAY</span>}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />{dateStr}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <FileText className="w-3 h-3" />{test.questionCount} Qs
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />{test.durationMinutes} min
          </span>
        </div>
      </div>

      {/* Best score / chevron */}
      <div className="shrink-0 flex items-center gap-2">
        {best !== null && (
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground">Best</p>
            <p className={cn("text-sm font-bold tabular-nums",
              best >= 70 ? "text-emerald-400" : best >= 50 ? "text-amber-400" : "text-rose-400"
            )}>{best}%</p>
          </div>
        )}
        {canAttempt && (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>
    </div>
  );

  if (canAttempt) {
    return (
      <Link key={test.id} href={`/tests/${test.id}`} className="block">
        {inner}
      </Link>
    );
  }
  return <div key={test.id}>{inner}</div>;
}
