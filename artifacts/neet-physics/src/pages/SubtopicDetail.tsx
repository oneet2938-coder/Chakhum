import { useParams, Link } from "wouter";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const DIFFICULTY_COLORS = {
  easy: "bg-emerald-500/15 text-emerald-400",
  medium: "bg-amber-500/15 text-amber-400",
  hard: "bg-rose-500/15 text-rose-400",
};

type Question = {
  id: number;
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  difficulty: string;
  year?: number;
};

type SubtopicData = {
  id: number;
  name: string;
  topicId: number;
  topicName: string;
  questions: Question[];
};

export default function SubtopicDetail() {
  const { id, subtopicId } = useParams<{ id: string; subtopicId: string }>();
  const [data, setData] = useState<SubtopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "easy" | "medium" | "hard">("all");

  useEffect(() => {
    setLoading(true);
    fetch(`${import.meta.env.BASE_URL}api/subtopics/${subtopicId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [subtopicId]);

  const filtered = (data?.questions ?? []).filter(
    (q) => filter === "all" || q.difficulty === filter
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-7 w-64 bg-muted rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-card rounded-lg border border-card-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Subtopic not found.</p>
        <Link href={`/topics/${id}`} className="text-primary underline text-sm mt-2 inline-block">← Back to chapter</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link
          href={`/topics/${id}`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {data.topicName}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{data.topicName}</p>
            <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
          {data.questions.length} questions
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "easy", "medium", "hard"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={cn(
              "px-3 py-1 text-xs rounded-full border transition-all font-medium capitalize",
              filter === d
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {d === "all" ? `All (${data.questions.length})` : d}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((q, idx) => (
          <div key={q.id} className="bg-card border border-card-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === q.id ? null : q.id)}
              className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0 tabular-nums">Q{idx + 1}</span>
                <p className="text-sm text-foreground leading-snug">{q.text}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider",
                  DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] ?? DIFFICULTY_COLORS.medium
                )}>
                  {q.difficulty}
                </span>
                {expanded === q.id
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </button>

            {expanded === q.id && (
              <div className="px-4 pb-4 border-t border-border">
                <div className="mt-3 space-y-1.5 mb-4">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded text-sm",
                        i === q.correctOption
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                          : "bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-mono font-semibold",
                        i === q.correctOption ? "text-emerald-400" : "text-muted-foreground"
                      )}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/30 rounded px-3 py-2.5">
                  <p className="text-xs font-semibold text-primary mb-1">Explanation</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
                </div>
                {q.year && (
                  <p className="text-[10px] text-muted-foreground mt-2">NEET {q.year}</p>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No questions for this filter.</p>
        )}
      </div>
    </div>
  );
}
