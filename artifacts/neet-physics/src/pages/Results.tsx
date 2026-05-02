import { useParams } from "wouter";
import { useGetAttempt, getGetAttemptQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const attemptId = parseInt(id);
  const { data: result, isLoading } = useGetAttempt(attemptId, { query: { queryKey: getGetAttemptQueryKey(attemptId) } });

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-7 w-48 bg-muted rounded" />
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!result) return <div className="p-6 text-sm text-muted-foreground">Result not found.</div>;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link
          href="/tests"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tests
        </Link>
        <h1 className="text-xl font-bold text-foreground">Test Results</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{result.testTitle}</p>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-5">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className={cn("text-3xl font-bold tabular-nums",
              result.score >= 70 ? "text-emerald-400" : result.score >= 50 ? "text-amber-400" : "text-rose-400"
            )}>
              {result.score}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Score</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums text-emerald-400">{result.correctAnswers}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums text-rose-400">
              {result.totalQuestions - result.correctAnswers}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Wrong</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums text-foreground">{formatTime(result.timeTakenSeconds)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Time taken</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all",
                result.score >= 70 ? "bg-emerald-500" : result.score >= 50 ? "bg-amber-500" : "bg-rose-500"
              )}
              style={{ width: `${result.score}%` }}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Question Breakdown</h2>
        <div className="space-y-2">
          {(result.answers ?? []).map((a, idx) => (
            <div
              key={a.questionId}
              className={cn(
                "bg-card border rounded-lg p-4",
                a.isCorrect ? "border-emerald-500/20" : a.selectedOption === null ? "border-border" : "border-rose-500/20"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {a.selectedOption === null ? (
                    <MinusCircle className="w-4 h-4 text-muted-foreground" />
                  ) : a.isCorrect ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">Q{idx + 1}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a.topicName}</span>
                  </div>
                  <p className="text-sm text-foreground mb-2 leading-snug">{a.questionText}</p>
                  {!a.isCorrect && a.selectedOption !== null && (
                    <p className="text-xs text-rose-400 mb-1">
                      Your answer: <span className="font-mono font-semibold">{String.fromCharCode(65 + a.selectedOption)}</span>
                    </p>
                  )}
                  {!a.isCorrect && (
                    <p className="text-xs text-emerald-400 mb-2">
                      Correct: <span className="font-mono font-semibold">{String.fromCharCode(65 + a.correctOption)}</span>
                    </p>
                  )}
                  {a.selectedOption === null && (
                    <p className="text-xs text-muted-foreground mb-2">Not attempted</p>
                  )}
                  <div className="bg-muted/30 rounded px-2.5 py-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.explanation}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pb-4">
        <Link
          href="/tests"
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Take Another Test
        </Link>
        <Link
          href="/"
          className="px-4 py-2 border border-border text-sm text-muted-foreground rounded-lg hover:border-primary/50 hover:text-foreground transition-all"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
