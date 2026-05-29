import { NextResponse } from "next/server";
import { anthropic, modelFor, joinTextBlocks } from "@/lib/anthropic";
import { supabaseServer } from "@/lib/supabase/server";
import { checkRateLimit, recordUsage, RateLimitError } from "@/lib/rate-limit";
import type { Principle } from "@/types/database";

/**
 * GET /api/principles/[id]/lesson
 *   Returns the cached micro-lesson if present; otherwise asks Sonnet to
 *   write one (a real-world scenario + one concrete action you could take
 *   today). Caches the result on the principles row so future expansions
 *   are instant and don't burn tokens.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supabase = await supabaseServer();
    const { data: row, error } = await supabase
      .from("principles")
      .select("*")
      .eq("id", id)
      .maybeSingle<Principle>();
    if (error) throw error;
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

    if (row.lesson) {
      return NextResponse.json({ lesson: row.lesson, cached: true, principle: row });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    await checkRateLimit(user.id, "lesson");

    const client = anthropic();
    const model = modelFor("reason");
    const resp = await client.messages.create({
      model,
      max_tokens: 400,
      system: `You write tight summaries of life principles for a personal dashboard. Given a principle, produce a calm 2-3 sentence summary (60-100 words) that explains what it actually means and why it matters. Plain prose, second person ("you") when natural. No headings, no bullets, no markdown, no quotation marks around the principle, no calls to action, no exhortations to "today". Just a clear, grounded summary the reader can absorb in 15 seconds.`,
      messages: [
        {
          role: "user",
          content: `Principle: ${row.text}\nTheme: ${row.theme ?? "unspecified"}`,
        },
      ],
    });
    void recordUsage(user.id, "lesson", {
      model,
      input_tokens: resp.usage?.input_tokens,
      output_tokens: resp.usage?.output_tokens,
    });
    const lesson = joinTextBlocks(resp.content).trim();
    if (!lesson) throw new Error("empty_lesson");

    await supabase
      .from("principles")
      .update({ lesson, lesson_generated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ lesson, cached: false, principle: { ...row, lesson } });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: e.message, retry_after_seconds: e.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } },
      );
    }
    const msg = e instanceof Error ? e.message : "lesson_error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/**
 * DELETE /api/principles/[id]/lesson — clears the cache so the next GET regenerates.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("principles")
    .update({ lesson: null, lesson_generated_at: null })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
