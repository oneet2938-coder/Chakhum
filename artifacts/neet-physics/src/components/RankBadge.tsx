import {
  Stethoscope, BookOpen, Scissors, Building2, Pill,
  Microscope, Dna, HeartPulse, ShieldCheck, Crown,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankConfig } from "@/lib/ranks";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Stethoscope, BookOpen, Scissors, Building2, Pill,
  Microscope, Dna, HeartPulse, ShieldCheck, Crown,
};

interface RankBadgeProps {
  rank: RankConfig;
  size?: "xs" | "sm" | "md" | "lg";
  showTitle?: boolean;
  showLevel?: boolean;
  className?: string;
}

export default function RankBadge({
  rank,
  size = "md",
  showTitle = true,
  showLevel = false,
  className,
}: RankBadgeProps) {
  const Icon = ICON_MAP[rank.iconName];

  const iconSizes = { xs: "w-3 h-3", sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-5 h-5" };
  const circleSizes = { xs: "w-5 h-5", sm: "w-6 h-6", md: "w-7 h-7", lg: "w-9 h-9" };
  const textSizes  = { xs: "text-[9px]", sm: "text-[10px]", md: "text-xs", lg: "text-sm" };
  const gapSizes   = { xs: "gap-1", sm: "gap-1", md: "gap-1.5", lg: "gap-2" };
  const padSizes   = { xs: "px-1.5 py-0.5", sm: "px-2 py-0.5", md: "px-2.5 py-1", lg: "px-3 py-1.5" };

  const isElite = rank.level >= 9;
  const isMax   = rank.level === 10;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold transition-all",
        gapSizes[size],
        padSizes[size],
        rank.bg,
        rank.border,
        isElite && `shadow-sm ${rank.glowColor}`,
        isMax && "ring-1 ring-yellow-400/30",
        className
      )}
    >
      {/* Icon circle */}
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-gradient-to-br shrink-0",
          circleSizes[size],
          rank.gradientFrom,
          rank.gradientTo,
          isElite && `shadow-sm ${rank.glowColor}`
        )}
      >
        {Icon && <Icon className={cn(iconSizes[size], "text-white drop-shadow-sm")} strokeWidth={2.5} />}
      </span>

      {/* Title */}
      {showTitle && (
        <span className={cn(textSizes[size], rank.color, "leading-tight whitespace-nowrap")}>
          {rank.title}
        </span>
      )}

      {/* Level number */}
      {showLevel && (
        <span className={cn(textSizes[size], "text-muted-foreground tabular-nums")}>
          Lv.{rank.level}
        </span>
      )}
    </span>
  );
}

/* ── Standalone icon circle (used in sidebar, headers) ─────────────── */
export function RankIcon({ rank, size = "md", className }: Pick<RankBadgeProps, "rank" | "size" | "className">) {
  const Icon = ICON_MAP[rank.iconName];
  const circleSizes = { xs: "w-5 h-5", sm: "w-6 h-6", md: "w-8 h-8", lg: "w-10 h-10" };
  const iconSizes   = { xs: "w-2.5 h-2.5", sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
  const isElite = rank.level >= 8;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br shrink-0",
        circleSizes[size],
        rank.gradientFrom,
        rank.gradientTo,
        isElite && `shadow-md ${rank.glowColor}`,
        className
      )}
    >
      {Icon && <Icon className={cn(iconSizes[size], "text-white drop-shadow")} strokeWidth={2.5} />}
    </span>
  );
}
