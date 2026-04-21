import type { Env, HistoryEntry, LockState } from "./types";
import { LOCK_TYPES, UNLOCK_TYPES } from "./types";
import { getAllSettings, updateSettings } from "./db";
import { notifyDiscord } from "./notifiers/discord";
import { notifyLine } from "./notifiers/line";
import { fetchHistoryViaBizWebSocket } from "./bizWebSocket";
import type { Settings } from "./schema";

const LOGIN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

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

async function sendNotifications(settings: Settings, message: string): Promise<void> {
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
  userId: string;
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

async function pollHistoryForUser(env: Env, userSettings: Settings): Promise<PollDebug> {
  const debug: PollDebug = { userId: userSettings.user_id, method: null };

  // Login expiry check (only enforce if user has logged in at least once)
  if (userSettings.last_login_at) {
    const loginAge = Date.now() - new Date(userSettings.last_login_at).getTime();
    if (loginAge > LOGIN_EXPIRY_MS) {
      if (!userSettings.last_warning_sent_at) {
        const msg =
          "⚠️ 30日以上ログインがないため通知を停止しています。管理画面にアクセスしてログインすると再開します。";
        await sendNotifications(userSettings, msg);
        await updateSettings(env.DB, userSettings.user_id, {
          last_warning_sent_at: new Date().toISOString(),
        });
      }
      debug.skipped = "login expired";
      return debug;
    }
  }

  if (!userSettings.device_uuid) {
    debug.skipped = "device_uuid not configured";
    return debug;
  }

  if (!userSettings.biz_jwt_token) {
    debug.skipped = "biz_jwt_token not configured";
    return debug;
  }

  debug.method = "biz_websocket";
  let entries: HistoryEntry[];

  try {
    const result = await fetchHistoryViaBizWebSocket(
      userSettings.biz_jwt_token,
      userSettings.device_uuid
    );
    entries = result.entries;
    debug.rawMessages = result.rawMessages;
  } catch (err) {
    debug.error = String(err);
    console.error(`Biz WebSocket failed for user ${userSettings.user_id}:`, err);

    if (!userSettings.last_warning_sent_at) {
      const msg =
        "⚠️ 鍵の履歴取得に失敗しました。Biz JWT Token が無効または期限切れの可能性があります。管理画面で設定を確認してください。";
      await sendNotifications(userSettings, msg);
      await updateSettings(env.DB, userSettings.user_id, {
        last_warning_sent_at: new Date().toISOString(),
      });
    }
    return debug;
  }

  debug.entriesFetched = entries.length;
  if (!entries.length) return debug;

  const lastTs = userSettings.last_timestamp ?? 0;
  debug.lastTimestamp = lastTs;

  if (lastTs === 0) {
    const latest = Math.max(...entries.map((e) => e.timeStamp));
    await updateSettings(env.DB, userSettings.user_id, { last_timestamp: latest });
    debug.firstRun = true;
    console.log(`First poll for user ${userSettings.user_id}: initialized last_timestamp to`, latest);
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
      await sendNotifications(userSettings, buildMessage(state, entry.timeStamp));
      console.log(`Notified user ${userSettings.user_id}: ${state} (type=${entry.type}, ts=${entry.timeStamp})`);
      notified++;
    }
  }
  debug.notified = notified;

  const latestTs = Math.max(...newEntries.map((e) => e.timeStamp));
  await updateSettings(env.DB, userSettings.user_id, { last_timestamp: latestTs });

  return debug;
}

export async function pollHistory(env: Env): Promise<PollDebug[]> {
  const allSettings = await getAllSettings(env.DB);
  return Promise.all(allSettings.map((s) => pollHistoryForUser(env, s)));
}
