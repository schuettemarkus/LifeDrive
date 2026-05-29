import { NextResponse } from "next/server";
import { z } from "zod";
import { anthropic, modelFor, extractJson, joinTextBlocks } from "@/lib/anthropic";
import { requireCurrentUserAndHousehold } from "@/lib/household";
import { LIFE_AREA_KEYS } from "@/lib/design";
import { checkRateLimit, recordUsage, RateLimitError } from "@/lib/rate-limit";

const triageItemSchema = z.object({
  title: z.string().min(1),
  notes: z.string().nullable().optional(),
  life_area: z.enum(LIFE_AREA_KEYS as [string, ...string[]]).nullable().optional(),
  type: z.enum(["task", "project"]),
  effort_minutes: z.number().int().min(5).max(20_000),
  urgency: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5).optional(),
  suggested_due_date: z.string().nullable().optional(),
  is_next_action: z.boolean().optional(),
  status: z.enum(["inbox", "backlog", "this_week", "doing"]).optional(),
});

type TriageItem = z.infer<typeof triageItemSchema>;

const bodySchema = z.union([
  // Preview-only: triage the brain dump and return structured items.
  z.object({
    rawText: z.string().min(1).max(8000),
    commit: z.literal(false).optional(),
    items: z.never().optional(),
  }),
  // Commit a pre-triaged list straight to the inbox/this_week lane.
  z.object({
    items: z.array(triageItemSchema).min(1).max(100),
    commit: z.literal(true).optional(),
    rawText: z.string().optional(),
  }),
  // Triage AND commit in one call (legacy convenience).
  z.object({
    rawText: z.string().min(1).max(8000),
    commit: z.literal(true),
    items: z.never().optional(),
  }),
]);

const SYSTEM = `You are the triage engine for Life Drive, a calm chief-of-staff app.
Sort a brain-dump into structured items. Return STRICT JSON. No prose, no markdown fences.

Output shape: an array of objects matching this exact schema:
{
  "title": string (concise verb phrase),
  "notes": string|null,
  "life_area": one of ["family","health","home","career","money","growth","creative"]|null,
  "type": "task" | "project" (use "project" only if it clearly needs >=3 distinct steps),
  "effort_minutes": integer (a single-action task only; for projects estimate the TOTAL),
  "urgency": integer 1-5 (5 = today/this week),
  "impact": integer 1-5 (5 = high leverage),
  "suggested_due_date": YYYY-MM-DD or null,
  "is_next_action": boolean (true only if the item is small and ready to do now)
}

Rules:
- One element per discrete intent. Split compound sentences.
- Convert relative dates ("Friday") into ISO calendar dates relative to TODAY.
- Default to "task" with type-confidence bias toward small.
- If urgency is unclear, choose 3. If effort is unclear, default 30.
- Title must start with a verb. No hedging language.
- Output ONLY the JSON array.`;

async function triageText(rawText: string, userId: string): Promise<TriageItem[]> {
  const client = anthropic();
  const today = new Date().toISOString().slice(0, 10);
  const model = modelFor("triage");
  const resp = await client.messages.create({
    model,
    max_tokens: 2048,
    system: `${SYSTEM}\n\nTODAY: ${today}`,
    messages: [
      {
        role: "user",
        content: `Brain dump (one or more items):\n\n"""\n${rawText}\n"""`,
      },
    ],
  });
  // Fire-and-forget usage record; the pre-flight check has already gated entry.
  void recordUsage(userId, "triage", {
    model,
    input_tokens: resp.usage?.input_tokens,
    output_tokens: resp.usage?.output_tokens,
  });
  const text = joinTextBlocks(resp.content);
  const parsed = extractJson<unknown>(text);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr
    .map((r) => triageItemSchema.safeParse(r))
    .filter((p): p is { success: true; data: TriageItem } => p.success)
    .map((p) => p.data);
}

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());

    // Path 1: pre-triaged items, just commit.
    if ("items" in body && body.items) {
      const { householdId, user, supabase } = await requireCurrentUserAndHousehold();
      const insertRows = body.items.map((it) => ({
        household_id: householdId,
        created_by: user.id,
        title: it.title,
        notes: it.notes ?? null,
        type: it.type,
        life_area: it.life_area ?? null,
        effort_minutes: it.effort_minutes ?? null,
        impact: it.impact ?? 3,
        urgency: it.urgency,
        due_date: it.suggested_due_date ?? null,
        is_next_action: Boolean(it.is_next_action),
        status: it.status ?? ("inbox" as const),
        source: "capture" as const,
      }));
      const { data, error } = await supabase.from("items").insert(insertRows).select("*");
      if (error) throw error;
      return NextResponse.json({ items: data });
    }

    // Path 2 + 3: triage rawText, optionally also commit.
    if (!body.rawText) {
      return NextResponse.json({ error: "Provide rawText or items" }, { status: 400 });
    }
    const { user: triageUser } = await requireCurrentUserAndHousehold();
    await checkRateLimit(triageUser.id, "triage");
    const items = await triageText(body.rawText, triageUser.id);
    if (!body.commit) return NextResponse.json({ items });

    const { householdId, user, supabase } = await requireCurrentUserAndHousehold();
    const insertRows = items.map((it) => ({
      household_id: householdId,
      created_by: user.id,
      title: it.title,
      notes: it.notes ?? null,
      type: it.type,
      life_area: it.life_area ?? null,
      effort_minutes: it.effort_minutes ?? null,
      impact: it.impact ?? 3,
      urgency: it.urgency,
      due_date: it.suggested_due_date ?? null,
      is_next_action: Boolean(it.is_next_action),
      status: "inbox" as const,
      source: "capture" as const,
    }));
    const { data, error } = await supabase.from("items").insert(insertRows).select("*");
    if (error) throw error;
    return NextResponse.json({ items: data });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: e.message, retry_after_seconds: e.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } },
      );
    }
    const message = e instanceof Error ? e.message : "Triage failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
