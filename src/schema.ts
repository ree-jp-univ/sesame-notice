import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique().notNull(),
  password_hash: text("password_hash").notNull(),
  created_at: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  user_id: text("user_id").primaryKey(),
  device_uuid: text("device_uuid"),
  line_token: text("line_token"),
  line_channel_secret: text("line_channel_secret"),
  line_target_id: text("line_target_id"),
  line_target_type: text("line_target_type", { enum: ["user", "group"] }),
  discord_webhook_url: text("discord_webhook_url"),
  last_state: text("last_state", { enum: ["locked", "unlocked"] }),
  last_timestamp: integer("last_timestamp"),
  updated_at: text("updated_at"),
  biz_jwt_token: text("biz_jwt_token"),
  last_login_at: text("last_login_at"),
  last_warning_sent_at: text("last_warning_sent_at"),
});

export type User = typeof users.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type SettingsPatch = Partial<Omit<typeof settings.$inferInsert, "user_id">>;
