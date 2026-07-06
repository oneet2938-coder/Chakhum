import { useState, useCallback, useEffect } from "react";
import { useListTopics, useListQuestions } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  CheckCircle, XCircle, RotateCcw, ChevronRight,
  ChevronLeft, X, Flame, BookOpen, Zap,
} from "lucide-react";

const DIFF_COLORS = {
  easy:   { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400" },
  medium: { bg: "bg-amber-500/10",   border: "border-amber-500/25",   text: "text-amber-400"   },
  hard:   { bg: "bg-rose-500/10",    border: "border-rose-500/25",    text: "text-rose-400"     },
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

type Difficulty = "easy" | "medium" | "hard";

function DifficultyPill({ d }: { d: string }) {
  const c = DIFF_COLORS[d as Difficulty] ?? DIFF_COLORS.medium;
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider", c.bg, c.border, c.text)}>
      {d}
    </span>
  );
}

type SubjectKey = "physics" | "chemistry" | "biology";

const SUBJECTS: { key: SubjectKey; label: string; emoji: string }[] = [
  { key: "physics", label: "Physics", emoji: "⚛️" },
  { key: "chemistry", label: "Chemistry", emoji: "🧪" },
  { key: "biology", label: "Biology", emoji: "🧬" },
];

export default function Practice() {
  const { user } = useAuth();
  const [subject, setSubject] = useState<SubjectKey>("physics");
  const { data: allTopics } = useListTopics();
  const topics = (allTopics ?? []).filter((t: any) => (t.subject ?? "physics") === subject);

  const [selectedTopic, setSelectedTopic] = useState<number | undefined>(undefined);
  const [selectedTopicName, setSelectedTopicName] = useState("");
  const [selectedDiff, setSelectedDiff] = useState<Difficulty | undefined>(undefined);
  const [quizStarted, setQuizStarted] = useState(false);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered]     = useState<number | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<{ correct: boolean }[]>([]);

  const { data: questions } = useListQuestions({
    topicId: selectedTopic,
    subject: selectedTopic ? undefined : subject,
    difficulty: selectedDiff,
  });

  const currentQ = questions?.[currentIdx];
  const totalQ   = questions?.length ?? 0;
  const totalAnswered = sessionAnswers.length;
  const totalCorrect  = sessionAnswers.filter((a) => a.correct).length;

  // Lock scroll in quiz mode
  useEffect(() => {
    if (quizStarted) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [quizStarted]);

  // Keyboard: 1-4 to select option, →/Enter to next
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!quizStarted) return;
    if (e.key >= "1" && e.key <= "4") {
      handleAnswer(Number(e.key) - 1);
    } else if ((e.key === "ArrowRight" || e.key === "Enter") && answered !== null) {
      goNext();
    } else if (e.key === "ArrowLeft" && currentIdx > 0 && answered === null) {
      setCurrentIdx(i => i - 1);
    } else if (e.key === "Escape") {
      exitQuiz();
    }
  }, [quizStarted, answered, currentIdx, questions]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  async function recordAnswer(questionId: number, selectedOption: number) {
    if (user?.role !== "student") return;
    try {
      await fetch(`${import.meta.env.BASE_URL}api/practice/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Student-ID": String((user as any).studentId) },
        body: JSON.stringify({ questionId, selectedOption }),
      });
    } catch {}
  }

  function handleAnswer(optionIdx: number) {
    if (answered !== null || !currentQ) return;
    setAnswered(optionIdx);
    setSessionAnswers(prev => [...prev, { correct: optionIdx === currentQ.correctOption }]);
    recordAnswer(currentQ.id, optionIdx);
  }

  function goNext() {
    if (!questions) return;
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setAnswered(null);
    }
  }

  function exitQuiz() {
    setQuizStarted(false);
    setCurrentIdx(0);
    setAnswered(null);
    setSessionAnswers([]);
  }

  function startQuiz(topicId?: number, topicName?: string) {
    setSelectedTopic(topicId);
    setSelectedTopicName(topicName ?? "All Chapters");
    setSelectedDiff(undefined);
    setCurrentIdx(0);
    setAnswered(null);
    setSessionAnswers([]);
    setQuizStarted(true);
  }

  // ── Chapter selection grid ──
  if (!quizStarted) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-black text-foreground">Practice MCQs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Select a subject and chapter to start practising</p>
        </div>

        {/* Subject tabs */}
        <div className="flex items-center gap-2 border-b border-border">
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSubject(s.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
                subject === s.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Quick start — All chapters */}
        <button
          onClick={() => startQuiz(undefined, `All ${SUBJECTS.find(s => s.key === subject)?.label} Chapters`)}
          className="w-full flex items-center gap-4 bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 rounded-2xl px-5 py-4 hover:border-primary/50 hover:bg-primary/20 transition-all group"
        >
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-bold text-foreground">All Chapters</p>
            <p className="text-xs text-muted-foreground">Mixed questions from every topic in this subject</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary" />
        </button>

        {/* Chapter grid */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Or pick a chapter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topics.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 col-span-2 text-center">No chapters yet for this subject.</p>
            )}
            {topics.map((t: any, i: number) => (
              <button
                key={t.id}
                onClick={() => startQuiz(t.id, t.name)}
                className="flex items-center gap-3 bg-card border border-card-border rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-muted/40 transition-all text-left group"
              >
                <span className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center text-[11px] font-black text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary transition-colors shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-foreground group-hover:text-foreground flex-1 leading-snug">{t.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Full-screen quiz mode ──
  if (!currentQ) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">No questions found for this selection.</p>
          <button onClick={exitQuiz} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isCorrect = answered === currentQ.correctOption;
  const isLast    = currentIdx === totalQ - 1;
  const sessionPct = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ touchAction: "manipulation" }}>

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <button
          onClick={exitQuiz}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 space-y-0.5">
          <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${totalQ > 0 ? ((currentIdx + 1) / totalQ) * 100 : 0}%` }}
            />
          </div>
        </div>

        <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">
          {currentIdx + 1}/{totalQ}
        </span>

        {/* Session score badge */}
        {totalAnswered > 0 && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border",
            sessionPct >= 60 ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                             : "bg-rose-500/15 border-rose-500/30 text-rose-400"
          )}>
            <Flame className="w-3 h-3" />
            {sessionPct}%
          </div>
        )}
      </div>

      {/* ── Difficulty filter (shown in quiz) ── */}
      <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 border-b border-border/50 bg-background overflow-x-auto">
        <span className="text-[10px] text-muted-foreground font-medium shrink-0">{selectedTopicName}</span>
        <span className="text-muted-foreground/30 text-xs shrink-0">·</span>
        {(["all", "easy", "medium", "hard"] as const).map(d => (
          <button
            key={d}
            onClick={() => {
              setSelectedDiff(d === "all" ? undefined : d);
              setCurrentIdx(0);
              setAnswered(null);
            }}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all shrink-0",
              (d === "all" ? selectedDiff === undefined : selectedDiff === d)
                ? "bg-primary/20 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {/* ── Question area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 pb-4 max-w-2xl mx-auto space-y-5">

          {/* Topic + difficulty */}
          <div className="flex items-center gap-2 flex-wrap">
            <DifficultyPill d={currentQ.difficulty} />
            <span className="text-[11px] text-muted-foreground">{currentQ.topicName}</span>
          </div>

          {/* Diagram image */}
          {(currentQ as any).imageB64 && (
            <div className="rounded-xl border border-border overflow-hidden bg-white">
              <img
                src={`data:image/jpeg;base64,${(currentQ as any).imageB64}`}
                alt="Question diagram"
                className="w-full object-contain max-h-56"
              />
            </div>
          )}

          {/* Question text */}
          <p className="text-base font-semibold text-foreground leading-relaxed">
            {currentQ.text}
          </p>

          {/* ── Bubble options ── */}
          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((opt, i) => {
              const isThisCorrect = i === currentQ.correctOption;
              const isSelected    = answered === i;
              const showResult    = answered !== null;

              let bubbleCls = "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/40 hover:text-foreground";
              let letterCls = "border-border text-muted-foreground";

              if (showResult) {
                if (isThisCorrect) {
                  bubbleCls = "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
                  letterCls = "bg-emerald-500 border-emerald-500 text-white";
                } else if (isSelected) {
                  bubbleCls = "border-rose-500/40 bg-rose-500/10 text-rose-300";
                  letterCls = "bg-rose-500 border-rose-500 text-white";
                } else {
                  bubbleCls = "border-border bg-card text-muted-foreground opacity-40";
                  letterCls = "border-border text-muted-foreground";
                }
              } else if (isSelected) {
                bubbleCls = "border-primary bg-primary/15 text-foreground";
                letterCls = "bg-primary border-primary text-primary-foreground";
              }

              return (
                <button
                  key={i}
                  disabled={answered !== null}
                  onClick={() => handleAnswer(i)}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 text-sm text-left transition-all active:scale-[0.98]",
                    bubbleCls
                  )}
                >
                  {/* Bubble letter */}
                  <span className={cn(
                    "w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-black shrink-0 transition-all",
                    letterCls
                  )}>
                    {OPTION_LETTERS[i]}
                  </span>
                  <span className="flex-1 leading-snug font-medium">{opt}</span>
                  {showResult && isThisCorrect && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {showResult && isSelected && !isThisCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered !== null && (
            <div className={cn(
              "rounded-xl border px-4 py-3 space-y-1",
              isCorrect ? "bg-emerald-500/8 border-emerald-500/25" : "bg-rose-500/8 border-rose-500/25"
            )}>
              <p className={cn("text-xs font-bold", isCorrect ? "text-emerald-400" : "text-rose-400")}>
                {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{currentQ.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom navigation ── */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setAnswered(null); }}
            disabled={currentIdx === 0}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <div className="flex-1 text-center">
            {totalAnswered > 0 && (
              <p className="text-[11px] text-muted-foreground">
                <span className="text-emerald-400 font-bold">{totalCorrect}</span>
                <span className="mx-1">/</span>
                <span className="font-bold">{totalAnswered}</span>
                <span className="ml-1">correct</span>
              </p>
            )}
          </div>

          {answered === null ? (
            <button
              disabled
              className="flex items-center gap-1.5 px-5 py-3 text-sm font-bold bg-muted/30 border border-border text-muted-foreground/50 rounded-xl cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : isLast ? (
            <button
              onClick={() => { setCurrentIdx(0); setAnswered(null); setSessionAnswers([]); }}
              className="flex items-center gap-1.5 px-5 py-3 text-sm font-black bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Restart
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-5 py-3 text-sm font-bold bg-primary/15 border border-primary/30 text-primary rounded-xl hover:bg-primary/25 transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
