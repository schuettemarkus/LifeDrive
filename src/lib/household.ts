import { supabaseServer, supabaseService } from "@/lib/supabase/server";

/**
 * Return the authenticated user's household id, or null.
 * Reads from the user's profile row (single source of truth).
 */
export async function getCurrentHouseholdId(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .maybeSingle();
    return data?.household_id ?? null;
  } catch {
    return null;
  }
}

export async function requireCurrentUserAndHousehold() {
  const supabase = await supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not signed in");
  const householdId = await getCurrentHouseholdId();
  if (!householdId) throw new Error("No household — finish onboarding first");
  return { user, householdId, supabase };
}

/**
 * Creates a household, makes the caller an owner, and stamps the profile.
 * All writes happen with service role to keep RLS sane (we're the ones
 * inserting the membership row that RLS keys off of).
 */
export async function createHousehold(name: string) {
  const supabase = await supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not signed in");

  const admin = supabaseService();
  const { data: household, error: hErr } = await admin
    .from("households")
    .insert({ name, created_by: user.id })
    .select("*")
    .single();
  if (hErr || !household) throw hErr ?? new Error("Failed to create household");

  await admin.from("household_members").insert({
    household_id: household.id,
    user_id: user.id,
    role: "owner",
  });

  await admin
    .from("profiles")
    .update({ household_id: household.id })
    .eq("id", user.id);

  return household;
}

function randomToken(len = 24) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createInvite(householdId: string, email: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const token = randomToken();
  const admin = supabaseService();
  const { data, error } = await admin
    .from("invites")
    .insert({
      household_id: householdId,
      email,
      token,
      invited_by: user.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function acceptInvite(token: string) {
  const supabase = await supabaseServer();
  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr || !user) throw new Error("Not signed in");

  const admin = supabaseService();
  const { data: invite, error } = await admin
    .from("invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error || !invite) throw new Error("Invalid invite");
  if (invite.accepted_by) throw new Error("Invite already used");
  if (new Date(invite.expires_at) < new Date()) throw new Error("Invite expired");

  await admin.from("household_members").upsert({
    household_id: invite.household_id,
    user_id: user.id,
    role: "member",
  });
  await admin
    .from("invites")
    .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq("id", invite.id);
  await admin
    .from("profiles")
    .update({ household_id: invite.household_id })
    .eq("id", user.id);

  return invite.household_id as string;
}
