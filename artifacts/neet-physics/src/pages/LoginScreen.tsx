import { useState } from "react";
import { User, BookOpen, Lock, Phone, ArrowLeft, AlertCircle, CheckCircle2, Zap, Trophy, IndianRupee, GraduationCap, FlaskConical } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const TEACHER_CODE = "9862";
const TEACHER_NAME = "Bijay Elangbm";

type Step = "role" | "course-select" | "test-only-info" | "student-form" | "teacher-code";
type CourseChoice = "foundation" | "test_only";

export default function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("role");
  const [courseChoice, setCourseChoice] = useState<CourseChoice>("foundation");
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
        body: JSON.stringify({ name: name.trim(), phone: phone.replace(/\s/g, ""), courseType: courseChoice }),
      });
      if (!res.ok) throw new Error("Login failed");
      const student = await res.json();
      login({
        role: "student",
        name: student.name,
        phone: student.phone,
        studentId: student.id,
        status: student.status ?? "approved",
        courseType: student.course_type ?? student.courseType ?? courseChoice,
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
                onClick={() => { setStep("course-select"); setError(""); }}
                className="w-full flex items-center gap-4 p-4 bg-primary/10 border border-primary/25 rounded-lg hover:bg-primary/15 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">I'm a Student</p>
                  <p className="text-xs text-muted-foreground">Foundation or Mastery Test Series</p>
                </div>
              </button>
              <button
                onClick={() => { setStep("teacher-code"); setError(""); }}
                className="w-full flex items-center gap-4 p-4 bg-muted/40 border border-border rounded-lg hover:bg-muted/60 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
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

        {/* ── Course selection ── */}
        {step === "course-select" && (
          <div className="bg-card border border-card-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <button onClick={() => { setStep("role"); setError(""); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h2 className="text-base font-semibold text-foreground mb-1">Choose Your Course</h2>
              <p className="text-xs text-muted-foreground mb-5">Select the plan that fits you</p>

              <div className="space-y-3">
                {/* Foundation */}
                <button
                  onClick={() => { setCourseChoice("foundation"); setStep("student-form"); setError(""); }}
                  className="w-full text-left p-4 bg-emerald-500/8 border border-emerald-500/25 rounded-xl hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-foreground">Foundation Course</p>
                          <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 rounded-full uppercase tracking-wider">FREE</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Access to all practice questions, topics & leaderboard. Instant access — no approval needed.</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {["708+ practice questions", "All 29 NCERT chapters", "Leaderboard & ranks", "Daily progress tracking"].map((f) => (
                      <div key={f} className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-[10px] text-muted-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                </button>

                {/* Test Only */}
                <button
                  onClick={() => { setCourseChoice("test_only"); setStep("test-only-info"); setError(""); }}
                  className="w-full text-left p-4 bg-primary/8 border border-primary/25 rounded-xl hover:bg-primary/15 hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <FlaskConical className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-foreground">Mastery Test Series</p>
                          <span className="text-[9px] font-black text-primary bg-primary/15 border border-primary/25 px-1.5 py-0.5 rounded-full uppercase tracking-wider">₹5,000/yr</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Full access + exclusive Saturday mock tests. Teacher approval required after payment.</p>
                      </div>
                    </div>
                    <Trophy className="w-4 h-4 text-primary shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {["Everything in Foundation", "Saturday Mastery Tests", "Detailed performance analysis", "Priority teacher support"].map((f) => (
                      <div key={f} className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                        <span className="text-[10px] text-muted-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Test Only product info ── */}
        {step === "test-only-info" && (
          <div className="bg-card border border-card-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-6">
              <button onClick={() => { setStep("course-select"); setError(""); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Paid · Every Saturday</p>
                  <h2 className="text-xl font-black text-foreground">Mastery Test Series</h2>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-0.5 text-primary font-black text-2xl">
                    <IndianRupee className="w-5 h-5" />5,000
                  </div>
                  <p className="text-[10px] text-muted-foreground">per year</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { icon: FlaskConical, text: "Full-length Saturday mock tests every week" },
                  { icon: BookOpen, text: "All 708+ practice questions + Foundation features" },
                  { icon: Trophy,   text: "Separate Mastery leaderboard & ranking" },
                  { icon: Zap,      text: "Detailed chapter-wise performance analysis" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 mb-4">
                <p className="text-[11px] text-amber-300 font-medium">
                  Pay ₹5,000 to your teacher first (UPI or cash), then register. Access is activated after teacher approval.
                </p>
              </div>
              <button
                onClick={() => { setStep("student-form"); setError(""); }}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Register for Mastery Test Series
              </button>
            </div>
          </div>
        )}

        {/* ── Student login form ── */}
        {step === "student-form" && (
          <div className="bg-card border border-card-border rounded-xl shadow-xl p-6">
            <button
              onClick={() => { setStep(courseChoice === "test_only" ? "test-only-info" : "course-select"); setError(""); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                courseChoice === "foundation" ? "bg-emerald-500/20" : "bg-primary/20"
              )}>
                {courseChoice === "foundation"
                  ? <GraduationCap className="w-4 h-4 text-emerald-400" />
                  : <FlaskConical className="w-4 h-4 text-primary" />
                }
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {courseChoice === "foundation" ? "Foundation Course" : "Mastery Test Series"}
                </h2>
                <p className="text-[11px] text-muted-foreground">Enter your details to continue</p>
              </div>
            </div>
            <div className={cn("text-[10px] font-semibold px-2 py-1 rounded-md w-fit mb-4",
              courseChoice === "foundation"
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                : "text-primary bg-primary/10 border border-primary/20"
            )}>
              {courseChoice === "foundation" ? "✓ Free — Instant access" : "Pending teacher approval after payment"}
            </div>

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" autoFocus />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone number"
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                {loading ? "Logging in…" : "Continue"}
              </button>
            </form>
          </div>
        )}

        {/* ── Teacher code ── */}
        {step === "teacher-code" && (
          <div className="bg-card border border-card-border rounded-xl shadow-xl p-6">
            <button onClick={() => { setStep("role"); setError(""); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
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
                <input type="password" inputMode="numeric" maxLength={4} value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••"
                  className="w-full px-3 py-3 bg-muted/40 border border-border rounded-lg text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" autoFocus />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                </div>
              )}
              <button type="submit" disabled={code.length !== 4}
                className="w-full py-2.5 bg-muted border border-border text-sm font-semibold text-foreground rounded-lg hover:bg-muted/80 transition-all disabled:opacity-40">
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
