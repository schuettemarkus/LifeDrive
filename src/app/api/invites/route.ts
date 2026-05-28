import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvite } from "@/lib/household";
import { requireCurrentUserAndHousehold } from "@/lib/household";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const { householdId } = await requireCurrentUserAndHousehold();
    const { email } = schema.parse(await req.json());
    const invite = await createInvite(householdId, email);
    const origin = new URL(req.url).origin;
    const link = `${origin}/onboarding/join?token=${invite.token}`;
    return NextResponse.json({ invite, link });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}
