import { useParams, useLocation } from "wouter";
import { useGetTest, useSubmitAttempt, getGetTestQueryKey } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function TestDetail() {
  const { id } = useParams<{ id: string }>();
  const testId = parseInt(id);
  const [, setLocation] = useLocation();
  const { data: test, isLoading } = useGetTest(testId, { query: { queryKey: getGetTestQueryKey(testId) } });
  const submitAttempt = useSubmitAttempt();

  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (started && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            handleSubmit();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current!);
  }, [started]);

  function startTest() {
    if (!test) return;
    setStarted(true);
    setTimeLeft(test.durationMinutes * 60);
    setAnswers({});
    setCurrentIdx(0);
  }

  function handleSubmit() {
    if (!test) return;
    const timeTaken = test.durationMinutes * 60 - timeLeft;
    const answerList = (test.questions ?? []).map((q) => ({
      questionId: q.id,
      selectedOption: answers[q.id] ?? null,
    }));
    submitAttempt.mutate(
      { data: { testId: test.id, timeTakenSeconds: timeTaken, answers: answerList } },
      { onSuccess: (result) => setLocation(`/results/${result.id}`) }
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-7 w-48 bg-muted rounded" />
        <div className="h-40 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!test) return <div className="p-6 text-sm text-muted-foreground">Test not found.</div>;

  if (!started) {
    return (
      <div className="p-6 space-y-5">
        <Link
          href="/tests"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tests
        </Link>
        <div className="bg-card border border-card-border rounded-lg p-6 max-w-lg">
          <h1 className="text-lg font-bold text-foreground mb-1">{test.title}</h1>
          <p className="text-sm text-muted-foreground mb-5">{test.description}</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{test.questions?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{test.durationMinutes}</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground capitalize">{test.difficulty}</p>
              <p className="text-xs text-muted-foreground">Difficulty</p>
            </div>
          </div>
          <button
            data-testid="start-test"
            onClick={startTest}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Start Test
          </button>
        </div>
      </div>
    );
  }

  const questions = test.questions ?? [];
  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between bg-card border border-card-border rounded-lg px-4 py-2.5">
        <span className="text-sm font-semibold text-foreground">{test.title}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">{answeredCount}/{questions.length} answered</span>
          <span className={cn(
            "flex items-center gap-1.5 text-sm font-mono font-bold tabular-nums",
            timeLeft < 120 ? "text-rose-400" : timeLeft < 300 ? "text-amber-400" : "text-primary"
          )}>
            <Clock className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            data-testid={`nav-q-${i}`}
            onClick={() => setCurrentIdx(i)}
            className={cn(
              "w-7 h-7 rounded text-xs font-mono font-semibold transition-all",
              i === currentIdx ? "bg-primary text-primary-foreground" :
              answers[q.id] !== undefined ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
              "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {currentQ && (
        <div className="bg-card border border-card-border rounded-lg p-5 space-y-4 max-w-2xl">
          <p className="text-xs font-mono text-muted-foreground">Q{currentIdx + 1} of {questions.length}</p>
          <p className="text-sm text-foreground font-medium leading-relaxed">{currentQ.text}</p>
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => (
              <button
                key={i}
                data-testid={`option-${i}`}
                onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: i }))}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-all",
                  answers[currentQ.id] === i
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/30"
                )}
              >
                <span className="text-xs font-mono font-bold w-5 shrink-0">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
                {answers[currentQ.id] === i && <CheckCircle className="w-4 h-4 ml-auto shrink-0" />}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg disabled:opacity-30 hover:border-primary/40 hover:text-foreground transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            {currentIdx < questions.length - 1 ? (
              <button
                data-testid="next-question"
                onClick={() => setCurrentIdx((i) => i + 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                data-testid="submit-test"
                onClick={handleSubmit}
                disabled={submitAttempt.isPending}
                className="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:opacity-90 font-semibold transition-opacity disabled:opacity-60"
              >
                {submitAttempt.isPending ? "Submitting..." : "Submit Test"}
              </button>
            )}
          </div>
        </div>
      )}

      {answeredCount > 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitAttempt.isPending}
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Submit early ({answeredCount}/{questions.length} answered)
        </button>
      )}
    </div>
  );
}
