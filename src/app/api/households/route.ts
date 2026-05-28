import { NextResponse } from "next/server";
import { z } from "zod";
import { createHousehold } from "@/lib/household";

const schema = z.object({ name: z.string().min(1).max(80) });

export async function POST(req: Request) {
  try {
    const parsed = schema.parse(await req.json());
    const household = await createHousehold(parsed.name);
    return NextResponse.json({ household });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}
