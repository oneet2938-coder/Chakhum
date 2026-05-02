import { useState, useEffect } from "react";
import { getRankForQuestions } from "@/lib/ranks";
import type { RankConfig } from "@/lib/ranks";
import { useAuth } from "@/context/AuthContext";

export interface GamificationStats {
  totalQuestions: number;
  diamonds: number;
  rank: RankConfig;
  next: RankConfig | null;
  progressToNext: number;
  target: number;
}

export function useGamification() {
  const { user } = useAuth();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== "student") return;
    const studentId = (user as any).studentId;
    if (!studentId) return;

    setLoading(true);
    fetch("/api/gamification/me", {
      headers: { "X-Student-ID": String(studentId) },
    })
      .then((r) => r.json())
      .then((d) => {
        const { rank, next, progressToNext } = getRankForQuestions(d.totalQuestions);
        setStats({ ...d, rank, next, progressToNext });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  return { stats, loading };
}
