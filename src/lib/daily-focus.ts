/**
 * Daily focus locking.
 *
 * Picks "today's three" *once* per user per day and persists the chosen item
 * IDs in `daily_focus`. UI then renders only the still-incomplete picks, so
 * completing one doesn't silently backfill another priority — the slot
 * just clears.
 *
 * Today's date is computed in the user's profile timezone (falls back to UTC).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Item } from "@/types/database";
import { computeAreaDistribution, todaysThree } from "@/lib/priority";

type Client = SupabaseClient<Database>;

export function todayInTz(tz: string | null | undefined): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/**
 * Returns the *locked* set of focus item IDs for today.
 * Creates the row on first call of the day using todaysThree().
 */
export async function getOrLockTodaysFocus(opts: {
  supabase: Client;
  userId: string;
  householdId: string;
  items: Item[];
  tz?: string | null;
}): Promise<string[]> {
  const day = todayInTz(opts.tz);
  const { data: existing } = await opts.supabase
    .from("daily_focus")
    .select("item_ids")
    .eq("user_id", opts.userId)
    .eq("day", day)
    .maybeSingle();

  if (existing) {
    return (existing as any).item_ids as string[];
  }

  const dist = computeAreaDistribution(opts.items);
  const picks = todaysThree(opts.items, dist).map((i) => i.id);

  if (picks.length === 0) return [];

  await opts.supabase
    .from("daily_focus")
    .upsert(
      { user_id: opts.userId, household_id: opts.householdId, day, item_ids: picks },
      { onConflict: "user_id,day" },
    );

  return picks;
}
