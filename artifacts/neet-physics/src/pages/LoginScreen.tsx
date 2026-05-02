import { useState } from "react";
import { User, BookOpen, Lock, Phone, ArrowLeft, AlertCircle, CheckCircle2, Zap, Trophy, IndianRupee } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const TEACHER_CODE = "9862";
const TEACHER_NAME = "Bijay Elangbm";

type Step = "role" | "student-info" | "student-form" | "teacher-code";

export default function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("role");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStudentLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter your name.");
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) return setError("Enter a valid 10-digit phone number.");

    setLoading(true);
    try {
      const res = await fetch("/api/students/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.replace(/\s/g, "") }),
      });
      if (!res.ok) throw new Error("Login failed");
      const student = await res.json();
      login({
        role: "student",
        name: student.name,
        phone: student.phone,
        studentId: student.id,
        status: student.status ?? "pending",
      });
    } catch {
      setError("Could not log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleTeacherLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (code !== TEACHER_CODE) {
      setError("Incorrect code. Please try again.");
      setCode("");
      return;
    }
    login({ role: "teacher", name: TEACHER_NAME });
  }

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

      <div className="w-full max-w-sm space-y-3">

        {/* ── Role selection ── */}
        {step === "role" && (
          <div className="bg-card border border-card-border rounded-xl shadow-xl p-6">
            <h2 className="text-base font-semibold text-foreground text-center mb-1">Welcome</h2>
            <p className="text-xs text-muted-foreground text-center mb-6">Choose how you want to continue</p>
            <div className="space-y-3">
              <button
                onClick={() => { setStep("student-info"); setError(""); }}
                className="w-full flex items-center gap-4 p-4 bg-primary/10 border border-primary/25 rounded-lg hover:bg-primary/15 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">I'm a Student</p>
                  <p className="text-xs text-muted-foreground">Join the Mastery Test Series</p>
                </div>
              </button>

              <button
                onClick={() => { setStep("teacher-code"); setError(""); }}
                className="w-full flex items-center gap-4 p-4 bg-muted/40 border border-border rounded-lg hover:bg-muted/60 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">I'm a Teacher</p>
                  <p className="text-xs text-muted-foreground">Admin access — 4-digit code required</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Student info / product page ── */}
        {step === "student-info" && (
          <div className="space-y-3">
            <div className="bg-card border border-card-border rounded-xl shadow-xl overflow-hidden">
              <button
                onClick={() => { setStep("role"); setError(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-5 pt-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              {/* Product hero */}
              <div className="px-5 pt-3 pb-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Paid Access</p>
                    <h2 className="text-xl font-black text-foreground">Mastery Test Series</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">NEET 2027 Physics Preparation</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-0.5 text-primary font-black text-2xl">
                      <IndianRupee className="w-5 h-5" />5,000
                    </div>
                    <p className="text-[10px] text-muted-foreground">per year</p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  {[
                    { icon: BookOpen, text: "708+ NEET PYQ-style questions across all 29 NCERT chapters" },
                    { icon: Zap,      text: "Unlimited practice with detailed explanations" },
                    { icon: Trophy,   text: "Mock tests, ranks & daily leaderboard" },
                    { icon: CheckCircle2, text: "Teacher-monitored daily progress tracking" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-start gap-2">
                      <Icon className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 mb-5">
                  <p className="text-[11px] text-amber-300 font-medium">
                    Pay ₹5,000 to your teacher first (UPI or cash), then register below. Your account will be activated after teacher approval.
                  </p>
                </div>

                <button
                  onClick={() => { setStep("student-form"); setError(""); }}
                  className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Register / Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Student login form ── */}
        {step === "student-form" && (
          <div className="bg-card border border-card-border rounded-xl shadow-xl p-6">
            <button
              onClick={() => { setStep("student-info"); setError(""); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Student Login</h2>
                <p className="text-[11px] text-muted-foreground">Enter your details to continue</p>
              </div>
            </div>

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit phone number"
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? "Logging in…" : "Continue"}
              </button>
            </form>
          </div>
        )}

        {/* ── Teacher code ── */}
        {step === "teacher-code" && (
          <div className="bg-card border border-card-border rounded-xl shadow-xl p-6">
            <button
              onClick={() => { setStep("role"); setError(""); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Teacher Access</h2>
                <p className="text-[11px] text-muted-foreground">Enter your 4-digit admin code</p>
              </div>
            </div>

            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Access Code</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3 py-3 bg-muted/40 border border-border rounded-lg text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={code.length !== 4}
                className="w-full py-2.5 bg-muted border border-border text-sm font-semibold text-foreground rounded-lg hover:bg-muted/80 transition-all disabled:opacity-40"
              >
                Enter Admin Panel
              </button>
            </form>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-6">EMC² Physics · NEET 2027</p>
    </div>
  );
}
