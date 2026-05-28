export type LifeAreaKey =
  | "family"
  | "health"
  | "home"
  | "career"
  | "money"
  | "growth"
  | "creative";

export const LIFE_AREAS: Record<
  LifeAreaKey,
  { name: string; color: string; targetWeeklyPct: number }
> = {
  family: { name: "Family", color: "#FF6B6B", targetWeeklyPct: 20 },
  health: { name: "Health", color: "#2DD4A7", targetWeeklyPct: 20 },
  home: { name: "Home", color: "#FFB020", targetWeeklyPct: 20 },
  career: { name: "Career", color: "#3B9EFF", targetWeeklyPct: 15 },
  money: { name: "Money", color: "#34D399", targetWeeklyPct: 10 },
  growth: { name: "Growth", color: "#A78BFA", targetWeeklyPct: 10 },
  creative: { name: "Creative", color: "#F472B6", targetWeeklyPct: 5 },
};

export const LIFE_AREA_KEYS = Object.keys(LIFE_AREAS) as LifeAreaKey[];

export function areaColor(key: LifeAreaKey | string | null | undefined) {
  if (!key) return "#A1A1AA";
  return LIFE_AREAS[key as LifeAreaKey]?.color ?? "#A1A1AA";
}

export function areaName(key: LifeAreaKey | string | null | undefined) {
  if (!key) return "Unsorted";
  return LIFE_AREAS[key as LifeAreaKey]?.name ?? "Unsorted";
}

export const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
export const SPRING_SOFT = { type: "spring" as const, stiffness: 180, damping: 24 };
