import { useListTests, useListAttempts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Clock, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DIFFICULTY_COLORS = {
  easy: "bg-emerald-500/15 text-emerald-400",
  medium: "bg-amber-500/15 text-amber-400",
  hard: "bg-rose-500/15 text-rose-400",
  mixed: "bg-primary/15 text-primary",
};

export default function Tests() {
  const { data: tests, isLoading } = useListTests();
  const { data: attempts } = useListAttempts();

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
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Mock Tests</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Timed full-length test series</p>
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
                      <FileText className="w-3 h-3" />
                      {test.questionCount} questions
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {test.durationMinutes} min
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
                    )}>
                      {best}%
                    </p>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          );
        })}
        {(tests?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No tests available.</p>
        )}
      </div>
    </div>
  );
}
