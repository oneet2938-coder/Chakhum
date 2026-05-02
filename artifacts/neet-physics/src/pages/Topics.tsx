import { useListTopics, useGetTopicProgress } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, string> = {
  cog: "⚙",
  flame: "🔥",
  zap: "⚡",
  activity: "📊",
  magnet: "🧲",
  eye: "👁",
  atom: "⚛",
  waves: "〰",
};

export default function Topics() {
  const { data: topics, isLoading } = useListTopics();
  const { data: progress } = useGetTopicProgress();

  const progressMap = Object.fromEntries((progress ?? []).map((p) => [p.topicId, p]));

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-7 w-32 bg-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Physics Topics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{topics?.length ?? 0} chapters — click to practice</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(topics ?? []).map((topic) => {
          const p = progressMap[topic.id];
          const accuracy = p?.questionsAttempted ? p.accuracy : null;
          return (
            <Link
              key={topic.id}
              href={`/topics/${topic.id}`}
              data-testid={`topic-card-${topic.id}`}
              className="bg-card border border-card-border rounded-lg p-4 hover:border-primary/40 hover:bg-card/80 transition-all group block"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{ICON_MAP[topic.icon] ?? "📘"}</span>
                {accuracy !== null && (
                  <span className={cn(
                    "text-xs font-bold tabular-nums px-1.5 py-0.5 rounded",
                    accuracy >= 70 ? "bg-emerald-500/15 text-emerald-400" :
                    accuracy >= 50 ? "bg-amber-500/15 text-amber-400" :
                    "bg-rose-500/15 text-rose-400"
                  )}>
                    {accuracy}%
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-0.5">{topic.name}</h3>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{topic.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{topic.questionCount} questions</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              {p && p.questionsAttempted > 0 && (
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full",
                      accuracy! >= 70 ? "bg-emerald-500" : accuracy! >= 50 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
