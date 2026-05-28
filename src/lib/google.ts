/**
 * Google Calendar helpers. All calls run server-side only; tokens are
 * persisted in `google_accounts` (service-role-only access).
 */
import { google, type calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { supabaseService } from "@/lib/supabase/server";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

export const EVENT_TAG_KEY = process.env.LIFE_DRIVE_EVENT_TAG ?? "lifeDrive";

function oauthClient() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_OAUTH_REDIRECT_URL;
  if (!id || !secret || !redirect) {
    throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URL");
  }
  return new OAuth2Client(id, secret, redirect);
}

export function authUrl(userId: string) {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: SCOPES,
    state: userId,
  });
}

export async function exchangeCode(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function persistTokensForUser(userId: string, tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  id_token?: string | null;
  scope?: string | null;
}) {
  if (!tokens.access_token) throw new Error("No access_token in Google response");
  const admin = supabaseService();
  // Get sub from id_token if present (else fall back to a deterministic placeholder).
  let googleSub = "";
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64").toString());
      googleSub = payload.sub ?? "";
    } catch {
      /* ignore */
    }
  }
  await admin.from("google_accounts").upsert(
    {
      user_id: userId,
      google_sub: googleSub || userId,
      access_token: tokens.access_token,
      // refresh_token only comes back on the *first* consent with access_type=offline + prompt=consent.
      // Preserve any existing refresh_token by leaving it untouched when not present.
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      scopes: (tokens.scope ?? SCOPES.join(" ")).split(/\s+/),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

/**
 * Load a user's google credentials and return an authenticated calendar client.
 * Refreshes the access token automatically when needed.
 */
export async function calendarClientForUser(userId: string) {
  const admin = supabaseService();
  const { data: row, error } = await admin
    .from("google_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<import("@/types/database").GoogleAccount>();
  if (error) throw error;
  if (!row) throw new Error("Google not connected");

  const client = oauthClient();
  client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.token_expiry ? new Date(row.token_expiry).getTime() : undefined,
    scope: (row.scopes ?? []).join(" "),
  });

  client.on("tokens", (tokens) => {
    // googleapis fires this when a refresh happens; persist the new access token.
    if (tokens.access_token) {
      void admin
        .from("google_accounts")
        .update({
          access_token: tokens.access_token,
          token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  });

  return {
    calendar: google.calendar({ version: "v3", auth: client }),
    client,
  };
}

export type CalEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  busy: boolean;
  isLifeDrive: boolean;
  itemId: string | null;
};

export async function listEvents(
  userId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalEvent[]> {
  const { calendar } = await calendarClientForUser(userId);
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });
  const events = res.data.items ?? [];
  return events
    .filter((e) => e.status !== "cancelled")
    .map<CalEvent>((e) => {
      const start = e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00` : "");
      const end = e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00` : "");
      const tag = e.extendedProperties?.private?.[EVENT_TAG_KEY];
      const itemId = e.extendedProperties?.private?.itemId ?? null;
      return {
        id: e.id ?? "",
        summary: e.summary ?? "(busy)",
        start,
        end,
        busy: (e.transparency ?? "opaque") === "opaque",
        isLifeDrive: tag === "true",
        itemId,
      };
    });
}

export async function createEvent(
  userId: string,
  payload: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    itemId: string;
  },
): Promise<calendar_v3.Schema$Event> {
  const { calendar } = await calendarClientForUser(userId);
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: payload.summary,
      description: payload.description,
      start: { dateTime: payload.start.toISOString() },
      end: { dateTime: payload.end.toISOString() },
      colorId: "9", // blue/violet vibe
      extendedProperties: {
        private: { [EVENT_TAG_KEY]: "true", itemId: payload.itemId },
      },
    },
  });
  return res.data;
}

export async function updateEvent(
  userId: string,
  eventId: string,
  patch: { summary?: string; start?: Date; end?: Date },
) {
  const { calendar } = await calendarClientForUser(userId);
  const body: calendar_v3.Schema$Event = {};
  if (patch.summary) body.summary = patch.summary;
  if (patch.start) body.start = { dateTime: patch.start.toISOString() };
  if (patch.end) body.end = { dateTime: patch.end.toISOString() };
  const res = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: body,
  });
  return res.data;
}

export async function deleteEvent(userId: string, eventId: string) {
  const { calendar } = await calendarClientForUser(userId);
  await calendar.events.delete({ calendarId: "primary", eventId });
}

/** Compute free intervals in [start..end] within [working.start..working.end] per day. */
export function freeSlotsInDay(opts: {
  dayStart: Date;
  dayEnd: Date;
  busy: { start: Date; end: Date }[];
}): { start: Date; end: Date }[] {
  const sorted = [...opts.busy]
    .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const free: { start: Date; end: Date }[] = [];
  let cursor = new Date(opts.dayStart);
  for (const b of sorted) {
    if (b.end <= cursor) continue;
    if (b.start >= opts.dayEnd) break;
    if (b.start > cursor) free.push({ start: new Date(cursor), end: new Date(b.start) });
    if (b.end > cursor) cursor = new Date(b.end);
  }
  if (cursor < opts.dayEnd) free.push({ start: new Date(cursor), end: new Date(opts.dayEnd) });
  return free.filter((s) => s.end.getTime() - s.start.getTime() >= 10 * 60 * 1000);
}
