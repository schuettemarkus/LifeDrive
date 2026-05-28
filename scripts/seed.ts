#!/usr/bin/env tsx
/**
 * Idempotent seed loader for Life Drive.
 *
 * Reads `life-drive-seed-data.json` (the owner's real content) and writes:
 *   - households / household_members / profiles (owner only)
 *   - principles
 *   - workouts (weekly recurring split for the current week)
 *   - items (goals → projects → subtasks; tasks; vision_2030 someday lane)
 *
 * Re-running must not duplicate. We key on stable "source identity":
 *   - principle: (household_id, text)
 *   - workout: (user_id, scheduled_for)
 *   - item: (household_id, title) for top-level; (parent_id, title) for child
 *
 * Usage:
 *   SEED_OWNER_EMAIL=you@example.com npm run seed
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (service role bypasses RLS).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type AnyJson = Record<string, any>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!OWNER_EMAIL) {
  console.error("Set SEED_OWNER_EMAIL to the auth email of the owner.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const seedPath = path.resolve(process.cwd(), "life-drive-seed-data.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as AnyJson;

const HOUSEHOLD_NAME = seed?._meta?.household?.name ?? "Home base";

function startOfThisWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday
  d.setDate(d.getDate() - diff);
  return d;
}

async function findOwnerUserId(email: string): Promise<string> {
  // Page through users (service-role only) until we find the email.
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) break;
    page++;
  }
  throw new Error(`No auth user with email ${email}. Sign in once first.`);
}

async function ensureHousehold(ownerId: string) {
  // Reuse if the owner is already in a household.
  const { data: prof } = await admin
    .from("profiles")
    .select("household_id")
    .eq("id", ownerId)
    .maybeSingle();
  if (prof?.household_id) return prof.household_id as string;

  // Try by name first.
  const { data: existing } = await admin
    .from("households")
    .select("id")
    .eq("name", HOUSEHOLD_NAME)
    .maybeSingle();
  let householdId = existing?.id as string | undefined;
  if (!householdId) {
    const { data, error } = await admin
      .from("households")
      .insert({ name: HOUSEHOLD_NAME, created_by: ownerId })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("household insert failed");
    householdId = data.id as string;
  }
  await admin.from("household_members").upsert({
    household_id: householdId,
    user_id: ownerId,
    role: "owner",
  });
  await admin.from("profiles").update({ household_id: householdId }).eq("id", ownerId);
  return householdId;
}

async function ensureOwnerProfile(ownerId: string) {
  const owner = seed.owner_profile ?? {};
  await admin
    .from("profiles")
    .update({
      timezone: owner.timezone ?? "America/Denver",
      working_hours: owner.working_hours ?? { start: "06:00", end: "21:00" },
      focus_windows: owner.focus_windows ?? [],
    })
    .eq("id", ownerId);
}

async function seedPrinciples(householdId: string, authorId: string) {
  const groups = seed.principles ?? {};
  const rows: { household_id: string; author_id: string; text: string; theme: string }[] = [];
  for (const theme of Object.keys(groups)) {
    if (theme.startsWith("_")) continue;
    for (const text of groups[theme] as string[]) {
      rows.push({ household_id: householdId, author_id: authorId, text, theme });
    }
  }
  if (rows.length === 0) return 0;
  const { error } = await admin
    .from("principles")
    .upsert(rows, { onConflict: "household_id,text" });
  if (error) throw error;
  return rows.length;
}

async function seedWorkouts(userId: string) {
  const split = seed.workout_split ?? {};
  const week = startOfThisWeek();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const rows: any[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(week);
    day.setDate(week.getDate() + ((i + 6) % 7)); // start Monday
    const dayName = days[day.getDay()];
    const w = split[dayName];
    if (!w) continue;
    rows.push({
      user_id: userId,
      day_of_week: day.getDay(),
      scheduled_for: day.toISOString().slice(0, 10),
      name: w.name,
      exercises: w.exercises ?? [],
    });
  }
  if (rows.length === 0) return 0;
  const { error } = await admin
    .from("workouts")
    .upsert(rows, { onConflict: "user_id,scheduled_for" });
  if (error) throw error;
  return rows.length;
}

async function upsertItem(payload: {
  household_id: string;
  created_by: string;
  title: string;
  notes?: string;
  type?: "task" | "project";
  parent_id?: string | null;
  life_area?: string | null;
  effort_minutes?: number | null;
  status?: "inbox" | "backlog" | "this_week" | "doing" | "done" | "someday";
  is_next_action?: boolean;
  impact?: number;
  urgency?: number;
  source?: "manual" | "capture" | "import" | "seed";
}) {
  // Idempotent by (household_id, parent_id, title).
  let q = admin
    .from("items")
    .select("id")
    .eq("household_id", payload.household_id)
    .eq("title", payload.title);
  q = payload.parent_id ? q.eq("parent_id", payload.parent_id) : q.is("parent_id", null);
  const { data: existing } = await q.maybeSingle();
  if (existing?.id) {
    const { id, ...rest } = payload as any;
    await admin.from("items").update(rest).eq("id", existing.id);
    return existing.id as string;
  }
  const { data, error } = await admin
    .from("items")
    .insert({ ...payload, source: payload.source ?? "seed" })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("item insert failed");
  return data.id as string;
}

async function seedGoals(householdId: string, ownerId: string) {
  const goals = seed.goals_2026 ?? {};
  let count = 0;
  for (const area of Object.keys(goals)) {
    if (area.startsWith("_")) continue;
    const bucket = goals[area];
    for (const goalKey of Object.keys(bucket)) {
      const goal = bucket[goalKey];
      const title = `${goalKey.replace(/_/g, " ")} — 2026`;
      const targets: string[] = goal.targets ?? [];
      const notes = targets.length ? targets.map((t) => `• ${t}`).join("\n") : undefined;
      await upsertItem({
        household_id: householdId,
        created_by: ownerId,
        title,
        notes,
        type: "project",
        life_area: area === "health" ? "health" : area === "finance" ? "money" : null,
        status: "backlog",
        impact: 5,
        source: "seed",
      });
      count++;
    }
  }
  return count;
}

async function seedProjects(householdId: string, ownerId: string) {
  const projects: any[] = seed.projects ?? [];
  let projectCount = 0;
  let subtaskCount = 0;
  for (const p of projects) {
    const projectId = await upsertItem({
      household_id: householdId,
      created_by: ownerId,
      title: p.title,
      type: "project",
      life_area: p.area ?? null,
      effort_minutes: p.effort_minutes ?? null,
      impact: p.urgency ?? 4,
      status: "backlog",
      source: "seed",
    });
    projectCount++;
    const subtasks: string[] = p.subtasks ?? [];
    for (let i = 0; i < subtasks.length; i++) {
      await upsertItem({
        household_id: householdId,
        created_by: ownerId,
        parent_id: projectId,
        title: subtasks[i],
        type: "task",
        life_area: p.area ?? null,
        status: "backlog",
        source: "seed",
      });
      subtaskCount++;
    }
    // Mark the next_step (string) as a child + is_next_action.
    if (p.next_step) {
      const nextId = await upsertItem({
        household_id: householdId,
        created_by: ownerId,
        parent_id: projectId,
        title: p.next_step,
        type: "task",
        life_area: p.area ?? null,
        status: "this_week",
        is_next_action: true,
        source: "seed",
      });
      // Clear is_next_action from sibling tasks of the same project.
      await admin
        .from("items")
        .update({ is_next_action: false })
        .eq("parent_id", projectId)
        .neq("id", nextId);
      subtaskCount++;
    }
  }
  return { projectCount, subtaskCount };
}

async function seedTasks(householdId: string, ownerId: string) {
  const tasks: any[] = seed.tasks ?? [];
  let count = 0;
  for (const t of tasks) {
    await upsertItem({
      household_id: householdId,
      created_by: ownerId,
      title: t.title,
      type: "task",
      life_area: t.area ?? null,
      effort_minutes: t.effort_minutes ?? null,
      urgency: t.urgency ?? 3,
      status: "backlog",
      source: "seed",
    });
    count++;
  }
  return count;
}

async function seedSomeday(householdId: string, ownerId: string) {
  const vision = seed.vision_2030 ?? {};
  const items: any[] = vision.items ?? [];
  let count = 0;
  for (const v of items) {
    const id = await upsertItem({
      household_id: householdId,
      created_by: ownerId,
      title: v.title,
      type: "project",
      life_area: v.area ?? null,
      notes: v.notes ?? null,
      status: "someday",
      source: "seed",
    });
    const subs: string[] = v.subtasks ?? [];
    for (const s of subs) {
      await upsertItem({
        household_id: householdId,
        created_by: ownerId,
        parent_id: id,
        title: s,
        type: "task",
        life_area: v.area ?? null,
        status: "someday",
        source: "seed",
      });
    }
    count++;
  }
  return count;
}

async function main() {
  console.log(`→ Seeding Life Drive as ${OWNER_EMAIL}`);
  const ownerId = await findOwnerUserId(OWNER_EMAIL!);
  console.log(`  · owner user id: ${ownerId}`);

  const householdId = await ensureHousehold(ownerId);
  console.log(`  · household id : ${householdId}`);

  await ensureOwnerProfile(ownerId);
  console.log("  · profile updated (timezone + focus windows)");

  const p = await seedPrinciples(householdId, ownerId);
  console.log(`  · principles   : ${p}`);

  const w = await seedWorkouts(ownerId);
  console.log(`  · workouts     : ${w}`);

  const goals = await seedGoals(householdId, ownerId);
  console.log(`  · goals_2026   : ${goals}`);

  const { projectCount, subtaskCount } = await seedProjects(householdId, ownerId);
  console.log(`  · projects     : ${projectCount} (+${subtaskCount} subtasks/next-actions)`);

  const tasks = await seedTasks(householdId, ownerId);
  console.log(`  · tasks        : ${tasks}`);

  const someday = await seedSomeday(householdId, ownerId);
  console.log(`  · someday      : ${someday}`);

  console.log("✓ Done. Safe to re-run.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
