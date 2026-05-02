import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { setExtraHeader, clearExtraHeaders } from "@workspace/api-client-react";

export type Role = "student" | "teacher";

export interface StudentUser {
  role: "student";
  name: string;
  phone: string;
  studentId: number;
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
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
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

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
