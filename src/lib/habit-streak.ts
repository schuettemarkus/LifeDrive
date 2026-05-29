/**
 * Per-habit streak calculation.
 *
 * A streak = consecutive *scheduled* days (per the habit's days_of_week)
 * leading up to today that the user completed the habit. The current day
 * counts as a "grace" day — if today is a scheduled day and not yet
 * completed, the streak is whatever ran up to yesterday and is not yet
 * broken. It only breaks once a scheduled day passes without a completion.
 *
 * Inputs:
 *   - habit.days_of_week: number[] (0=Sun..6=Sat)
 *   - completions: { habit_id, completed_on (YYYY-MM-DD) }[]
 *   - today: YYYY-MM-DD in the user's timezone
 *
 * Output: integer streak count, 0 if the habit is brand new or hasn't been
 * done on its most recent scheduled day.
 */
import type { Habit, HabitCompletion } from "@/types/database";

function isoToParts(iso: string) {
  // Use UTC arithmetic against a YYYY-MM-DD string so we never accidentally
  // shift days by a timezone offset.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function partsToIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dowUtc(d: Date) {
  return d.getUTCDay();
}

function previousDay(d: Date) {
  const n = new Date(d);
  n.setUTCDate(d.getUTCDate() - 1);
  return n;
}

export function computeHabitStreak(
  habit: Pick<Habit, "id" | "days_of_week">,
  completions: Pick<HabitCompletion, "habit_id" | "completed_on">[],
  todayIso: string,
): number {
  const days = new Set(habit.days_of_week);
  if (days.size === 0) return 0;

  const completed = new Set(
    completions
      .filter((c) => c.habit_id === habit.id)
      .map((c) => c.completed_on),
  );

  const today = isoToParts(todayIso);

  // If today is scheduled and not yet completed, we count back from yesterday
  // (today is still in progress and shouldn't break the streak).
  let cursor = today;
  if (days.has(dowUtc(today)) && !completed.has(todayIso)) {
    cursor = previousDay(today);
  }

  let streak = 0;
  // Walk backwards. Stop the first time a scheduled day is missed.
  // Cap at 365 to keep this O(1)-ish for runaway data.
  for (let i = 0; i < 365; i++) {
    if (!days.has(dowUtc(cursor))) {
      cursor = previousDay(cursor);
      continue;
    }
    if (completed.has(partsToIso(cursor))) {
      streak += 1;
      cursor = previousDay(cursor);
    } else {
      break;
    }
  }
  return streak;
}
