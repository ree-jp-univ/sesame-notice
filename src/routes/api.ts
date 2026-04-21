import { Hono } from "hono";
import type { Env } from "../types";
import type { SettingsPatch } from "../schema";
import { getSettings, updateSettings } from "../db";
import { notifyDiscord } from "../notifiers/discord";
import { notifyLine } from "../notifiers/line";
import { bizRequest } from "../bizWebSocket";
import { deriveWebhookToken } from "../auth";
import type { Variables } from "../auth";

export const apiRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

apiRoute.get("/config", async (c) => {
  const s = await getSettings(c.env.DB, c.get("userId"));
  return c.json({
    device_uuid: s.device_uuid,
    line_token: s.line_token ? "****" : null,
    line_channel_secret: s.line_channel_secret ? "****" : null,
    line_target_id: s.line_target_id,
    line_target_type: s.line_target_type,
    discord_webhook_url: s.discord_webhook_url,
    last_state: s.last_state,
    biz_jwt_token: s.biz_jwt_token ? s.biz_jwt_token.slice(0, 20) + "..." : null,
  });
});

apiRoute.post("/config", async (c) => {
  const body = await c.req.json<Partial<SettingsPatch>>();

  const allowed: (keyof SettingsPatch)[] = [
    "device_uuid",
    "line_token",
    "line_channel_secret",
    "discord_webhook_url",
    "biz_jwt_token",
  ];

  const patch: SettingsPatch = {};
  for (const key of allowed) {
    if (key in body && body[key] !== undefined) {
      (patch as Record<string, unknown>)[key] = body[key];
    }
  }

  await updateSettings(c.env.DB, c.get("userId"), patch);
  return c.json({ ok: true });
});

apiRoute.get("/biz/devices", async (c) => {
  const s = await getSettings(c.env.DB, c.get("userId"));
  if (!s.biz_jwt_token) {
    return c.json({ error: "biz_jwt_token not configured" }, 400);
  }
  const result = await bizRequest(s.biz_jwt_token, "biz3ManageDevice");
  return c.json(result);
});

apiRoute.post("/test", async (c) => {
  const s = await getSettings(c.env.DB, c.get("userId"));
  const message = "🔔 テスト通知: Sesame Notice が正常に設定されました！";

  const results = await Promise.allSettled([
    s.discord_webhook_url
      ? notifyDiscord(s.discord_webhook_url, message)
      : Promise.resolve(),
    s.line_token && s.line_target_id
      ? notifyLine(s.line_token, s.line_target_id, message)
      : Promise.resolve(),
  ]);

  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason?.toString());

  return c.json({ ok: errors.length === 0, errors });
});

apiRoute.get("/webhook-url", async (c) => {
  const userId = c.get("userId");
  const token = await deriveWebhookToken(userId, c.env.SERVER_SECRET);
  const origin = new URL(c.req.url).origin;
  return c.json({
    sesame_url: `${origin}/webhook/${userId}?token=${token}`,
    line_url: `${origin}/line/webhook/${userId}`,
  });
});
