import { Hono } from "hono";
import type { Env } from "../types";
import { getSettings, updateSettings } from "../db";
import { notifyDiscord } from "../notifiers/discord";
import { notifyLine } from "../notifiers/line";
import { deriveWebhookToken } from "../auth";

export const webhookRoute = new Hono<{ Bindings: Env }>();

const LOGIN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function buildMessage(state: "locked" | "unlocked"): string {
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  return state === "locked"
    ? `🔒 鍵が閉まりました (${now})`
    : `🔓 鍵が開きました (${now})`;
}

// Sesame sends: GET /webhook/:userId?token=<token>&state=locked|unlocked
webhookRoute.get("/:userId", async (c) => {
  const userId = c.req.param("userId");

  const expectedToken = await deriveWebhookToken(userId, c.env.SERVER_SECRET);
  if (c.req.query("token") !== expectedToken) {
    return c.text("forbidden", 403);
  }

  const settings = await getSettings(c.env.DB, userId);

  if (settings.last_login_at) {
    const age = Date.now() - new Date(settings.last_login_at).getTime();
    if (age > LOGIN_EXPIRY_MS) return c.text("paused", 200);
  }

  const state = c.req.query("state") as "locked" | "unlocked" | undefined;
  if (state !== "locked" && state !== "unlocked") {
    return c.text("invalid state", 400);
  }

  if (settings.last_state === state) {
    return c.text("no change", 200);
  }

  await updateSettings(c.env.DB, userId, { last_state: state });

  const message = buildMessage(state);
  const results = await Promise.allSettled([
    settings.discord_webhook_url
      ? notifyDiscord(settings.discord_webhook_url, message)
      : Promise.resolve(),
    settings.line_token && settings.line_target_id
      ? notifyLine(settings.line_token, settings.line_target_id, message)
      : Promise.resolve(),
  ]);

  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => (r as PromiseRejectedResult).reason);

  if (errors.length > 0) {
    console.error("Notification errors:", errors);
  }

  return c.text("ok", 200);
});
