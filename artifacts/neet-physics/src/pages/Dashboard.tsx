import { useGetProgressSummary, useGetTopicProgress, useListAttempts } from "@workspace/api-client-react";
import { TrendingUp, Target, BookCheck, ChevronRight, Award, AlertTriangle, Trophy, CalendarDays, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useGamification } from "@/hooks/useGamification";
import RankBadge, { RankIcon } from "@/components/RankBadge";
import NeetCountdown from "@/components/NeetCountdown";
import { useEffect, useState } from "react";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", color ?? "text-foreground")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

type DailySet = { id: number; title: string; practiceDate: string; completion: { score: number; total: number } | null } | null;

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: sumLoading } = useGetProgressSummary();
  const { data: topicProgress } = useGetTopicProgress();
  const { data: attempts } = useListAttempts();
  const { stats: gamification } = useGamification();
  const [dailySet, setDailySet] = useState<DailySet | undefined>(undefined);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/practice-sets/today`)
      .then((r) => r.json())
      .then(setDailySet)
      .catch(() => setDailySet(null));
  }, []);

  if (sumLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  const recentAttempts = (attempts ?? []).slice(-5).reverse();
  const sortedTopics = [...(topicProgress ?? [])].sort((a, b) => b.questionsAttempted - a.questionsAttempted);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Welcome back, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your NEET Physics progress at a glance</p>
      </div>

      {/* NEET 2027 Countdown */}
      <NeetCountdown />

      {/* Gamification hero */}
      {gamification && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Diamond card */}
          <div className="bg-gradient-to-br from-cyan-500/15 to-blue-500/5 border border-cyan-500/25 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💎</span>
              <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Diamonds</p>
            </div>
            <p className="text-4xl font-bold text-cyan-300 tabular-nums mb-1">{gamification.diamonds}</p>
            <p className="text-xs text-muted-foreground mb-3">
              {365 - gamification.diamonds > 0
                ? `${365 - gamification.diamonds} more to complete the 365-day challenge`
                : "🎉 365-day challenge complete!"}
            </p>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">365-day progress</span>
                <span className="text-[10px] text-cyan-400 font-semibold">
                  {Math.round((gamification.diamonds / 365) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (gamification.diamonds / 365) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Rank card */}
          <div className={cn("border rounded-xl p-4", gamification.rank.bg, gamification.rank.border)}>
            <div className="flex items-center gap-2.5 mb-3">
              <RankIcon rank={gamification.rank} size="md" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Medical Rank</p>
                <p className={cn("text-sm font-bold leading-tight", gamification.rank.color)}>
                  {gamification.rank.title}
                </p>
              </div>
              <span className={cn(
                "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border",
                gamification.rank.color, gamification.rank.bg, gamification.rank.border
              )}>
                Lv.{gamification.rank.level}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              {gamification.totalQuestions} questions answered · Rank {gamification.rank.level} of 10
            </p>

            {gamification.next ? (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    → <RankBadge rank={gamification.next} size="xs" />
                  </span>
                  <span className={cn("text-[10px] font-semibold", gamification.rank.color)}>
                    {gamification.progressToNext}%
                  </span>
                </div>
                <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r", gamification.rank.gradientFrom, gamification.rank.gradientTo)}
                    style={{ width: `${gamification.progressToNext}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {Math.max(0, gamification.next.minQ - gamification.totalQuestions)} more questions needed
                </p>
              </div>
            ) : (
              <p className={cn("text-xs font-semibold", gamification.rank.color)}>⭐ Maximum rank achieved!</p>
            )}
          </div>

          {/* Today's challenge */}
          <div className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Today's Challenge</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Answer <span className="text-foreground font-semibold">{gamification.target} questions</span> today to earn a 💎 diamond!
            </p>
            <Link
              href="/practice"
              className="flex items-center justify-center gap-2 w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Start Practicing <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center justify-center gap-2 w-full py-2 mt-2 bg-muted/40 text-muted-foreground text-xs font-medium rounded-lg hover:bg-muted/60 transition-colors border border-border"
            >
              <Trophy className="w-3.5 h-3.5" /> View Leaderboard
            </Link>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Accuracy"
          value={`${summary?.accuracy ?? 0}%`}
          sub={`${summary?.totalCorrect ?? 0} / ${summary?.totalQuestionsAnswered ?? 0} correct`}
          color={
            (summary?.accuracy ?? 0) >= 70 ? "text-emerald-400" :
            (summary?.accuracy ?? 0) >= 50 ? "text-amber-400" : "text-rose-400"
          }
        />
        <StatCard label="Tests Taken" value={summary?.totalTestsTaken ?? 0} sub={`Avg: ${summary?.averageScore ?? 0}%`} />
        <StatCard label="Best Score" value={`${summary?.bestScore ?? 0}%`} color="text-primary" />
        <StatCard label="Questions Done" value={summary?.totalQuestionsAnswered ?? 0} sub="total answered" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Topic performance */}
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Topic Performance</h2>
            <Link href="/topics" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {sortedTopics.slice(0, 6).map((t) => (
              <div key={t.topicId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground font-medium">{t.topicName}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t.questionsAttempted > 0 ? `${t.accuracy}%` : "—"}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all",
                      t.accuracy >= 70 ? "bg-emerald-500" : t.accuracy >= 50 ? "bg-amber-500" : t.questionsAttempted > 0 ? "bg-rose-500" : "bg-muted-foreground/30"
                    )}
                    style={{ width: `${t.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
            {sortedTopics.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No data yet. Start practicing!</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {(summary?.weakTopics?.length ?? 0) > 0 && (
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-sm font-semibold text-foreground">Needs Attention</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {summary?.weakTopics.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">{t}</span>
                ))}
              </div>
            </div>
          )}

          {(summary?.strongTopics?.length ?? 0) > 0 && (
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <h2 className="text-sm font-semibold text-foreground">Strong Areas</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {summary?.strongTopics.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-card-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Tests</h2>
              <Link href="/tests" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                All tests <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {recentAttempts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tests taken yet.</p>
            ) : (
              <div className="space-y-2">
                {recentAttempts.map((a) => (
                  <Link
                    key={a.id}
                    href={`/results/${a.id}`}
                    className="flex items-center justify-between py-1.5 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground truncate max-w-[160px]">{a.testTitle}</p>
                      <p className="text-[11px] text-muted-foreground">{a.correctAnswers}/{a.totalQuestions} correct</p>
                    </div>
                    <span className={cn("text-sm font-bold tabular-nums",
                      a.score >= 70 ? "text-emerald-400" : a.score >= 50 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {a.score}%
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Practice Banner */}
      {dailySet !== undefined && (
        dailySet ? (
          <Link
            href="/daily-practice"
            className={cn(
              "block rounded-xl p-4 border transition-all hover:opacity-90",
              dailySet.completion
                ? "bg-emerald-500/10 border-emerald-500/25"
                : "bg-gradient-to-r from-primary/15 to-primary/5 border-primary/30"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  dailySet.completion ? "bg-emerald-500/20" : "bg-primary/20"
                )}>
                  {dailySet.completion
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    : <CalendarDays className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">📅 Today's Practice</p>
                    {!dailySet.completion && (
                      <span className="text-[9px] font-black text-primary bg-primary/15 border border-primary/25 px-1.5 py-0.5 rounded-full uppercase tracking-wide animate-pulse">NEW</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-foreground">{dailySet.title}</p>
                  {dailySet.completion && (
                    <p className="text-xs text-emerald-400 font-semibold">
                      ✓ Completed — {dailySet.completion.score}/{dailySet.completion.total} correct
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className={cn("w-4 h-4 shrink-0",
                dailySet.completion ? "text-emerald-400" : "text-primary"
              )} />
            </div>
          </Link>
        ) : null
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/practice" className="bg-primary/10 border border-primary/20 rounded-lg p-4 hover:bg-primary/15 transition-colors block">
          <Target className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold text-foreground">Practice MCQs</p>
          <p className="text-xs text-muted-foreground mt-0.5">Topic-wise questions</p>
        </Link>
        <Link href="/tests" className="bg-card border border-card-border rounded-lg p-4 hover:bg-muted/50 transition-colors block">
          <BookCheck className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold text-foreground">Mock Tests</p>
          <p className="text-xs text-muted-foreground mt-0.5">Timed full-length tests</p>
        </Link>
        <Link href="/leaderboard" className="bg-card border border-card-border rounded-lg p-4 hover:bg-muted/50 transition-colors block">
          <Trophy className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-sm font-semibold text-foreground">Leaderboard</p>
          <p className="text-xs text-muted-foreground mt-0.5">Diamond rankings</p>
        </Link>
        <Link href="/ai-tutor" className="bg-gradient-to-br from-violet-500/15 to-primary/5 border border-violet-500/25 rounded-lg p-4 hover:from-violet-500/20 transition-all block relative overflow-hidden">
          <div className="absolute top-2 right-2 text-[9px] font-black text-violet-400 bg-violet-500/20 border border-violet-500/30 px-1.5 py-0.5 rounded-full">FREE</div>
          <Sparkles className="w-5 h-5 text-violet-400 mb-2" />
          <p className="text-sm font-semibold text-foreground">AI Tutor</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ask any Physics Q</p>
        </Link>
      </div>
    </div>
  );
}
