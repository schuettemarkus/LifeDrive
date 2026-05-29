/**
 * Hand-written database types.
 *
 * Supabase JS v2's GenericSchema constraint (in @supabase/postgrest-js)
 * requires every Row / Insert / Update to be assignable to
 * Record<string, unknown>. We intersect each with that so the constraint
 * holds, and use `{ [_ in never]: never }` for the empty Views / Functions
 * / CompositeTypes maps (matching what `supabase gen types` produces).
 *
 * Without these the table types silently collapse to `never` and every
 * chained .update()/.insert() rejects all payloads.
 */
export type ItemType = "task" | "project";
export type ItemStatus = "inbox" | "backlog" | "this_week" | "doing" | "done" | "someday";
export type ItemVisibility = "private" | "household";
export type ItemSource = "manual" | "capture" | "import" | "seed";
export type ScheduleStatus = "proposed" | "accepted" | "done" | "skipped";
export type HouseholdRole = "owner" | "member";

export type WorkingHours = { start: string; end: string };
export type FocusWindow = { start: string; end: string; label?: string };

type Indexed = Record<string, unknown>;

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
  life_area: string | null;
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
  lesson: string | null;
  lesson_generated_at: string | null;
};

export type HabitTimeOfDay = "morning" | "midday" | "evening" | "anytime";

export type Habit = {
  id: string;
  household_id: string;
  user_id: string;
  title: string;
  notes: string | null;
  life_area: string | null;
  days_of_week: number[]; // 0=Sun..6=Sat
  time_of_day: HabitTimeOfDay;
  icon: string | null;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitCompletion = {
  id: string;
  habit_id: string;
  user_id: string;
  completed_on: string; // YYYY-MM-DD
  completed_at: string;
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

export type DailyActivity = {
  user_id: string;
  day: string; // YYYY-MM-DD
  items_completed: number;
  habits_completed: number;
  workouts_completed: number;
  first_action_at: string | null;
  last_action_at: string | null;
};

export type AiUsage = {
  id: number;
  user_id: string;
  endpoint: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
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
  Row: Row & Indexed;
  Insert: Partial<Row> & Indexed;
  Update: Partial<Row> & Indexed;
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
      habits: TableShape<Habit>;
      habit_completions: TableShape<HabitCompletion>;
      workouts: TableShape<Workout>;
      reviews: TableShape<Review>;
      google_accounts: TableShape<GoogleAccount>;
      daily_activity: TableShape<DailyActivity>;
      ai_usage: TableShape<AiUsage>;
    };
    Views: { [_ in never]: never };
    Functions: {
      get_streak: {
        Args: { p_user_id: string };
        Returns: {
          streak: number;
          today_active: boolean;
          last_active: string | null;
          total_active_days: number;
        }[];
      };
      ai_calls_in_window: {
        Args: { p_user_id: string; p_endpoint: string; p_minutes: number };
        Returns: number;
      };
    };
    Enums: {
      item_type: ItemType;
      item_status: ItemStatus;
      item_visibility: ItemVisibility;
      item_source: ItemSource;
      schedule_status: ScheduleStatus;
      household_role: HouseholdRole;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
