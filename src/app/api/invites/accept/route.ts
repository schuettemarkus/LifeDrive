import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptInvite } from "@/lib/household";

const schema = z.object({ token: z.string().min(8) });

export async function POST(req: Request) {
  try {
    const { token } = schema.parse(await req.json());
    const householdId = await acceptInvite(token);
    return NextResponse.json({ ok: true, household_id: householdId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}
