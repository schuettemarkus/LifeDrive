import { NextResponse } from "next/server";
import { requireCurrentUserAndHousehold } from "@/lib/household";
import { computeAreaDistribution, rankItems, todaysThree, type RankedItem } from "@/lib/priority";
import { anthropic, modelFor, extractJson, joinTextBlocks } from "@/lib/anthropic";

/**
 * GET /api/prioritize?persist=true&explain=true
 *  - persist=true (default) writes priority_score + priority_reason to items
 *  - explain=true asks Sonnet to compose short, human reasons for the top 3
 */
export async function GET(req: Request) {
  try {
    const { householdId, supabase } = await requireCurrentUserAndHousehold();
    const url = new URL(req.url);
    const persist = url.searchParams.get("persist") !== "false";
    const explain = url.searchParams.get("explain") === "true";

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("household_id", householdId);
    if (error) throw error;
    const items = data ?? [];

    const dist = computeAreaDistribution(items as any);
    const ranked = rankItems(items as any, dist);
    const top = todaysThree(items as any, dist);

    // Optional LLM explanation of the top items (numeric ranking stays in code).
    let explanations: Record<string, string> | null = null;
    if (explain && top.length > 0) {
      const client = anthropic();
      const prompt = top.map((t) => ({
        id: t.id,
        title: t.title,
        area: t.life_area,
        impact: t.impact,
        urgency: t.urgency,
        effort_minutes: t.effort_minutes,
        is_next_action: t.is_next_action,
        computed_reasons: t.computed.reasons,
      }));
      const resp = await client.messages.create({
        model: modelFor("reason"),
        max_tokens: 600,
        system:
          "Return STRICT JSON: { [item_id]: short_reason_string } where each reason is one calm clause under 14 words, lowercase, explaining why this item is high on the queue today. Lead with the strongest signal. No prose outside the JSON.",
        messages: [
          {
            role: "user",
            content: `Top candidates:\n${JSON.stringify(prompt, null, 2)}`,
          },
        ],
      });
      try {
        explanations = extractJson<Record<string, string>>(joinTextBlocks(resp.content));
      } catch {
        explanations = null;
      }
    }

    if (persist) {
      // batch-update priority_score for everything we ranked, plus reasons for the top
      const updates = ranked.map((r) => ({
        id: r.id,
        priority_score: Math.round(r.computed.score * 100) / 100,
        priority_reason:
          explanations?.[r.id] ??
          (r.computed.reasons.length ? r.computed.reasons.join(" · ") : null),
      }));
      // Postgres doesn't have a bulk update, so we do this in chunks via RPC-style.
      // Simpler: one update per row but small batched parallelism.
      const concurrency = 6;
      for (let i = 0; i < updates.length; i += concurrency) {
        await Promise.all(
          updates.slice(i, i + concurrency).map((u) =>
            supabase
              .from("items")
              .update({
                priority_score: u.priority_score,
                priority_reason: u.priority_reason,
              })
              .eq("id", u.id),
          ),
        );
      }
    }

    return NextResponse.json({
      distribution: dist,
      todays_three: top.map(stripComputed),
      ranked: ranked.slice(0, 50).map(stripComputed),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Prioritize failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function stripComputed(r: RankedItem) {
  const { computed, ...rest } = r;
  return {
    ...rest,
    score: Math.round(computed.score * 100),
    reasons: computed.reasons,
  };
}
