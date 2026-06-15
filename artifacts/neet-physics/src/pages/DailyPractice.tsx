import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, CheckCircle2, ChevronRight, BookOpen, Trophy,
  AlertCircle, X, ChevronLeft, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DIFF_COLORS = {
  easy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  hard: "bg-rose-500/15 text-rose-400 border-rose-500/25",
};

type Question = {
  id: number;
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  difficulty: string;
  topicName: string;
  imageB64?: string | null;
};

type PracticeSet = {
  id: number;
  title: string;
  description: string;
  practiceDate: string;
  questions: Question[];
  completion: { score: number; total: number; completed_at: string } | null;
};

function getStudentHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem("emc_session");
    if (!raw) return {};
    const u = JSON.parse(raw);
    if (u?.studentId) return { "X-Student-ID": String(u.studentId) };
  } catch {}
  return {};
}

export default function DailyPractice() {
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null | undefined>(undefined);
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [diamondEarned, setDiamondEarned] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/practice-sets/today`, {
      headers: getStudentHeader(),
    })
      .then((r) => r.json())
      .then((data) => {
        setPracticeSet(data);
        if (data?.completion) {
          setSubmitted(true);
          setResult({ score: data.completion.score, total: data.completion.total });
        }
      })
      .catch(() => setPracticeSet(null));
  }, []);

  // Lock body scroll when in full-screen mode
  useEffect(() => {
    if (started && !submitted) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [started, submitted]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!started || submitted) return;
    const questions = practiceSet?.questions ?? [];
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      setCurrentQ(p => Math.min(questions.length - 1, p + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      setCurrentQ(p => Math.max(0, p - 1));
    } else if (e.key >= "1" && e.key <= "4") {
      const q = questions[currentQ];
      if (q) setAnswers(p => ({ ...p, [q.id]: Number(e.key) - 1 }));
    }
  }, [started, submitted, practiceSet, currentQ]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  async function handleSubmit() {
    if (!practiceSet) return;
    const answerArr = practiceSet.questions.map((q) => ({
      questionId: q.id,
      selectedOption: answers[q.id] ?? -1,
    }));
    setSubmitting(true);
    const res = await fetch(`${import.meta.env.BASE_URL}api/practice-sets/${practiceSet.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getStudentHeader() },
      body: JSON.stringify({ answers: answerArr }),
    });
    const data = await res.json();
    setResult(data);
    setDiamondEarned(data.diamondEarned ?? false);
    setSubmitted(true);
    setSubmitting(false);
  }

  const loading = practiceSet === undefined;
  const noSet = practiceSet === null;
  const questions = practiceSet?.questions ?? [];
  const answeredCount = Object.keys(answers).length;
  const totalQ = questions.length;
  const progress = totalQ > 0 ? ((currentQ + 1) / totalQ) * 100 : 0;

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-24 bg-card rounded-xl border border-card-border" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card rounded-lg border border-card-border" />)}
        </div>
      </div>
    );
  }

  // ── No practice set ──
  if (noSet) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="py-16 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h2 className="text-lg font-bold text-foreground mb-2">No Practice Set Today</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Your teacher hasn't posted today's practice set yet. Check back soon!
          </p>
          <Link href="/practice" className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-primary/10 border border-primary/25 text-primary text-sm font-semibold rounded-lg hover:bg-primary/15 transition-colors">
            Practice on your own instead <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Results view (after submit) — shown in normal page layout ──
  if (submitted && result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="p-4 space-y-5 max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {diamondEarned && (
          <div className="bg-gradient-to-r from-blue-500/15 to-violet-500/15 border border-blue-500/30 rounded-xl px-5 py-4 flex items-center gap-4">
            <span className="text-4xl">💎</span>
            <div>
              <p className="text-sm font-bold text-foreground">You earned a Diamond!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Completing today's practice counts toward your daily goal. Keep it up!</p>
            </div>
          </div>
        )}

        <div className={cn(
          "rounded-xl p-6 border text-center",
          pct >= 70 ? "bg-emerald-500/10 border-emerald-500/25" :
          pct >= 50 ? "bg-amber-500/10 border-amber-500/25" : "bg-rose-500/10 border-rose-500/25"
        )}>
          <Trophy className={cn("w-10 h-10 mx-auto mb-3",
            pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400"
          )} />
          <h2 className="text-3xl font-black text-foreground mb-1">{pct}%</h2>
          <p className="text-sm text-muted-foreground">{result.score} of {result.total} correct</p>
          <p className="text-xs text-muted-foreground mt-2">
            {pct >= 70 ? "Excellent work! 🎉" : pct >= 50 ? "Good effort! Keep going 💪" : "Keep practicing, you'll get there! 📚"}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Review Answers</h3>
          {questions.map((q, idx) => {
            const userAns = answers[q.id] ?? -1;
            const isCorrect = userAns === q.correctOption;
            const wasAnswered = userAns !== -1;
            return (
              <div key={q.id} className={cn(
                "bg-card border rounded-xl p-4",
                wasAnswered && isCorrect ? "border-emerald-500/30" :
                wasAnswered ? "border-rose-500/30" : "border-card-border"
              )}>
                <div className="flex items-start gap-2 mb-3">
                  <span className={cn("text-xs font-bold shrink-0 mt-0.5",
                    wasAnswered && isCorrect ? "text-emerald-400" :
                    wasAnswered ? "text-rose-400" : "text-muted-foreground"
                  )}>Q{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    {q.imageB64 && (
                      <img
                        src={`data:image/jpeg;base64,${q.imageB64}`}
                        alt="Question diagram"
                        className="max-w-full rounded-lg border border-border mb-2"
                      />
                    )}
                    <p className="text-sm text-foreground leading-snug">{q.text}</p>
                  </div>
                </div>
                <div className="space-y-1.5 mb-3">
                  {q.options.map((opt, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                      i === q.correctOption ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" :
                      i === userAns && !isCorrect ? "bg-rose-500/10 border border-rose-500/25 text-rose-300" :
                      "bg-muted/40 text-muted-foreground"
                    )}>
                      <span className="font-mono font-bold shrink-0">{String.fromCharCode(65 + i)}</span>
                      <span className="flex-1">{opt}</span>
                      {i === q.correctOption && <CheckCircle2 className="w-3 h-3 ml-auto shrink-0 text-emerald-400" />}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowExplanation(p => ({ ...p, [q.id]: !p[q.id] }))}
                  className="text-[11px] text-primary hover:underline"
                >
                  {showExplanation[q.id] ? "Hide" : "Show"} explanation
                </button>
                {showExplanation[q.id] && (
                  <div className="mt-2 bg-muted/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Landing screen (before start) ──
  if (!started) {
    return (
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">📅 Today's Practice</p>
            <h1 className="text-xl font-black text-foreground">{practiceSet.title}</h1>
            {practiceSet.description && (
              <p className="text-sm text-muted-foreground mt-1">{practiceSet.description}</p>
            )}
          </div>

          <div className="flex justify-center gap-6 text-center">
            <div>
              <p className="text-2xl font-black text-foreground">{totalQ}</p>
              <p className="text-[11px] text-muted-foreground">Questions</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-2xl font-black text-foreground">
                {questions.filter(q => q.difficulty === "easy").length}
              </p>
              <p className="text-[11px] text-emerald-400">Easy</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="text-2xl font-black text-foreground">
                {questions.filter(q => q.difficulty === "hard").length}
              </p>
              <p className="text-[11px] text-rose-400">Hard</p>
            </div>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="w-full py-4 text-base font-black bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/25"
          >
            Start Practice →
          </button>
          <p className="text-[11px] text-muted-foreground">Tap each option to select your answer, then navigate</p>
        </div>
      </div>
    );
  }

  // ── Full-screen quiz mode ──
  const q = questions[currentQ];
  if (!q) return null;
  const isLast = currentQ === totalQ - 1;
  const unanswered = totalQ - answeredCount;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ touchAction: "manipulation" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-safe-top py-3 border-b border-border shrink-0 bg-background">
        <button
          onClick={() => setConfirmExit(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Exit practice"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">
          {currentQ + 1}/{totalQ}
        </span>
      </div>

      {/* Question area — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 max-w-2xl mx-auto space-y-5">
          {/* Difficulty + topic badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider",
              DIFF_COLORS[q.difficulty as keyof typeof DIFF_COLORS] ?? DIFF_COLORS.medium
            )}>
              {q.difficulty}
            </span>
            <span className="text-[11px] text-muted-foreground">{q.topicName}</span>
          </div>

          {/* Question image (diagram) */}
          {q.imageB64 && (
            <div className="rounded-xl border border-border overflow-hidden bg-white">
              <img
                src={`data:image/jpeg;base64,${q.imageB64}`}
                alt="Question diagram"
                className="w-full object-contain max-h-64"
              />
            </div>
          )}

          {/* Question text */}
          <p className="text-base font-semibold text-foreground leading-relaxed">
            {q.text}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers(p => ({ ...p, [q.id]: i }))}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-sm text-left transition-all active:scale-[0.98]",
                    selected
                      ? "bg-primary/20 border-primary text-foreground shadow-sm shadow-primary/20"
                      : "bg-card border-card-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 transition-colors",
                    selected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 leading-snug">{opt}</span>
                  {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Question dot navigator */}
          <div className="flex gap-1.5 flex-wrap justify-center pt-2">
            {questions.map((question, i) => (
              <button
                key={question.id}
                onClick={() => setCurrentQ(i)}
                className={cn(
                  "w-7 h-7 rounded-md text-[11px] font-bold border transition-all",
                  i === currentQ
                    ? "bg-primary text-primary-foreground border-primary"
                    : answers[question.id] !== undefined
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom navigation — fixed */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3 pb-safe-bottom">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
            disabled={currentQ === 0}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <div className="flex-1" />

          {!isLast ? (
            <button
              onClick={() => setCurrentQ(p => Math.min(totalQ - 1, p + 1))}
              className="flex items-center gap-1.5 px-5 py-3 text-sm font-bold bg-primary/15 border border-primary/30 text-primary rounded-xl hover:bg-primary/25 transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-black rounded-xl transition-all",
                unanswered > 0
                  ? "bg-amber-500/90 text-white hover:bg-amber-400"
                  : "bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/25"
              )}
            >
              {submitting ? "Submitting…" : unanswered > 0 ? `Submit (${unanswered} left)` : "Submit ✓"}
            </button>
          )}
        </div>
      </div>

      {/* Exit confirmation modal */}
      {confirmExit && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 z-10">
          <div className="bg-card border border-card-border rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-foreground">Exit Practice?</h3>
            <p className="text-sm text-muted-foreground">
              Your progress won't be saved. You'll need to start over.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmExit(false)}
                className="flex-1 py-3 text-sm font-semibold border border-border rounded-xl text-foreground hover:bg-muted/40 transition-colors"
              >
                Keep Going
              </button>
              <button
                onClick={() => { setStarted(false); setConfirmExit(false); setCurrentQ(0); setAnswers({}); }}
                className="flex-1 py-3 text-sm font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl hover:bg-rose-500/25 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
