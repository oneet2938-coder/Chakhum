import { useState } from "react";
import { useListTopics, useListQuestions } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, ChevronRight, RotateCcw } from "lucide-react";

const DIFFICULTY_COLORS = {
  easy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  hard: "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

export default function Practice() {
  const { user } = useAuth();
  const { data: topics } = useListTopics();
  const [selectedTopic, setSelectedTopic] = useState<number | undefined>(undefined);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | undefined>(undefined);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<{ correct: boolean }[]>([]);

  const { data: questions } = useListQuestions({
    topicId: selectedTopic,
    difficulty: selectedDifficulty as "easy" | "medium" | "hard" | undefined,
  });

  const currentQ = questions?.[currentIdx];
  const totalAnswered = sessionAnswers.length;
  const totalCorrect = sessionAnswers.filter((a) => a.correct).length;

  async function recordAnswer(questionId: number, selectedOption: number) {
    if (user?.role !== "student") return;
    try {
      await fetch("/api/practice/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Student-ID": String((user as any).studentId),
        },
        body: JSON.stringify({ questionId, selectedOption }),
      });
    } catch {
      // silent — don't block the UI if tracking fails
    }
  }

  function handleAnswer(optionIdx: number) {
    if (answered !== null || !currentQ) return;
    setAnswered(optionIdx);
    setSessionAnswers((prev) => [...prev, { correct: optionIdx === currentQ.correctOption }]);
    recordAnswer(currentQ.id, optionIdx);
  }

  function nextQuestion() {
    if (!questions) return;
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setAnswered(null);
    }
  }

  function reset() {
    setCurrentIdx(0);
    setAnswered(null);
    setSessionAnswers([]);
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Practice MCQs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Instant feedback on each question</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Topic</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              data-testid="filter-topic-all"
              onClick={() => { setSelectedTopic(undefined); reset(); }}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border font-medium transition-all",
                selectedTopic === undefined ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              All
            </button>
            {(topics ?? []).map((t) => (
              <button
                key={t.id}
                data-testid={`filter-topic-${t.id}`}
                onClick={() => { setSelectedTopic(t.id); reset(); }}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md border font-medium transition-all",
                  selectedTopic === t.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Difficulty</p>
          <div className="flex gap-1.5">
            {(["all", "easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                data-testid={`filter-difficulty-${d}`}
                onClick={() => { setSelectedDifficulty(d === "all" ? undefined : d); reset(); }}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md border font-medium capitalize transition-all",
                  (d === "all" ? selectedDifficulty === undefined : selectedDifficulty === d)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Session stats */}
      {totalAnswered > 0 && (
        <div className="flex items-center gap-4 bg-card border border-card-border rounded-lg px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Session:</span>
          <span className="text-xs font-semibold text-foreground">{totalAnswered} answered</span>
          <span className="text-xs text-emerald-400 font-semibold">{totalCorrect} correct</span>
          <span className={cn("text-xs font-bold", totalAnswered > 0 && Math.round(totalCorrect/totalAnswered*100) >= 60 ? "text-emerald-400" : "text-rose-400")}>
            {totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0}%
          </span>
          <button onClick={reset} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      )}

      {/* Question card */}
      {currentQ ? (
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4 max-w-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                Q{currentIdx + 1} / {questions?.length}
              </span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border uppercase font-semibold tracking-wider",
                DIFFICULTY_COLORS[currentQ.difficulty as keyof typeof DIFFICULTY_COLORS] ?? DIFFICULTY_COLORS.medium
              )}>
                {currentQ.difficulty}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {currentQ.topicName}
              </span>
            </div>
          </div>

          <p className="text-sm text-foreground leading-relaxed font-medium">{currentQ.text}</p>

          <div className="space-y-2">
            {currentQ.options.map((opt, i) => {
              const isCorrect = i === currentQ.correctOption;
              const isSelected = answered === i;
              const showResult = answered !== null;

              return (
                <button
                  key={i}
                  data-testid={`option-${i}`}
                  disabled={answered !== null}
                  onClick={() => handleAnswer(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-all",
                    !showResult && "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-muted/30",
                    showResult && isCorrect && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                    showResult && isSelected && !isCorrect && "border-rose-500/40 bg-rose-500/10 text-rose-300",
                    showResult && !isCorrect && !isSelected && "border-border text-muted-foreground opacity-50",
                  )}
                >
                  <span className={cn("text-xs font-mono font-bold shrink-0 w-5",
                    showResult && isCorrect ? "text-emerald-400" :
                    showResult && isSelected && !isCorrect ? "text-rose-400" : "text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {showResult && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {answered !== null && (
            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-primary mb-1">Explanation</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{currentQ.explanation}</p>
              </div>
              {currentIdx < (questions?.length ?? 0) - 1 ? (
                <button
                  data-testid="next-question"
                  onClick={nextQuestion}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Next Question <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="text-sm text-muted-foreground">
                  All questions done! <button onClick={reset} className="text-primary hover:underline">Start over</button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-lg p-8 text-center max-w-2xl">
          <p className="text-sm text-muted-foreground">No questions found for this filter. Try another topic or difficulty.</p>
        </div>
      )}
    </div>
  );
}
