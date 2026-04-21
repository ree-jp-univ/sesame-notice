import { Hono } from "hono";
import type { Env } from "../types";
import type { Settings } from "../schema";
import { getSettings, updateSettings } from "../db";
import { notifyDiscord } from "../notifiers/discord";
import { notifyLine } from "../notifiers/line";

export const apiRoute = new Hono<{ Bindings: Env }>();

// GET /api/config — return current settings (omit secrets partially for UI)
apiRoute.get("/config", async (c) => {
  const s = await getSettings(c.env.DB);
  return c.json({
    sesame_api_key: s.sesame_api_key ? "****" : null,
    device_uuid: s.device_uuid,
    line_token: s.line_token ? "****" : null,
    line_channel_secret: s.line_channel_secret ? "****" : null,
    line_target_id: s.line_target_id,
    line_target_type: s.line_target_type,
    discord_webhook_url: s.discord_webhook_url,
    last_state: s.last_state,
  });
});

// POST /api/config — save settings
apiRoute.post("/config", async (c) => {
  const body = await c.req.json<Partial<Settings>>();

  const allowed: (keyof Settings)[] = [
    "sesame_api_key",
    "device_uuid",
    "line_token",
    "line_channel_secret",
    "discord_webhook_url",
  ];

  const patch: Partial<Settings> = {};
  for (const key of allowed) {
    if (key in body && body[key] !== undefined) {
      (patch as Record<string, unknown>)[key] = body[key];
    }
  }

  await updateSettings(c.env.DB, patch);
  return c.json({ ok: true });
});

// GET /api/sesame/devices — proxy Sesame API to list devices
apiRoute.get("/sesame/devices", async (c) => {
  const s = await getSettings(c.env.DB);
  if (!s.sesame_api_key) {
    return c.json({ error: "Sesame API key not configured" }, 400);
  }

  const res = await fetch("https://app.candyhouse.co/api/sesame2", {
    headers: { "x-api-key": s.sesame_api_key },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Sesame API error: ${res.status}`, body); 
    return c.json(
      { error: `Sesame API error: ${res.status}`, detail: body },
      502
    );
  }

  const data = await res.json();
  return c.json(data);
});

// POST /api/test — send a test notification
apiRoute.post("/test", async (c) => {
  const s = await getSettings(c.env.DB);
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
