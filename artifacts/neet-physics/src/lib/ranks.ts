export const RANKS = [
  { level: 1,  title: "Intern",            minQ: 0,     color: "text-slate-400",   bg: "bg-slate-500/15",   border: "border-slate-500/25",  icon: "🩺" },
  { level: 2,  title: "Medical Student",   minQ: 50,    color: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/25",   icon: "📚" },
  { level: 3,  title: "House Surgeon",     minQ: 150,   color: "text-cyan-400",    bg: "bg-cyan-500/15",    border: "border-cyan-500/25",   icon: "✂️" },
  { level: 4,  title: "Junior Resident",   minQ: 350,   color: "text-teal-400",    bg: "bg-teal-500/15",    border: "border-teal-500/25",   icon: "🏥" },
  { level: 5,  title: "Senior Resident",   minQ: 700,   color: "text-green-400",   bg: "bg-green-500/15",   border: "border-green-500/25",  icon: "💊" },
  { level: 6,  title: "Registrar",         minQ: 1200,  color: "text-purple-400",  bg: "bg-purple-500/15",  border: "border-purple-500/25", icon: "🔬" },
  { level: 7,  title: "Specialist",        minQ: 2000,  color: "text-indigo-400",  bg: "bg-indigo-500/15",  border: "border-indigo-500/25", icon: "🧬" },
  { level: 8,  title: "Consultant",        minQ: 3500,  color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/25",  icon: "👨‍⚕️" },
  { level: 9,  title: "Senior Consultant", minQ: 5500,  color: "text-orange-400",  bg: "bg-orange-500/15",  border: "border-orange-500/25", icon: "🏆" },
  { level: 10, title: "Chief Physician",   minQ: 10000, color: "text-yellow-300",  bg: "bg-yellow-500/20",  border: "border-yellow-500/40", icon: "⭐" },
] as const;

export function getRankForQuestions(totalQ: number) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (totalQ >= r.minQ) rank = r;
  }
  const idx = RANKS.indexOf(rank as typeof RANKS[number]);
  const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  const progressToNext = next
    ? Math.min(100, Math.round(((totalQ - rank.minQ) / (next.minQ - rank.minQ)) * 100))
    : 100;
  return { rank, next, progressToNext };
}
