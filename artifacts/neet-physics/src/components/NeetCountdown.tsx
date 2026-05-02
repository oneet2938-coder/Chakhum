import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// NEET 2027 — typically first Sunday of May
// May 2, 2027 is a Sunday
const NEET_2027 = new Date("2027-05-02T06:00:00+05:30").getTime();

function pad(n: number) {
  return String(n).padStart(2, "0");
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}

function calcTimeLeft(): TimeLeft {
  const now = Date.now();
  const diff = Math.max(0, NEET_2027 - now);
  const totalDays = Math.ceil(diff / 86_400_000);
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000)  / 60_000),
    seconds: Math.floor((diff % 60_000)     / 1_000),
    totalDays,
  };
}

function FlipUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <div className="bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600/60 rounded-lg px-3 py-1.5 min-w-[46px] text-center shadow-md">
          <span className="text-xl font-black tabular-nums text-white tracking-tight leading-none">{value}</span>
        </div>
        {/* card fold line */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-900/50 pointer-events-none" />
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

export default function NeetCountdown() {
  const [t, setT] = useState<TimeLeft>(calcTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setT(calcTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  // Urgency colour
  const urgency =
    t.totalDays < 30  ? "from-rose-500/20 to-rose-900/10 border-rose-500/30" :
    t.totalDays < 180 ? "from-amber-500/15 to-amber-900/10 border-amber-500/25" :
                        "from-primary/10 to-indigo-900/10 border-primary/20";

  const textColor =
    t.totalDays < 30  ? "text-rose-300" :
    t.totalDays < 180 ? "text-amber-300" :
                        "text-primary";

  return (
    <div className={cn(
      "bg-gradient-to-r rounded-xl border p-4",
      urgency
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">🏥</span>
            <span className={cn("text-sm font-bold", textColor)}>NEET 2027 Countdown</span>
          </div>
          <p className="text-xs text-muted-foreground">
            May 2, 2027 · Stay consistent — every day counts!
          </p>
          <p className={cn("text-xs font-semibold mt-1", textColor)}>
            {t.totalDays} days remaining
          </p>
        </div>

        {/* Flip clock */}
        <div className="flex items-end gap-1.5 shrink-0">
          <FlipUnit value={String(t.days).padStart(3, "0")} label="Days" />
          <span className="text-slate-500 font-bold text-lg mb-5 leading-none">:</span>
          <FlipUnit value={pad(t.hours)}   label="Hrs" />
          <span className="text-slate-500 font-bold text-lg mb-5 leading-none">:</span>
          <FlipUnit value={pad(t.minutes)} label="Min" />
          <span className="text-slate-500 font-bold text-lg mb-5 leading-none">:</span>
          <FlipUnit value={pad(t.seconds)} label="Sec" />
        </div>
      </div>
    </div>
  );
}
