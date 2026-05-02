import { useListTests, useListAttempts } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Clock, FileText, ChevronRight, CalendarDays, Trophy,
  Lock, FlaskConical, CheckCircle2, Circle, AlertCircle,
  IndianRupee, ShieldCheck, Hourglass, XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const { user, login, refreshStatus } = useAuth();
  const { data: allTests, isLoading } = useListTests();
  const { data: attempts } = useListAttempts();
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyDone, setBuyDone] = useState(false);

  const isEnrolled   = user?.role === "student" && user.courseType === "test_only" && user.status === "approved";
  const isPending    = user?.role === "student" && user.courseType === "test_only" && user.status === "pending";
  const isRejected   = user?.role === "student" && user.courseType === "test_only" && user.status === "rejected";
  const isFoundation = user?.role === "student" && user.courseType === "foundation";

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

  async function requestEnrollment() {
    if (!user || user.role !== "student") return;
    setBuyLoading(true);
    try {
      await fetch(`/api/admin/students/${user.studentId}/course-type`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseType: "test_only" }),
      });
      setBuyDone(true);
      // Update local auth state to reflect pending
      login({ ...user, courseType: "test_only", status: "pending" });
      await refreshStatus();
    } finally {
      setBuyLoading(false);
    }
  }

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
        isEnrolled
          ? "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
          : isPending
          ? "border-amber-500/30 bg-amber-500/5"
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

            {/* Status badge */}
            {isEnrolled && (
              <div className="shrink-0 flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
                <Trophy className="w-3.5 h-3.5" /> Enrolled
              </div>
            )}
            {isPending && (
              <div className="shrink-0 flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/25 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full">
                <Hourglass className="w-3.5 h-3.5" /> Awaiting approval
              </div>
            )}
            {isRejected && (
              <div className="shrink-0 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-full">
                <XCircle className="w-3.5 h-3.5" /> Access denied
              </div>
            )}
            {isFoundation && !buyDone && (
              <div className="shrink-0 flex items-center gap-1.5 bg-muted border border-border text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                <Lock className="w-3.5 h-3.5" /> ₹5,000/yr
              </div>
            )}
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
          <div className="grid grid-cols-3 gap-2 mb-4">
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

          {/* ── Buy / status CTA for non-enrolled ── */}
          {(isFoundation || buyDone) && !isEnrolled && !isPending && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
                <p className="text-[11px] text-amber-300 font-medium">
                  Pay ₹5,000 to your teacher first (UPI or cash), then tap <strong>Request Access</strong> — your teacher will approve within 24 hours.
                </p>
              </div>
              <button
                onClick={requestEnrollment}
                disabled={buyLoading || buyDone}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <IndianRupee className="w-4 h-4" />
                {buyLoading ? "Sending request…" : buyDone ? "Request sent!" : "Buy — Request Access (₹5,000/yr)"}
              </button>
            </div>
          )}

          {isPending && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
              <Hourglass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-300">Request received!</p>
                <p className="text-[11px] text-amber-300/70 mt-0.5">
                  Your teacher will approve your access soon. Tests will unlock after approval — starting from <strong>June 13, 2026</strong>.
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-400">Access not approved</p>
                <p className="text-[11px] text-rose-400/70 mt-0.5">
                  Please contact your teacher to resolve this.
                </p>
              </div>
            </div>
          )}

          {isEnrolled && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-300 font-medium">
                Full access unlocked. Tests open on their scheduled Saturday from June 13, 2026.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Show test list only to enrolled students ── */}
      {isEnrolled && (
        <>
          {class11Tests.length > 0 && (
            <TestSection
              title="Class 11 — Chapter Tests"
              subtitle="Units → Waves · Every Saturday 10 AM"
              tests={class11Tests}
              isMastery={isEnrolled}
              attemptsByTest={attemptsByTest}
              today={today}
            />
          )}

          {class12Tests.length > 0 && (
            <TestSection
              title="Class 12 — Chapter Tests"
              subtitle="Electric Charges → Semiconductor · Every Saturday 10 AM"
              tests={class12Tests}
              isMastery={isEnrolled}
              attemptsByTest={attemptsByTest}
              today={today}
            />
          )}

          {fullTests.length > 0 && (
            <TestSection
              title="Full Syllabus Tests"
              subtitle="Complete Class 11 & 12 · NEET mock"
              tests={fullTests}
              isMastery={isEnrolled}
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
        </>
      )}

      {/* Preview of test count for non-enrolled */}
      {!isEnrolled && masteryTests.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">What's included</p>
          <div className="space-y-2">
            {[
              { label: `${masteryTests.filter(t => (t as any).testType === "mastery_chapter").length} Chapter Tests`, sub: "One per chapter · Class 11 & 12", icon: FileText },
              { label: `${masteryTests.filter(t => (t as any).testType === "mastery_class").length} Full Class Tests`, sub: "Class 11 complete · Class 12 complete", icon: Trophy },
              { label: `${masteryTests.filter(t => (t as any).testType === "mastery_final").length} Final NEET Mock`, sub: "Full syllabus · NEET pattern", icon: FlaskConical },
            ].map(({ label, sub, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{sub}</p>
                </div>
                <Lock className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
              </div>
            ))}
          </div>
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
          : <Lock className="w-4 h-4 text-muted-foreground" />
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
