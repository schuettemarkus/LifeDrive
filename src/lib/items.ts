import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Item, ItemStatus } from "@/types/database";

export type ItemsClient = SupabaseClient<Database>;

export async function listItems(
  client: ItemsClient,
  householdId: string,
  opts?: { status?: ItemStatus; area?: string },
) {
  let q = client
    .from("items")
    .select("*")
    .eq("household_id", householdId)
    .order("position", { ascending: true })
    .order("priority_score", { ascending: false });
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.area) q = q.eq("life_area", opts.area);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Item[];
}

export async function moveItem(
  client: ItemsClient,
  itemId: string,
  patch: { status?: ItemStatus; position?: number; life_area?: string | null; assigned_to?: string | null },
) {
  const { error } = await client.from("items").update(patch).eq("id", itemId);
  if (error) throw error;
}

export async function completeItem(client: ItemsClient, itemId: string) {
  const { error } = await client
    .from("items")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw error;
}

export async function createItem(
  client: ItemsClient,
  payload: {
    household_id: string;
    title: string;
    notes?: string;
    life_area?: string;
    effort_minutes?: number;
    impact?: number;
    urgency?: number;
    type?: "task" | "project";
    parent_id?: string;
    status?: ItemStatus;
    source?: "manual" | "capture" | "import" | "seed";
  },
) {
  const { data, error } = await client
    .from("items")
    .insert({
      ...payload,
      status: payload.status ?? "inbox",
      source: payload.source ?? "manual",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Item;
}
