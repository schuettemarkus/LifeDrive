import { NextResponse } from "next/server";
import { z } from "zod";
import { anthropic, modelFor, extractJson, joinTextBlocks } from "@/lib/anthropic";
import { requireCurrentUserAndHousehold } from "@/lib/household";
import { LIFE_AREA_KEYS } from "@/lib/design";

const schema = z.object({
  rawText: z.string().min(1).max(8000),
  commit: z.boolean().optional(),
});

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
});

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const client = anthropic();

    const resp = await client.messages.create({
      model: modelFor("triage"),
      max_tokens: 2048,
      system: `${SYSTEM}\n\nTODAY: ${todayIso()}`,
      messages: [
        {
          role: "user",
          content: `Brain dump (one or more items):\n\n"""\n${body.rawText}\n"""`,
        },
      ],
    });

    const text = joinTextBlocks(resp.content);
    const parsed = extractJson<unknown>(text);
    const itemsArr = Array.isArray(parsed) ? parsed : [parsed];
    const items = itemsArr
      .map((r) => triageItemSchema.safeParse(r))
      .filter((p) => p.success)
      .map((p) => (p as { success: true; data: z.infer<typeof triageItemSchema> }).data);

    if (!body.commit) {
      return NextResponse.json({ items, raw: text });
    }

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
    const message = e instanceof Error ? e.message : "Triage failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
