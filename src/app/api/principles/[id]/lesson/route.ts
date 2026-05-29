import { NextResponse } from "next/server";
import { anthropic, modelFor, joinTextBlocks } from "@/lib/anthropic";
import { supabaseServer } from "@/lib/supabase/server";
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

    const client = anthropic();
    const resp = await client.messages.create({
      model: modelFor("reason"),
      max_tokens: 600,
      system: `You are a personal mentor explaining a life principle. The user has this principle on their daily dashboard. Write a tight micro-lesson (110-160 words, two short paragraphs). The first paragraph is a vivid real-world scenario where this principle would change someone's choice. The second is one concrete action the reader can do today to live the principle — verb-led, specific, finishable in under an hour. Plain prose. No headings, no bullets, no markdown, no quotation marks around the principle.`,
      messages: [
        {
          role: "user",
          content: `Principle: ${row.text}\nTheme: ${row.theme ?? "unspecified"}`,
        },
      ],
    });
    const lesson = joinTextBlocks(resp.content).trim();
    if (!lesson) throw new Error("empty_lesson");

    await supabase
      .from("principles")
      .update({ lesson, lesson_generated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ lesson, cached: false, principle: { ...row, lesson } });
  } catch (e) {
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
