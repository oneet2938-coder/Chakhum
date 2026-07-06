import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpen, LayoutDashboard, FlaskConical, ClipboardList, LogOut,
  Trophy, Hourglass, XCircle, Sparkles, CalendarDays, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useGamification } from "@/hooks/useGamification";
import RankBadge from "@/components/RankBadge";

const navItems = [
  { href: "/",               label: "Dashboard",     icon: LayoutDashboard },
  { href: "/topics",         label: "Topics",         icon: BookOpen },
  { href: "/daily-practice", label: "Daily Practice", icon: CalendarDays },
  { href: "/practice",       label: "Practice",       icon: FlaskConical },
  { href: "/tests",          label: "Mock Tests",     icon: ClipboardList },
  { href: "/leaderboard",    label: "Leaderboard",    icon: Trophy, accent: "yellow" },
  { href: "/ai-tutor",       label: "AI Tutor",       icon: Sparkles, accent: "violet" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { stats } = useGamification();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on route change (mobile nav)
  useEffect(() => { setOpen(false); }, [location]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="flex min-h-screen bg-background flex-col">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 flex items-center h-12 px-3 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mr-2"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="EMC" className="w-6 h-6 rounded object-contain" />
          <span className="text-sm font-bold text-foreground tracking-wide">TSM</span>
          <span className="text-[10px] text-muted-foreground hidden sm:block">Physics NEET Prep</span>
        </Link>

        {/* Diamonds + rank strip in header */}
        {user?.role === "student" && stats && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-sm">💎</span>
              <span className="text-xs font-bold text-cyan-300 tabular-nums">{stats.diamonds}</span>
            </div>
            <div className="hidden sm:block">
              <RankBadge rank={stats.rank} size="xs" />
            </div>
          </div>
        )}

        {/* Teacher badge */}
        {user?.role === "teacher" && (
          <span className="ml-auto text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold">Teacher</span>
        )}
      </header>

      {/* ── Approval banners ── */}
      {user?.role === "student" && user.courseType === "test_only" && user.status === "pending" && (
        <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 shrink-0">
          <Hourglass className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <p className="text-xs text-amber-300 flex-1">
            <span className="font-semibold">Test Series approval pending</span> — your teacher will unlock access soon.
          </p>
          <Link href="/tests" className="text-[10px] font-bold text-amber-400 hover:text-amber-300 shrink-0 underline underline-offset-2">
            View →
          </Link>
        </div>
      )}
      {user?.role === "student" && user.courseType === "test_only" && user.status === "rejected" && (
        <div className="flex items-center gap-2.5 px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 shrink-0">
          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <p className="text-xs text-rose-300">
            <span className="font-semibold">Test Series access not approved</span> — contact your teacher.
          </p>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* ── Sidebar backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-out drawer ── */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-sidebar-border">
          <img src="/logo.png" alt="EMC Logo" className="w-7 h-7 rounded-md object-contain" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-foreground tracking-wide">TSM</div>
            <div className="text-[10px] text-muted-foreground leading-none">Physics NEET Prep</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon, accent }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            const isYellow = accent === "yellow";
            const isViolet = accent === "violet";
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                  active
                    ? isViolet ? "bg-violet-500/15 text-violet-400"
                      : isYellow ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-primary/10 text-primary"
                    : isViolet ? "text-violet-400/80 hover:bg-violet-500/10 hover:text-violet-300"
                    : isYellow ? "text-yellow-500/80 hover:bg-yellow-500/10 hover:text-yellow-400"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4 shrink-0",
                  !active && isYellow && "text-yellow-500/80",
                  !active && isViolet && "text-violet-400/80"
                )} />
                <span className="flex-1">{label}</span>
                {isYellow && !active && (
                  <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1 rounded font-bold">💎</span>
                )}
                {isViolet && !active && (
                  <span className="text-[9px] bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded font-bold">FREE</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Rank + diamonds */}
        {user?.role === "student" && stats && (
          <div className="mx-3 mb-2 rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-2">
            <RankBadge rank={stats.rank} size="xs" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Diamonds</span>
              <div className="flex items-center gap-1">
                <span className="text-sm">💎</span>
                <span className="text-xs font-bold text-cyan-300 tabular-nums">{stats.diamonds}</span>
              </div>
            </div>
            {stats.next && (
              <div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", stats.rank.gradientFrom.replace("from-", "bg-"))}
                    style={{ width: `${stats.progressToNext}%` }}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{stats.rank.title} → {stats.next.title}</p>
              </div>
            )}
          </div>
        )}

        {/* User + logout */}
        {user && (
          <div className="px-4 py-3 border-t border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{user.name[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                {user.role === "student" && (
                  <p className="text-[10px] text-muted-foreground truncate">{(user as any).phone}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all"
            >
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
