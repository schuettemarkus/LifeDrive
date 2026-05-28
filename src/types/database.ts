/**
 * Hand-written database types that satisfy @supabase/supabase-js v2's
 * GenericSchema constraint. Notably:
 *   - Every Row/Insert/Update must be assignable to {[k: string]: unknown}.
 *     TypeScript only allows this for `type` aliases, NOT for `interface`
 *     declarations. Keep these as `type`.
 *   - The public schema must expose Tables, Views, Functions, Enums,
 *     CompositeTypes — even when empty — or the entire table type
 *     collapses to `never` and `.update()/.insert()` arguments become
 *     uncallable.
 */
import type { LifeAreaKey } from "@/lib/design";

export type ItemType = "task" | "project";
export type ItemStatus = "inbox" | "backlog" | "this_week" | "doing" | "done" | "someday";
export type ItemVisibility = "private" | "household";
export type ItemSource = "manual" | "capture" | "import" | "seed";
export type ScheduleStatus = "proposed" | "accepted" | "done" | "skipped";
export type HouseholdRole = "owner" | "member";

export type WorkingHours = { start: string; end: string };
export type FocusWindow = { start: string; end: string; label?: string };

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  household_id: string | null;
  working_hours: WorkingHours;
  focus_windows: FocusWindow[];
  energy_windows: FocusWindow[];
  timezone: string;
  created_at: string;
};

export type Household = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
};

export type HouseholdMember = {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
};

export type Invite = {
  id: string;
  household_id: string;
  email: string;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type Item = {
  id: string;
  household_id: string;
  created_by: string | null;
  assigned_to: string | null;
  title: string;
  notes: string | null;
  type: ItemType;
  parent_id: string | null;
  life_area: LifeAreaKey | null;
  visibility: ItemVisibility;
  status: ItemStatus;
  impact: number;
  urgency: number;
  effort_minutes: number | null;
  due_date: string | null;
  urgency_score: number;
  priority_score: number;
  priority_reason: string | null;
  is_next_action: boolean;
  position: number;
  source: ItemSource;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type ScheduleBlock = {
  id: string;
  item_id: string;
  user_id: string;
  google_event_id: string | null;
  starts_at: string;
  ends_at: string;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
};

export type Principle = {
  id: string;
  household_id: string;
  author_id: string | null;
  text: string;
  theme: string | null;
  active: boolean;
  last_shown_at: string | null;
  created_at: string;
};

export type Workout = {
  id: string;
  user_id: string;
  day_of_week: number | null;
  scheduled_for: string | null;
  name: string;
  exercises: string[];
  completed_at: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  household_id: string;
  user_id: string;
  week_start: string;
  stats: Record<string, unknown>;
  reflection: string | null;
  created_at: string;
};

export type GoogleAccount = {
  user_id: string;
  google_sub: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string | null;
  scopes: string[];
  created_at: string;
  updated_at: string;
};

type TableShape<Row> = {
  Row: Row;
  Insert: { [K in keyof Row]?: Row[K] };
  Update: { [K in keyof Row]?: Row[K] };
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<Profile>;
      households: TableShape<Household>;
      household_members: TableShape<HouseholdMember>;
      invites: TableShape<Invite>;
      items: TableShape<Item>;
      schedule_blocks: TableShape<ScheduleBlock>;
      principles: TableShape<Principle>;
      workouts: TableShape<Workout>;
      reviews: TableShape<Review>;
      google_accounts: TableShape<GoogleAccount>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      item_type: ItemType;
      item_status: ItemStatus;
      item_visibility: ItemVisibility;
      item_source: ItemSource;
      schedule_status: ScheduleStatus;
      household_role: HouseholdRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
