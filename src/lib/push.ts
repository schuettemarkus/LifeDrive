/**
 * Web Push helpers. Server-only — uses VAPID-signed messages to ping the
 * browser's push service, which then wakes the service worker and shows a
 * notification.
 *
 * Required env:
 *   NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY  (also given to the browser)
 *   WEB_PUSH_VAPID_PRIVATE_KEY             (server-only signing key)
 *   WEB_PUSH_CONTACT_EMAIL                 (mailto: required by VAPID)
 *
 * Generate with: npx web-push generate-vapid-keys
 */
import webpush from "web-push";
import { supabaseService } from "@/lib/supabase/server";
import type { PushSubscription as DbPushSubscription } from "@/types/database";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const contact = process.env.WEB_PUSH_CONTACT_EMAIL ?? "mailto:noreply@example.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys not configured (NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY + WEB_PUSH_VAPID_PRIVATE_KEY)");
  }
  webpush.setVapidDetails(contact, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

export async function sendToSubscription(sub: DbPushSubscription, payload: PushPayload) {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      JSON.stringify(payload),
      { TTL: 6 * 3600 },
    );
    return { ok: true } as const;
  } catch (err: any) {
    const status: number | undefined = err?.statusCode;
    // 404 / 410 mean the subscription is dead — clean up.
    if (status === 404 || status === 410) {
      const admin = supabaseService();
      await admin.from("push_subscriptions").delete().eq("id", sub.id);
      return { ok: false, gone: true, status } as const;
    }
    return { ok: false, gone: false, status, error: err?.message ?? "push_error" } as const;
  }
}

export async function sendToUser(userId: string, payload: PushPayload, kind: "morning_briefing" | "evening_review" | "ad_hoc" = "ad_hoc") {
  const admin = supabaseService();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  const subs = ((data ?? []) as DbPushSubscription[]).filter((s) => {
    if (kind === "morning_briefing") return s.morning_briefing;
    if (kind === "evening_review") return s.evening_review;
    return true;
  });
  const results = await Promise.all(subs.map((s) => sendToSubscription(s, payload)));
  return { sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length };
}
