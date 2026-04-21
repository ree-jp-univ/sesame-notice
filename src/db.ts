import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { settings, users, type User, type Settings, type SettingsPatch } from "./schema";

function db(d1: D1Database) {
  return drizzle(d1);
}

function fallback(userId: string): Settings {
  return {
    user_id: userId,
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
    last_login_at: null,
    last_warning_sent_at: null,
  };
}

export async function getUserByUsername(d1: D1Database, username: string): Promise<User | null> {
  return (
    (await db(d1).select().from(users).where(eq(users.username, username)).get()) ?? null
  );
}

export async function getUserById(d1: D1Database, id: string): Promise<User | null> {
  return (await db(d1).select().from(users).where(eq(users.id, id)).get()) ?? null;
}

export async function createUser(
  d1: D1Database,
  user: { id: string; username: string; password_hash: string }
): Promise<void> {
  await db(d1).insert(users).values({ ...user, created_at: new Date().toISOString() });
}

export async function getSettings(d1: D1Database, userId: string): Promise<Settings> {
  const row = await db(d1)
    .select()
    .from(settings)
    .where(eq(settings.user_id, userId))
    .get();
  return row ?? fallback(userId);
}

export async function updateSettings(
  d1: D1Database,
  userId: string,
  patch: SettingsPatch
): Promise<void> {
  await db(d1)
    .update(settings)
    .set({ ...patch, updated_at: new Date().toISOString() })
    .where(eq(settings.user_id, userId));
}

export async function ensureSettings(d1: D1Database, userId: string): Promise<void> {
  const existing = await db(d1)
    .select()
    .from(settings)
    .where(eq(settings.user_id, userId))
    .get();
  if (!existing) {
    await db(d1).insert(settings).values({ user_id: userId });
  }
}

export async function getAllSettings(d1: D1Database): Promise<Settings[]> {
  return db(d1).select().from(settings).all();
}
