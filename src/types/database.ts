/**
 * Generated-style database types. Hand-written for clarity until we
 * generate from supabase. Mirrors supabase/migrations/0001_init.sql.
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

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  household_id: string | null;
  working_hours: WorkingHours;
  focus_windows: FocusWindow[];
  energy_windows: FocusWindow[];
  timezone: string;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface HouseholdMember {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
}

export interface Invite {
  id: string;
  household_id: string;
  email: string;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface Item {
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
}

export interface ScheduleBlock {
  id: string;
  item_id: string;
  user_id: string;
  google_event_id: string | null;
  starts_at: string;
  ends_at: string;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}

export interface Principle {
  id: string;
  household_id: string;
  author_id: string | null;
  text: string;
  theme: string | null;
  active: boolean;
  last_shown_at: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  day_of_week: number | null;
  scheduled_for: string | null;
  name: string;
  exercises: string[];
  completed_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  household_id: string;
  user_id: string;
  week_start: string;
  stats: Record<string, unknown>;
  reflection: string | null;
  created_at: string;
}

export interface GoogleAccount {
  user_id: string;
  google_sub: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string | null;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      households: { Row: Household; Insert: Partial<Household> & { name: string }; Update: Partial<Household> };
      household_members: {
        Row: HouseholdMember;
        Insert: Omit<HouseholdMember, "joined_at"> & { joined_at?: string };
        Update: Partial<HouseholdMember>;
      };
      invites: { Row: Invite; Insert: Partial<Invite> & { household_id: string; email: string; token: string }; Update: Partial<Invite> };
      items: { Row: Item; Insert: Partial<Item> & { household_id: string; title: string }; Update: Partial<Item> };
      schedule_blocks: {
        Row: ScheduleBlock;
        Insert: Partial<ScheduleBlock> & { item_id: string; user_id: string; starts_at: string; ends_at: string };
        Update: Partial<ScheduleBlock>;
      };
      principles: { Row: Principle; Insert: Partial<Principle> & { household_id: string; text: string }; Update: Partial<Principle> };
      workouts: { Row: Workout; Insert: Partial<Workout> & { user_id: string; name: string }; Update: Partial<Workout> };
      reviews: { Row: Review; Insert: Partial<Review> & { household_id: string; user_id: string; week_start: string }; Update: Partial<Review> };
      google_accounts: { Row: GoogleAccount; Insert: GoogleAccount; Update: Partial<GoogleAccount> };
    };
  };
};
