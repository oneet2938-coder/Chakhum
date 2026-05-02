import { useState } from "react";
import { Clock, CheckCircle2, XCircle, RefreshCw, Phone, BookOpen, Zap, Trophy, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function PendingApprovalScreen({ rejected = false }: { rejected?: boolean }) {
  const { user, logout, refreshStatus } = useAuth();
  const [checking, setChecking] = useState(false);
  const [justChecked, setJustChecked] = useState(false);

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
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <img src="/logo.png" alt="EMC Logo" className="w-12 h-12 rounded-xl object-contain" />
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-wide">EMC²</h1>
          <p className="text-xs text-muted-foreground">Physics NEET Prep</p>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">

        {/* Status card */}
        <div className={cn(
          "rounded-xl border p-6 text-center",
          rejected
            ? "bg-rose-500/10 border-rose-500/30"
            : "bg-amber-500/8 border-amber-500/25"
        )}>
          <div className="flex justify-center mb-4">
            {rejected
              ? <XCircle className="w-14 h-14 text-rose-400" />
              : <Clock className="w-14 h-14 text-amber-400 animate-pulse" />
            }
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            {rejected ? "Enrollment Rejected" : "Waiting for Approval"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {rejected
              ? "Your enrollment was not approved. Please contact your teacher."
              : <>Hi <span className="text-foreground font-semibold">{studentName}</span>! Your registration is pending. Once you pay and the teacher approves, you'll get full access.</>
            }
          </p>
        </div>

        {/* Product card */}
        {!rejected && (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Test Series</p>
                <h3 className="text-base font-black text-foreground">Mastery Test Series</h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary">₹5,000</p>
                <p className="text-[10px] text-muted-foreground">per year</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">What's included</p>
              {[
                { icon: BookOpen, label: "708+ NEET PYQ-style questions across all 29 chapters" },
                { icon: Zap,      label: "Unlimited practice sessions with detailed explanations" },
                { icon: Trophy,   label: "Mock tests, leaderboard & medical rank gamification" },
                { icon: CheckCircle2, label: "Daily progress tracking & teacher monitoring" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment instructions */}
        {!rejected && (
          <div className="bg-card border border-card-border rounded-xl p-5">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">How to pay & get access</p>
            <div className="space-y-3">
              {[
                { step: "1", text: "Pay ₹5,000 to your teacher — online (UPI/bank transfer) or cash in person" },
                { step: "2", text: "Your teacher verifies the payment and approves your account" },
                { step: "3", text: "You instantly get full access to the Mastery Test Series" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {step}
                  </span>
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!rejected && (
            <button
              onClick={handleCheck}
              disabled={checking}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
                justChecked
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
              )}
            >
              {justChecked
                ? <><CheckCircle2 className="w-4 h-4" /> Status checked — still pending</>
                : checking
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Checking status…</>
                  : <><RefreshCw className="w-4 h-4" /> Check Approval Status</>
              }
            </button>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-muted-foreground border border-border hover:text-foreground hover:border-border/80 transition-all"
          >
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
