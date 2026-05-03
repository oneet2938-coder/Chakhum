import { useParams } from "wouter";
import { useGetTopic, useGetTopicProgress, getGetTopicQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const SUBTOPIC_ICONS = [
  "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "bg-teal-500/15 text-teal-400 border-teal-500/20",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "bg-rose-500/15 text-rose-400 border-rose-500/20",
  "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
];

type Subtopic = {
  id: number;
  name: string;
  orderIndex: number;
  questionCount: number;
};

type TopicWithSubtopics = {
  id: number;
  name: string;
  description: string;
  icon: string;
  questionCount: number;
  subtopics: Subtopic[];
};

export default function TopicDetail() {
  const { id } = useParams<{ id: string }>();
  const topicId = parseInt(id);
  const { data: topic } = useGetTopic(topicId, { query: { queryKey: getGetTopicQueryKey(topicId) } }) as { data: TopicWithSubtopics | undefined };
  const { data: progress } = useGetTopicProgress();

  const topicProgress = (progress ?? []).find((p) => p.topicId === topicId);
  const subtopics: Subtopic[] = topic?.subtopics ?? [];

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link
          href="/topics"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Topics
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{topic?.name ?? "Loading..."}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{topic?.description}</p>
          </div>
          {topicProgress && topicProgress.questionsAttempted > 0 && (
            <div className="text-right shrink-0 ml-4">
              <p className={cn("text-2xl font-bold tabular-nums",
                topicProgress.accuracy >= 70 ? "text-emerald-400" :
                topicProgress.accuracy >= 50 ? "text-amber-400" : "text-rose-400"
              )}>
                {topicProgress.accuracy}%
              </p>
              <p className="text-xs text-muted-foreground">{topicProgress.correctAnswers}/{topicProgress.questionsAttempted} correct</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
          {topic?.questionCount ?? 0} total questions
        </span>
        <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
          {subtopics.length} sub-topics
        </span>
        {topicProgress && topicProgress.questionsAttempted > 0 && (
          <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
            {topicProgress.questionsAttempted} attempted
          </span>
        )}
      </div>

      {/* Sub-topics grid */}
      {subtopics.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {subtopics.map((sub, idx) => (
            <Link
              key={sub.id}
              href={`/topics/${id}/subtopics/${sub.id}`}
              className="group block bg-card border border-card-border rounded-xl p-4 hover:border-primary/40 hover:bg-card/80 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 font-bold text-sm",
                  SUBTOPIC_ICONS[idx % SUBTOPIC_ICONS.length]
                )}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {sub.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Circle className="w-2 h-2 fill-current" />
                      {sub.questionCount} questions
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Loading sub-topics…</p>
        </div>
      )}
    </div>
  );
}
