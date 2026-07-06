import { useState } from "react";
import { Clock, CheckCircle2, XCircle, RefreshCw, Phone, FlaskConical, Zap, Trophy, LogOut, BookOpen, IndianRupee, CalendarDays, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

function getNextSaturday() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSaturday = day === 6 ? 7 : 6 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSaturday);
  next.setHours(10, 0, 0, 0);
  return next;
}

export default function PendingApprovalScreen({ rejected = false }: { rejected?: boolean }) {
  const { user, logout, refreshStatus } = useAuth();
  const [checking, setChecking] = useState(false);
  const [justChecked, setJustChecked] = useState(false);

  const nextSat = getNextSaturday();
  const nextSatStr = nextSat.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  async function handleCheck() {
    setChecking(true);
    await refreshStatus();
    setChecking(false);
    setJustChecked(true);
    setTimeout(() => setJustChecked(false), 3000);
  }

  const studentName = user?.role === "student" ? user.name : "";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-8">
        <img src="/logo.png" alt="EMC Logo" className="w-12 h-12 rounded-xl object-contain" />
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-wide">TSM</h1>
          <p className="text-xs text-muted-foreground">Mastery Test Series</p>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Status card */}
        <div className={cn("rounded-xl border p-6 text-center", rejected ? "bg-rose-500/10 border-rose-500/30" : "bg-amber-500/8 border-amber-500/25")}>
          <div className="flex justify-center mb-4">
            {rejected ? <XCircle className="w-14 h-14 text-rose-400" /> : <Clock className="w-14 h-14 text-amber-400 animate-pulse" />}
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            {rejected ? "Enrollment Rejected" : "Waiting for Teacher Approval"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {rejected
              ? "Your enrollment was not approved. Please contact your teacher."
              : <>Hi <span className="text-foreground font-semibold">{studentName}</span>! Pay ₹5,000 to your teacher and they'll approve your Mastery Test Series access.</>
            }
          </p>
        </div>

        {/* What you'll get */}
        {!rejected && (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Once approved</p>
                <h3 className="text-sm font-bold text-foreground">Mastery Test Series — ₹5,000/yr</h3>
              </div>
              <div className="flex items-center gap-1 text-primary font-black text-lg">
                <IndianRupee className="w-4 h-4" />5,000
              </div>
            </div>
            <div className="p-4 space-y-2">
              {[
                { icon: FlaskConical, label: "Full-length Saturday mock tests every week" },
                { icon: BookOpen,    label: "All 708+ NEET PYQ-style practice questions" },
                { icon: Trophy,      label: "Mastery leaderboard & medical ranks" },
                { icon: Zap,         label: "Daily progress tracking & teacher monitoring" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Saturday test */}
        {!rejected && (
          <div className="bg-card border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Next Mastery Test</p>
              <p className="text-sm font-black text-primary">{nextSatStr}</p>
              <p className="text-[10px] text-muted-foreground">Get approved before Saturday to join</p>
            </div>
          </div>
        )}

        {/* Payment steps */}
        {!rejected && (
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs font-bold text-foreground mb-3">How to get access</p>
            <div className="space-y-2.5">
              {[
                { step: "1", text: "Pay ₹5,000 to your teacher — UPI or cash" },
                { step: "2", text: "Teacher verifies payment and clicks Approve" },
                { step: "3", text: "You get instant full access including Saturday tests" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">{step}</span>
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!rejected && (
            <button onClick={handleCheck} disabled={checking}
              className={cn("w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
                justChecked ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
              )}>
              {justChecked ? <><CheckCircle2 className="w-4 h-4" /> Still pending — check back soon</>
                : checking ? <><RefreshCw className="w-4 h-4 animate-spin" /> Checking…</>
                : <><RefreshCw className="w-4 h-4" /> Check Approval Status</>}
            </button>
          )}
          <button onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-muted-foreground border border-border hover:text-foreground transition-all">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
        <div className="flex items-center gap-1.5 justify-center text-muted-foreground text-xs">
          <Phone className="w-3 h-3" />
          <span>Contact your teacher to complete enrollment</span>
        </div>
      </div>
    </div>
  );
}
