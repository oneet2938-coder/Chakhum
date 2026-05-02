export const RANKS = [
  {
    level: 1,  title: "Intern",            minQ: 0,
    iconName: "Stethoscope",
    color: "text-slate-300",   bg: "bg-slate-500/20",   border: "border-slate-500/30",
    gradientFrom: "from-slate-600", gradientTo: "to-slate-800",
    glowColor: "shadow-slate-500/20",
  },
  {
    level: 2,  title: "Medical Student",   minQ: 50,
    iconName: "BookOpen",
    color: "text-blue-300",    bg: "bg-blue-500/20",    border: "border-blue-500/30",
    gradientFrom: "from-blue-600", gradientTo: "to-blue-900",
    glowColor: "shadow-blue-500/25",
  },
  {
    level: 3,  title: "House Surgeon",     minQ: 150,
    iconName: "Scissors",
    color: "text-cyan-300",    bg: "bg-cyan-500/20",    border: "border-cyan-500/30",
    gradientFrom: "from-cyan-600", gradientTo: "to-cyan-900",
    glowColor: "shadow-cyan-500/25",
  },
  {
    level: 4,  title: "Junior Resident",   minQ: 350,
    iconName: "Building2",
    color: "text-teal-300",    bg: "bg-teal-500/20",    border: "border-teal-500/30",
    gradientFrom: "from-teal-600", gradientTo: "to-teal-900",
    glowColor: "shadow-teal-500/25",
  },
  {
    level: 5,  title: "Senior Resident",   minQ: 700,
    iconName: "Pill",
    color: "text-green-300",   bg: "bg-green-500/20",   border: "border-green-500/30",
    gradientFrom: "from-green-600", gradientTo: "to-green-900",
    glowColor: "shadow-green-500/25",
  },
  {
    level: 6,  title: "Registrar",         minQ: 1200,
    iconName: "Microscope",
    color: "text-violet-300",  bg: "bg-violet-500/20",  border: "border-violet-500/30",
    gradientFrom: "from-violet-600", gradientTo: "to-violet-900",
    glowColor: "shadow-violet-500/30",
  },
  {
    level: 7,  title: "Specialist",        minQ: 2000,
    iconName: "Dna",
    color: "text-indigo-300",  bg: "bg-indigo-500/20",  border: "border-indigo-500/30",
    gradientFrom: "from-indigo-600", gradientTo: "to-indigo-900",
    glowColor: "shadow-indigo-500/30",
  },
  {
    level: 8,  title: "Consultant",        minQ: 3500,
    iconName: "HeartPulse",
    color: "text-amber-300",   bg: "bg-amber-500/20",   border: "border-amber-500/30",
    gradientFrom: "from-amber-600", gradientTo: "to-amber-900",
    glowColor: "shadow-amber-500/30",
  },
  {
    level: 9,  title: "Senior Consultant", minQ: 5500,
    iconName: "ShieldCheck",
    color: "text-orange-300",  bg: "bg-orange-500/20",  border: "border-orange-500/30",
    gradientFrom: "from-orange-600", gradientTo: "to-orange-900",
    glowColor: "shadow-orange-500/35",
  },
  {
    level: 10, title: "Chief Physician",   minQ: 10000,
    iconName: "Crown",
    color: "text-yellow-200",  bg: "bg-yellow-500/25",  border: "border-yellow-400/40",
    gradientFrom: "from-yellow-500", gradientTo: "to-amber-700",
    glowColor: "shadow-yellow-500/40",
  },
] as const;

export type RankConfig = typeof RANKS[number];

export function getRankForQuestions(totalQ: number) {
  let rank: RankConfig = RANKS[0];
  for (const r of RANKS) {
    if (totalQ >= r.minQ) rank = r;
  }
  const idx = RANKS.indexOf(rank);
  const next: RankConfig | null = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  const progressToNext = next
    ? Math.min(100, Math.round(((totalQ - rank.minQ) / (next.minQ - rank.minQ)) * 100))
    : 100;
  return { rank, next, progressToNext };
}
