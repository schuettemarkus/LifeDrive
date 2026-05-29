import { NextResponse } from "next/server";
import { z } from "zod";
import { anthropic, modelFor, extractJson, joinTextBlocks } from "@/lib/anthropic";
import { requireCurrentUserAndHousehold } from "@/lib/household";
import { checkRateLimit, recordUsage, RateLimitError } from "@/lib/rate-limit";

const schema = z.object({
  item_id: z.string().uuid(),
  commit: z.boolean().optional(),
});

const decomposedSchema = z.object({
  steps: z
    .array(
      z.object({
        title: z.string().min(3),
        effort_minutes: z.number().int().min(5).max(2000),
      }),
    )
    .min(2)
    .max(20),
  next_action_index: z.number().int().min(0),
});

const SYSTEM = `You break a project into ordered next steps for Life Drive.
Return STRICT JSON, no fences. Schema:
{
  "steps": [ { "title": "verb-led concrete action", "effort_minutes": integer } ],
  "next_action_index": integer (the single first step the user should do now)
}

Rules:
- Each step is small, concrete, verb-led ("Measure garage — 15 min" style — but no em-dash in title; effort goes in effort_minutes).
- The first step (index 0) is usually the next action; only deviate if a precursor is obviously required.
- 3-10 steps for most projects. Don't pad.
- If the project's "notes" already contain a list, refine; don't ignore them.`;

export async function POST(req: Request) {
  try {
    const { item_id, commit } = schema.parse(await req.json());
    const { householdId, user, supabase } = await requireCurrentUserAndHousehold();

    const { data: item, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", item_id)
      .eq("household_id", householdId)
      .maybeSingle<import("@/types/database").Item>();
    if (error) throw error;
    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (item.type !== "project")
      return NextResponse.json({ error: "only projects can be decomposed" }, { status: 400 });

    await checkRateLimit(user.id, "decompose");

    const client = anthropic();
    const model = modelFor("reason");
    const resp = await client.messages.create({
      model,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Project title: ${item.title}\nLife area: ${item.life_area ?? "unspecified"}\nNotes:\n${item.notes ?? "(none)"}`,
        },
      ],
    });
    void recordUsage(user.id, "decompose", {
      model,
      input_tokens: resp.usage?.input_tokens,
      output_tokens: resp.usage?.output_tokens,
    });

    type Decomposed = z.infer<typeof decomposedSchema>;
    const parsed: Decomposed = decomposedSchema.parse(extractJson(joinTextBlocks(resp.content)));

    if (!commit) {
      return NextResponse.json({ ...parsed, item_id });
    }

    // Insert children. Clear is_next_action on existing siblings first.
    await supabase.from("items").update({ is_next_action: false }).eq("parent_id", item_id);

    const rows = parsed.steps.map((s: Decomposed["steps"][number], i: number) => ({
      household_id: householdId,
      parent_id: item_id,
      created_by: user.id,
      title: s.title,
      effort_minutes: s.effort_minutes,
      type: "task" as const,
      life_area: item.life_area,
      status: i === parsed.next_action_index ? ("this_week" as const) : ("backlog" as const),
      is_next_action: i === parsed.next_action_index,
      position: i,
      source: "manual" as const,
    }));
    const { data, error: insErr } = await supabase.from("items").insert(rows).select("*");
    if (insErr) throw insErr;
    return NextResponse.json({ steps: data, next_action_index: parsed.next_action_index });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: e.message, retry_after_seconds: e.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } },
      );
    }
    const message = e instanceof Error ? e.message : "Decompose failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
