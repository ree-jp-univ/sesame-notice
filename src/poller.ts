import type { Env, HistoryEntry, LockState } from "./types";
import { LOCK_TYPES, UNLOCK_TYPES } from "./types";
import { getSettings, updateSettings } from "./db";
import { notifyDiscord } from "./notifiers/discord";
import { notifyLine } from "./notifiers/line";

function stateFromType(type: number): LockState | null {
  if (LOCK_TYPES.has(type)) return "locked";
  if (UNLOCK_TYPES.has(type)) return "unlocked";
  return null;
}

function buildMessage(state: LockState, timestampMs: number): string {
  const time = new Date(timestampMs).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });
  return state === "locked"
    ? `🔒 鍵が閉まりました (${time})`
    : `🔓 鍵が開きました (${time})`;
}

async function sendNotifications(
  settings: Awaited<ReturnType<typeof getSettings>>,
  message: string
): Promise<void> {
  await Promise.allSettled([
    settings.discord_webhook_url
      ? notifyDiscord(settings.discord_webhook_url, message)
      : Promise.resolve(),
    settings.line_token && settings.line_target_id
      ? notifyLine(settings.line_token, settings.line_target_id, message)
      : Promise.resolve(),
  ]);
}

export async function pollHistory(env: Env): Promise<void> {
  const settings = await getSettings(env.DB);

  if (!settings.sesame_api_key || !settings.device_uuid) {
    console.log("Sesame not configured, skipping poll");
    return;
  }

  const res = await fetch(
    `https://app.candyhouse.co/api/sesame2/${settings.device_uuid}/history?page=0&lg=10`,
    { headers: { "x-api-key": settings.sesame_api_key } }
  );

  if (!res.ok) {
    console.error(`History API error: ${res.status}`, await res.text());
    return;
  }

  const entries: HistoryEntry[] = await res.json();
  if (!entries.length) return;

  const lastTs = settings.last_timestamp ?? 0;

  // First run: just save current timestamp, don't notify
  if (lastTs === 0) {
    const latest = Math.max(...entries.map((e) => e.timeStamp));
    await updateSettings(env.DB, { last_timestamp: latest });
    console.log("First poll: initialized last_timestamp to", latest);
    return;
  }

  // Find new entries (newer than last processed, sorted oldest→newest)
  const newEntries = entries
    .filter((e) => e.timeStamp > lastTs)
    .sort((a, b) => a.timeStamp - b.timeStamp);

  if (!newEntries.length) return;

  for (const entry of newEntries) {
    const state = stateFromType(entry.type);
    if (state) {
      await sendNotifications(settings, buildMessage(state, entry.timeStamp));
      console.log(`Notified: ${state} (type=${entry.type}, ts=${entry.timeStamp})`);
    }
  }

  const latestTs = Math.max(...newEntries.map((e) => e.timeStamp));
  await updateSettings(env.DB, { last_timestamp: latestTs });
}
