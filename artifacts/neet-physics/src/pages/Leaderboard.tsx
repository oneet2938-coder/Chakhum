import { useState, useEffect } from "react";
import { Trophy, Gem, Zap, Phone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getRankForQuestions } from "@/lib/ranks";
import { cn } from "@/lib/utils";

interface LeaderboardRow {
  id: number;
  name: string;
  phone: string;
  totalQuestions: number;
  diamonds: number;
  rank: { level: number; title: string; color: string; bg: string; border: string; icon: string };
  joinedAt: string;
  position: number;
}

const POSITION_STYLES = [
  { bg: "bg-yellow-500/20", border: "border-yellow-500/40", text: "text-yellow-300", label: "🥇" },
  { bg: "bg-slate-400/15",  border: "border-slate-400/30",  text: "text-slate-300",  label: "🥈" },
  { bg: "bg-amber-700/15",  border: "border-amber-700/30",  text: "text-amber-600",  label: "🥉" },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => {
      setRows(d);
      setLoading(false);
    });
  }, []);

  const myId = user?.role === "student" ? (user as any).studentId : null;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">365-day diamond challenge · ranked by daily completions</p>
        </div>
      </div>

      {/* 365 day challenge banner */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💎</span>
          <div>
            <p className="text-sm font-bold text-yellow-300">365-Day Diamond Challenge</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete your daily practice target every day to earn diamonds. The student with the most diamonds at the end of 365 days wins a prize!
            </p>
          </div>
        </div>
      </div>

      {/* Rank guide */}
      <details className="bg-card border border-card-border rounded-xl overflow-hidden">
        <summary className="px-4 py-3 text-sm font-semibold text-foreground cursor-pointer select-none flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Medical Rank Guide
          <span className="ml-auto text-xs text-muted-foreground font-normal">click to expand</span>
        </summary>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 px-4 pb-4">
          {[
            { level: 1, title: "Intern", minQ: 0, icon: "🩺" },
            { level: 2, title: "Medical Student", minQ: 50, icon: "📚" },
            { level: 3, title: "House Surgeon", minQ: 150, icon: "✂️" },
            { level: 4, title: "Junior Resident", minQ: 350, icon: "🏥" },
            { level: 5, title: "Senior Resident", minQ: 700, icon: "💊" },
            { level: 6, title: "Registrar", minQ: 1200, icon: "🔬" },
            { level: 7, title: "Specialist", minQ: 2000, icon: "🧬" },
            { level: 8, title: "Consultant", minQ: 3500, icon: "👨‍⚕️" },
            { level: 9, title: "Senior Consultant", minQ: 5500, icon: "🏆" },
            { level: 10, title: "Chief Physician", minQ: 10000, icon: "⭐" },
          ].map((r) => (
            <div key={r.level} className="bg-muted/30 rounded-lg px-2.5 py-2 text-center">
              <div className="text-base mb-0.5">{r.icon}</div>
              <p className="text-[10px] font-semibold text-foreground leading-tight">{r.title}</p>
              <p className="text-[10px] text-muted-foreground">{r.minQ}+ Qs</p>
            </div>
          ))}
        </div>
      </details>

      {/* Leaderboard table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Diamond Standings</h2>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted/30 animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No students yet. Be the first!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => {
              const isMe = row.id === myId;
              const posStyle = row.position <= 3 ? POSITION_STYLES[row.position - 1] : null;
              const { rank, next, progressToNext } = getRankForQuestions(row.totalQuestions);

              return (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    isMe && "bg-primary/5 border-l-2 border-primary",
                    !isMe && "hover:bg-muted/20"
                  )}
                >
                  {/* Position */}
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0",
                    posStyle ? `${posStyle.bg} ${posStyle.border} border` : "bg-muted"
                  )}>
                    {posStyle ? posStyle.label : (
                      <span className="text-[11px] font-bold text-muted-foreground">#{row.position}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    isMe ? "bg-primary/30" : "bg-muted"
                  )}>
                    <span className={cn("text-xs font-bold", isMe ? "text-primary" : "text-muted-foreground")}>
                      {row.name[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Name + rank */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn("text-sm font-semibold truncate", isMe ? "text-primary" : "text-foreground")}>
                        {row.name} {isMe && <span className="text-[10px] font-normal text-muted-foreground">(you)</span>}
                      </p>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border font-semibold shrink-0",
                        rank.color, rank.bg, rank.border
                      )}>
                        {rank.icon} {rank.title}
                      </span>
                    </div>
                    {/* Rank progress bar */}
                    {next && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", rank.color.replace("text-", "bg-").replace("-400", "-500").replace("-300", "-400"))}
                            style={{ width: `${progressToNext}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                          {row.totalQuestions}/{next.minQ} → {next.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Diamonds */}
                  <div className="text-center shrink-0">
                    <div className="flex items-center gap-1 justify-center">
                      <span className="text-base leading-none">💎</span>
                      <span className="text-base font-bold tabular-nums text-cyan-300">{row.diamonds}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">diamonds</p>
                  </div>

                  {/* Total Qs */}
                  <div className="text-center shrink-0 w-14">
                    <p className="text-sm font-bold tabular-nums text-foreground">{row.totalQuestions}</p>
                    <p className="text-[9px] text-muted-foreground">questions</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
