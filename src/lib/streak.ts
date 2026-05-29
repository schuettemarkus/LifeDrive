import { supabaseServer } from "@/lib/supabase/server";

export type StreakInfo = {
  streak: number;
  todayActive: boolean;
  lastActive: string | null;
  totalActiveDays: number;
};

/**
 * Returns the current user's streak via the security-definer Postgres function.
 * Safe to call from any server context with an authenticated session.
 */
export async function getStreak(userId: string): Promise<StreakInfo> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .rpc("get_streak", { p_user_id: userId })
    .single<{
      streak: number;
      today_active: boolean;
      last_active: string | null;
      total_active_days: number;
    }>();
  if (error || !data) {
    return { streak: 0, todayActive: false, lastActive: null, totalActiveDays: 0 };
  }
  return {
    streak: data.streak ?? 0,
    todayActive: Boolean(data.today_active),
    lastActive: data.last_active ?? null,
    totalActiveDays: data.total_active_days ?? 0,
  };
}
