/**
 * Priority engine.
 *
 * priority_score = w_impact * impact_norm
 *                + w_urgency * urgency_norm   (combines `urgency` 1-5 + due-date proximity)
 *                + w_momentum * (1 - effort_norm)  (shorter tasks tie-break upward)
 *                + w_balance * area_deficit       (neglected areas bubble up)
 *
 * All terms normalised to 0..1; the final score is also 0..1 (then exposed as 0..100).
 *
 * The numeric ranking is computed deterministically in code. The LLM is only used
 * for *explaining* the top items in human language (see /api/prioritize).
 */
import { LIFE_AREAS, type LifeAreaKey } from "@/lib/design";
import type { Item } from "@/types/database";

export type Distribution = Partial<Record<LifeAreaKey, number>>;

export const WEIGHTS = {
  impact: 0.35,
  urgency: 0.35,
  momentum: 0.10,
  balance: 0.20,
} as const;

export type RankedItem = Item & {
  computed: {
    impact: number;
    urgency: number;
    effort: number;
    balance: number;
    score: number;
    reasons: string[];
  };
};

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const due = new Date(dateStr + "T00:00:00").getTime();
  const now = Date.now();
  return Math.floor((due - now) / (24 * 3600 * 1000));
}

function urgencyComponent(item: Item) {
  // 1) base urgency 1-5 -> 0..1
  const base = (item.urgency - 1) / 4;
  // 2) bump if due_date is close
  const d = daysUntil(item.due_date);
  let dueBoost = 0;
  if (d !== null) {
    if (d <= 0) dueBoost = 1;
    else if (d <= 1) dueBoost = 0.9;
    else if (d <= 3) dueBoost = 0.7;
    else if (d <= 7) dueBoost = 0.5;
    else if (d <= 30) dueBoost = 0.2;
  }
  return Math.max(base, dueBoost);
}

function effortComponent(item: Item) {
  const eff = item.effort_minutes ?? 60;
  // 0..1 where 1 = very short. Cap at 240 min for the curve.
  const clamped = Math.min(240, Math.max(5, eff));
  return 1 - (clamped - 5) / (240 - 5);
}

function impactComponent(item: Item) {
  return (item.impact - 1) / 4;
}

/**
 * Build the actual % distribution of recent completions per area.
 * Inputs items, returns area -> percentage 0..100.
 */
export function computeAreaDistribution(items: Item[], lookbackDays = 14): Distribution {
  const cutoff = Date.now() - lookbackDays * 24 * 3600 * 1000;
  const done = items.filter(
    (i) => i.completed_at && new Date(i.completed_at).getTime() >= cutoff && i.life_area,
  );
  const totals: Record<string, number> = {};
  for (const i of done) {
    const k = i.life_area!;
    totals[k] = (totals[k] ?? 0) + (i.effort_minutes ?? 30);
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  const dist: Distribution = {};
  if (sum === 0) return dist;
  for (const k of Object.keys(totals)) {
    (dist as any)[k] = Math.round((totals[k] / sum) * 100);
  }
  return dist;
}

/** Per-area multiplier: < target → boost, >> target → dampen. Capped 0.5..1.4. */
export function balanceMultiplier(area: LifeAreaKey | null | undefined, dist: Distribution) {
  if (!area || !LIFE_AREAS[area]) return 1;
  const target = LIFE_AREAS[area].targetWeeklyPct;
  const actual = (dist[area] ?? 0) || 0;
  if (target === 0) return 1;
  const ratio = actual / target; // 0..∞
  // Convert: ratio = 1 → 1.0, ratio = 0 → 1.4, ratio >= 2 → 0.5
  const m = 1.4 - Math.min(1, ratio) * 0.4 - Math.max(0, Math.min(1, ratio - 1)) * 0.5;
  return Math.max(0.5, Math.min(1.4, m));
}

/** Score a single item given a distribution and dueDate-anchored context. */
export function scoreItem(item: Item, dist: Distribution): RankedItem["computed"] {
  const impact = impactComponent(item);
  const urgency = urgencyComponent(item);
  const effort = effortComponent(item);
  const mult = balanceMultiplier((item.life_area as LifeAreaKey) ?? null, dist);

  const base =
    WEIGHTS.impact * impact +
    WEIGHTS.urgency * urgency +
    WEIGHTS.momentum * effort;
  const score = Math.max(0, Math.min(1, base * mult + WEIGHTS.balance * (mult - 1)));

  const reasons: string[] = [];
  const d = daysUntil(item.due_date);
  if (d !== null && d <= 3) reasons.push(d <= 0 ? "due now" : `due in ${d}d`);
  if (item.impact >= 4) reasons.push("high impact");
  if ((item.effort_minutes ?? 60) <= 30) reasons.push("quick win");
  if (item.is_next_action) reasons.push("next action");
  if (mult > 1.1 && item.life_area) reasons.push(`${LIFE_AREAS[item.life_area as LifeAreaKey].name} is behind`);
  if (mult < 0.9 && item.life_area) reasons.push(`${LIFE_AREAS[item.life_area as LifeAreaKey].name} already leading`);

  return { impact, urgency, effort, balance: mult, score, reasons };
}

/** Rank a set of schedulable items (excludes done/someday). */
export function rankItems(items: Item[], dist: Distribution): RankedItem[] {
  return items
    .filter((i) => i.status !== "done" && i.status !== "someday")
    .map((i) => ({ ...i, computed: scoreItem(i, dist) }))
    .sort((a, b) => b.computed.score - a.computed.score);
}

/** "Today's 3" — top three schedulable, with diversity bias across areas. */
export function todaysThree(items: Item[], dist: Distribution): RankedItem[] {
  const ranked = rankItems(items, dist);
  const picked: RankedItem[] = [];
  const usedAreas = new Set<string>();
  for (const it of ranked) {
    if (picked.length >= 3) break;
    const area = it.life_area ?? "_none";
    // Don't double-pick the same area until we've exhausted unique-area picks.
    if (usedAreas.has(area) && picked.length < 3) continue;
    picked.push(it);
    usedAreas.add(area);
  }
  // If we still need more (e.g. user only has one area), pull the next highest.
  for (const it of ranked) {
    if (picked.length >= 3) break;
    if (picked.find((p) => p.id === it.id)) continue;
    picked.push(it);
  }
  return picked;
}
