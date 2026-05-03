import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, BookOpen, Trophy, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DIFFICULTY_COLORS = {
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
};

type PracticeSet = {
  id: number;
  title: string;
  description: string;
  practiceDate: string;
  questions: Question[];
  completion: { score: number; total: number; completed_at: string } | null;
};

export default function DailyPractice() {
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null | undefined>(undefined);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  function getStudentHeader(): Record<string, string> {
    try {
      const raw = localStorage.getItem("emc_session");
      if (!raw) return {};
      const u = JSON.parse(raw);
      if (u?.studentId) return { "X-Student-ID": String(u.studentId) };
    } catch {}
    return {};
  }

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
    setSubmitted(true);
    setSubmitting(false);
  }

  const loading = practiceSet === undefined;
  const noSet = practiceSet === null;
  const questions = practiceSet?.questions ?? [];
  const answeredCount = Object.keys(answers).length;
  const totalQ = questions.length;
  const progress = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;

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

  // Results view
  if (submitted && result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="p-6 space-y-5">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        <div className={cn(
          "rounded-xl p-6 border text-center",
          pct >= 70 ? "bg-emerald-500/10 border-emerald-500/25" :
          pct >= 50 ? "bg-amber-500/10 border-amber-500/25" : "bg-rose-500/10 border-rose-500/25"
        )}>
          <Trophy className={cn("w-10 h-10 mx-auto mb-3",
            pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400"
          )} />
          <h2 className="text-2xl font-black text-foreground mb-1">{pct}%</h2>
          <p className="text-sm text-muted-foreground">
            {result.score} of {result.total} correct
          </p>
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
                "bg-card border rounded-lg p-4",
                wasAnswered && isCorrect ? "border-emerald-500/30" :
                wasAnswered ? "border-rose-500/30" : "border-card-border"
              )}>
                <div className="flex items-start gap-2 mb-3">
                  <span className={cn("text-xs font-bold shrink-0 mt-0.5",
                    wasAnswered && isCorrect ? "text-emerald-400" :
                    wasAnswered ? "text-rose-400" : "text-muted-foreground"
                  )}>Q{idx + 1}</span>
                  <p className="text-sm text-foreground leading-snug">{q.text}</p>
                </div>
                <div className="space-y-1.5 mb-3">
                  {q.options.map((opt, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded text-xs",
                      i === q.correctOption ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" :
                      i === userAns && !isCorrect ? "bg-rose-500/10 border border-rose-500/25 text-rose-300" :
                      "bg-muted/40 text-muted-foreground"
                    )}>
                      <span className="font-mono font-bold shrink-0">{String.fromCharCode(65 + i)}</span>
                      <span>{opt}</span>
                      {i === q.correctOption && <CheckCircle2 className="w-3 h-3 ml-auto shrink-0" />}
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
                  <div className="mt-2 bg-muted/30 rounded px-3 py-2">
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

  // Quiz view
  const q = questions[currentQ];
  if (!q) return null;

  return (
    <div className="p-6 space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/25 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">📅 Today's Practice</p>
            <h1 className="text-base font-bold text-foreground">{practiceSet.title}</h1>
            {practiceSet.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{practiceSet.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-foreground tabular-nums">{answeredCount}/{totalQ}</p>
            <p className="text-[10px] text-muted-foreground">answered</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question navigator */}
      <div className="flex gap-1.5 flex-wrap">
        {questions.map((question, i) => (
          <button
            key={question.id}
            onClick={() => setCurrentQ(i)}
            className={cn(
              "w-8 h-8 rounded-md text-xs font-bold border transition-all",
              i === currentQ
                ? "bg-primary text-primary-foreground border-primary"
                : answers[question.id] !== undefined
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current question */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            <span className="text-xs text-muted-foreground font-mono font-bold shrink-0 mt-0.5">Q{currentQ + 1}</span>
            <p className="text-sm text-foreground leading-relaxed">{q.text}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border uppercase font-semibold tracking-wider",
              DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] ?? DIFFICULTY_COLORS.medium
            )}>
              {q.difficulty}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setAnswers(p => ({ ...p, [q.id]: i }))}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-all",
                answers[q.id] === i
                  ? "bg-primary/15 border-primary/40 text-foreground"
                  : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span className={cn(
                "w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0",
                answers[q.id] === i ? "bg-primary border-primary text-primary-foreground" : "border-border"
              )}>
                {String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> {q.topicName}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
          disabled={currentQ === 0}
          className="px-4 py-2 text-xs font-semibold border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40"
        >
          ← Previous
        </button>

        {currentQ < totalQ - 1 ? (
          <button
            onClick={() => setCurrentQ(p => Math.min(totalQ - 1, p + 1))}
            className="px-4 py-2 text-xs font-semibold bg-primary/10 border border-primary/25 text-primary rounded-lg hover:bg-primary/20 transition-all"
          >
            Next →
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {answeredCount < totalQ && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {totalQ - answeredCount} unanswered
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-all disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Answers"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
