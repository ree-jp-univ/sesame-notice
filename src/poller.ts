import type { Env, HistoryEntry, LockState } from "./types";
import { LOCK_TYPES, UNLOCK_TYPES } from "./types";
import { getSettings, updateSettings } from "./db";
import { notifyDiscord } from "./notifiers/discord";
import { notifyLine } from "./notifiers/line";
import { fetchHistoryViaBizWebSocket } from "./bizWebSocket";

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

export type PollDebug = {
  method: "biz_websocket" | null;
  error?: string;
  skipped?: string;
  entriesFetched?: number;
  lastTimestamp?: number;
  newEntries?: Array<{ type: number; timeStamp: number; state: LockState | null }>;
  notified?: number;
  firstRun?: boolean;
  rawMessages?: unknown[];
};

export async function pollHistory(env: Env): Promise<PollDebug> {
  const settings = await getSettings(env.DB);
  const debug: PollDebug = { method: null };

  if (!settings.device_uuid) {
    debug.skipped = "device_uuid not configured";
    console.log(debug.skipped);
    return debug;
  }

  let entries: HistoryEntry[];

  if (!settings.biz_jwt_token) {
    debug.skipped = "biz_jwt_token not configured";
    console.log(debug.skipped);
    return debug;
  }

  debug.method = "biz_websocket";
  try {
    const result = await fetchHistoryViaBizWebSocket(
      settings.biz_jwt_token,
      settings.device_uuid
    );
    entries = result.entries;
    debug.rawMessages = result.rawMessages;
  } catch (err) {
    debug.error = String(err);
    console.error("Biz WebSocket failed:", err);
    return debug;
  }

  debug.entriesFetched = entries.length;
  if (!entries.length) return debug;

  const lastTs = settings.last_timestamp ?? 0;
  debug.lastTimestamp = lastTs;

  if (lastTs === 0) {
    const latest = Math.max(...entries.map((e) => e.timeStamp));
    await updateSettings(env.DB, { last_timestamp: latest });
    debug.firstRun = true;
    console.log("First poll: initialized last_timestamp to", latest);
    return debug;
  }

  const newEntries = entries
    .filter((e) => e.timeStamp > lastTs)
    .sort((a, b) => a.timeStamp - b.timeStamp);

  debug.newEntries = newEntries.map((e) => ({
    type: e.type,
    timeStamp: e.timeStamp,
    state: stateFromType(e.type),
  }));

  if (!newEntries.length) return debug;

  let notified = 0;
  for (const entry of newEntries) {
    const state = stateFromType(entry.type);
    if (state) {
      await sendNotifications(settings, buildMessage(state, entry.timeStamp));
      console.log(`Notified: ${state} (type=${entry.type}, ts=${entry.timeStamp})`);
      notified++;
    }
  }
  debug.notified = notified;

  const latestTs = Math.max(...newEntries.map((e) => e.timeStamp));
  await updateSettings(env.DB, { last_timestamp: latestTs });

  return debug;
}
