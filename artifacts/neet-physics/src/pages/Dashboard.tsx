import { useGetProgressSummary, useGetTopicProgress, useListAttempts } from "@workspace/api-client-react";
import { TrendingUp, Target, BookCheck, ChevronRight, Award, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", color ?? "text-foreground")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: sumLoading } = useGetProgressSummary();
  const { data: topicProgress } = useGetTopicProgress();
  const { data: attempts } = useListAttempts();

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your NEET Physics progress at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Accuracy"
          value={`${summary?.accuracy ?? 0}%`}
          sub={`${summary?.totalCorrect ?? 0} / ${summary?.totalQuestionsAnswered ?? 0} correct`}
          color={
            (summary?.accuracy ?? 0) >= 70
              ? "text-emerald-400"
              : (summary?.accuracy ?? 0) >= 50
              ? "text-amber-400"
              : "text-rose-400"
          }
        />
        <StatCard
          label="Tests Taken"
          value={summary?.totalTestsTaken ?? 0}
          sub={`Avg score: ${summary?.averageScore ?? 0}%`}
        />
        <StatCard
          label="Best Score"
          value={`${summary?.bestScore ?? 0}%`}
          color="text-primary"
        />
        <StatCard
          label="Questions Done"
          value={summary?.totalQuestionsAnswered ?? 0}
          sub="total answered"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Topic Performance</h2>
            <Link
              href="/topics"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
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
                    className={cn(
                      "h-full rounded-full transition-all",
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
                  <span key={t} className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {t}
                  </span>
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
                  <span key={t} className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-card-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Recent Tests</h2>
              <Link
                href="/tests"
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
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
                      <p className="text-[11px] text-muted-foreground">
                        {a.correctAnswers}/{a.totalQuestions} correct
                      </p>
                    </div>
                    <span className={cn(
                      "text-sm font-bold tabular-nums",
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

      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/practice"
          className="bg-primary/10 border border-primary/20 rounded-lg p-4 hover:bg-primary/15 transition-colors block"
        >
          <Target className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-semibold text-foreground">Practice MCQs</p>
          <p className="text-xs text-muted-foreground mt-0.5">Topic-wise questions</p>
        </Link>
        <Link
          href="/tests"
          className="bg-card border border-card-border rounded-lg p-4 hover:bg-muted/50 transition-colors block"
        >
          <BookCheck className="w-5 h-5 text-accent mb-2" />
          <p className="text-sm font-semibold text-foreground">Mock Tests</p>
          <p className="text-xs text-muted-foreground mt-0.5">Timed full-length tests</p>
        </Link>
        <Link
          href="/topics"
          className="bg-card border border-card-border rounded-lg p-4 hover:bg-muted/50 transition-colors block"
        >
          <TrendingUp className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-sm font-semibold text-foreground">Study Topics</p>
          <p className="text-xs text-muted-foreground mt-0.5">Browse all chapters</p>
        </Link>
      </div>
    </div>
  );
}
