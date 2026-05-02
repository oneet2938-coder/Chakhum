import { Link, useLocation } from "wouter";
import { BookOpen, LayoutDashboard, FlaskConical, ClipboardList, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/topics", label: "Topics", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: FlaskConical },
  { href: "/tests", label: "Mock Tests", icon: ClipboardList },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-sidebar-border flex items-center gap-2.5">
          <img src="/logo.png" alt="EMC Logo" className="w-7 h-7 rounded-md object-contain" />
          <div>
            <div className="text-sm font-bold text-foreground tracking-wide">EMC</div>
            <div className="text-[10px] text-muted-foreground leading-none">Physics NEET Prep</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        {user && (
          <div className="px-4 py-3 border-t border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary">{user.name[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                {user.role === "student" && (
                  <p className="text-[10px] text-muted-foreground truncate">{(user as any).phone}</p>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-all"
            >
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
