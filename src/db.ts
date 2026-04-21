import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { settings, type Settings, type SettingsPatch } from "./schema";

function db(d1: D1Database) {
  return drizzle(d1);
}

const fallback: Settings = {
  id: 1,
  device_uuid: null,
  line_token: null,
  line_channel_secret: null,
  line_target_id: null,
  line_target_type: null,
  discord_webhook_url: null,
  last_state: null,
  last_timestamp: null,
  updated_at: null,
  biz_jwt_token: null,
};

export async function getSettings(d1: D1Database): Promise<Settings> {
  const row = await db(d1)
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .get();
  return row ?? fallback;
}

export async function updateSettings(
  d1: D1Database,
  patch: SettingsPatch
): Promise<void> {
  await db(d1)
    .update(settings)
    .set({ ...patch, updated_at: new Date().toISOString() })
    .where(eq(settings.id, 1));
}
