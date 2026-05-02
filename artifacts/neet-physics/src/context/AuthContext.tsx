import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { setExtraHeader, clearExtraHeaders } from "@workspace/api-client-react";

export type Role = "student" | "teacher";
export type StudentStatus = "pending" | "approved" | "rejected";
export type CourseType = "foundation" | "test_only";

export interface StudentUser {
  role: "student";
  name: string;
  phone: string;
  studentId: number;
  status: StudentStatus;
  courseType: CourseType;
}

export interface TeacherUser {
  role: "teacher";
  name: string;
}

export type AuthUser = StudentUser | TeacherUser;

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  refreshStatus: async () => {},
});

const STORAGE_KEY = "emc_session";

function applyHeaders(user: AuthUser | null) {
  clearExtraHeaders();
  if (user?.role === "student") {
    setExtraHeader("X-Student-ID", String(user.studentId));
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthUser;
      applyHeaders(parsed);
      return parsed;
    } catch {
      return null;
    }
  });

  function login(u: AuthUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    applyHeaders(u);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    clearExtraHeaders();
    setUser(null);
  }

  const refreshStatus = useCallback(async () => {
    if (!user || user.role !== "student") return;
    try {
      const res = await fetch("/api/students/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, phone: user.phone }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const updated: StudentUser = {
        ...user,
        status: data.status,
        courseType: data.courseType ?? data.course_type ?? user.courseType,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setUser(updated);
    } catch {
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
