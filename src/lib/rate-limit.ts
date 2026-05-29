/**
 * AI rate limiter.
 *
 * Uses the public.ai_usage ledger (migration 0004) — service-role inserts a
 * row per call. Pre-flight check counts calls in the rolling window and
 * rejects if over budget.
 *
 * Budgets are per-endpoint + a global cap, both expressed as
 * (count, windowMinutes). They run via security-definer SQL so RLS doesn't
 * interfere even with the user-bound client.
 */
import { supabaseServer, supabaseService } from "@/lib/supabase/server";

export type AiEndpoint = "triage" | "decompose" | "lesson" | "prioritize_reason";

type Budget = { calls: number; minutes: number };

const PER_ENDPOINT: Record<AiEndpoint, Budget[]> = {
  // Triage runs are bursty (a brain dump). Allow many per hour, cap per day.
  triage:            [{ calls: 30,  minutes: 60 },   { calls: 200, minutes: 60 * 24 }],
  decompose:         [{ calls: 12,  minutes: 60 },   { calls: 50,  minutes: 60 * 24 }],
  lesson:            [{ calls: 8,   minutes: 60 },   { calls: 40,  minutes: 60 * 24 }],
  prioritize_reason: [{ calls: 8,   minutes: 60 },   { calls: 80,  minutes: 60 * 24 }],
};

const GLOBAL: Budget = { calls: 500, minutes: 60 * 24 };

export class RateLimitError extends Error {
  status = 429;
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function countCalls(userId: string, endpoint: AiEndpoint | "*", minutes: number) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .rpc("ai_calls_in_window", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_minutes: minutes,
    })
    .single<number>();
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

export async function checkRateLimit(userId: string, endpoint: AiEndpoint) {
  // Global cap first.
  const total = await countCalls(userId, "*", GLOBAL.minutes);
  if (total >= GLOBAL.calls) {
    throw new RateLimitError(
      `Daily AI budget reached (${GLOBAL.calls}/24h). Try again tomorrow or raise your limit in settings.`,
      Math.max(60, GLOBAL.minutes * 60 - 1),
    );
  }
  // Then per-endpoint windows.
  for (const b of PER_ENDPOINT[endpoint]) {
    const n = await countCalls(userId, endpoint, b.minutes);
    if (n >= b.calls) {
      throw new RateLimitError(
        `${endpoint} is rate-limited (${b.calls} per ${b.minutes} min). Try again soon.`,
        b.minutes * 60,
      );
    }
  }
}

export async function recordUsage(
  userId: string,
  endpoint: AiEndpoint,
  detail?: { model?: string; input_tokens?: number; output_tokens?: number },
) {
  // Service role bypasses RLS (the table denies all client writes).
  const admin = supabaseService();
  await admin.from("ai_usage").insert({
    user_id: userId,
    endpoint,
    model: detail?.model ?? null,
    input_tokens: detail?.input_tokens ?? null,
    output_tokens: detail?.output_tokens ?? null,
  });
}

/**
 * Convenience wrapper: pre-flight check, run the work, record the call.
 * Throws RateLimitError before invoking `fn` if over budget.
 */
export async function withRateLimit<T>(
  userId: string,
  endpoint: AiEndpoint,
  fn: () => Promise<{ result: T; usage?: { model?: string; input_tokens?: number; output_tokens?: number } }>,
): Promise<T> {
  await checkRateLimit(userId, endpoint);
  const { result, usage } = await fn();
  // Fire-and-forget so the response isn't delayed.
  void recordUsage(userId, endpoint, usage);
  return result;
}
