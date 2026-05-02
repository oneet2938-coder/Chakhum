import { useListTopics, useGetTopicProgress } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_EMOJI: Record<string, string> = {
  ruler: "📏",
  "arrow-right": "➡️",
  navigation: "🧭",
  zap: "⚡",
  "battery-charging": "🔋",
  "git-merge": "🔀",
  "rotate-cw": "🔄",
  globe: "🌍",
  box: "📦",
  droplet: "💧",
  thermometer: "🌡️",
  flame: "🔥",
  wind: "🌬️",
  activity: "📊",
  radio: "📡",
  battery: "🔋",
  cpu: "🖥️",
  magnet: "🧲",
  compass: "🧭",
  "refresh-cw": "🔁",
  "trending-up": "📈",
  wifi: "📶",
  eye: "👁️",
  layers: "🔷",
  sun: "☀️",
  atom: "⚛️",
  target: "🎯",
  code: "💻",
};

const CLASS11_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const CLASS12_IDS = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

function TopicCard({
  topic,
  accuracy,
  attempted,
}: {
  topic: { id: number; name: string; description: string; icon: string; questionCount: number };
  accuracy: number | null;
  attempted: number;
}) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      data-testid={`topic-card-${topic.id}`}
      className="bg-card border border-card-border rounded-lg p-3.5 hover:border-primary/40 hover:bg-muted/20 transition-all group block"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl leading-none">{ICON_EMOJI[topic.icon] ?? "📘"}</span>
        {accuracy !== null ? (
          <span
            className={cn(
              "text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded",
              accuracy >= 70
                ? "bg-emerald-500/15 text-emerald-400"
                : accuracy >= 50
                ? "bg-amber-500/15 text-amber-400"
                : "bg-rose-500/15 text-rose-400"
            )}
          >
            {accuracy}%
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">New</span>
        )}
      </div>
      <h3 className="text-xs font-semibold text-foreground mb-0.5 leading-snug">{topic.name}</h3>
      <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
        {topic.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{topic.questionCount} Qs</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      {attempted > 0 && accuracy !== null && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              accuracy >= 70
                ? "bg-emerald-500"
                : accuracy >= 50
                ? "bg-amber-500"
                : "bg-rose-500"
            )}
            style={{ width: `${accuracy}%` }}
          />
        </div>
      )}
    </Link>
  );
}

function SectionHeader({
  label,
  badge,
  count,
}: {
  label: string;
  badge: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest",
        badge === "11"
          ? "bg-primary/15 text-primary border border-primary/20"
          : "bg-accent/15 text-accent border border-accent/20"
      )}>
        Class {badge}
      </span>
      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      <span className="text-xs text-muted-foreground ml-auto">{count} chapters</span>
    </div>
  );
}

export default function Topics() {
  const { data: topics, isLoading } = useListTopics();
  const { data: progress } = useGetTopicProgress();

  const progressMap = Object.fromEntries(
    (progress ?? []).map((p) => [p.topicId, p])
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-7 w-40 bg-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-2.5">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const allTopics = topics ?? [];
  const class11 = allTopics.filter((t) => CLASS11_IDS.includes(t.id));
  const class12 = allTopics.filter((t) => CLASS12_IDS.includes(t.id));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Physics Topics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {allTopics.length} chapters · {allTopics.reduce((s, t) => s + t.questionCount, 0)} questions
        </p>
      </div>

      {/* Class 11 */}
      <div>
        <SectionHeader label="Mechanics, Thermal & Waves" badge="11" count={class11.length} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {class11.map((topic) => {
            const p = progressMap[topic.id];
            return (
              <TopicCard
                key={topic.id}
                topic={topic}
                accuracy={p?.questionsAttempted ? p.accuracy : null}
                attempted={p?.questionsAttempted ?? 0}
              />
            );
          })}
        </div>
      </div>

      {/* Class 12 */}
      <div>
        <SectionHeader label="Electrostatics, Optics & Modern Physics" badge="12" count={class12.length} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {class12.map((topic) => {
            const p = progressMap[topic.id];
            return (
              <TopicCard
                key={topic.id}
                topic={topic}
                accuracy={p?.questionsAttempted ? p.accuracy : null}
                attempted={p?.questionsAttempted ?? 0}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
