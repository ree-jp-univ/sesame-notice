import { Hono } from "hono";
import type { Env } from "../types";
import { getSettings, updateSettings } from "../db";

export const lineWebhookRoute = new Hono<{ Bindings: Env }>();

type LineEvent = {
  type: string;
  source?: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
};

type LineWebhookBody = {
  events: LineEvent[];
};

async function verifyLineSignature(
  secret: string,
  body: string,
  signature: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signature;
}

lineWebhookRoute.post("/", async (c) => {
  const settings = await getSettings(c.env.DB);
  const rawBody = await c.req.text();

  if (settings.line_channel_secret) {
    const signature = c.req.header("x-line-signature") ?? "";
    const valid = await verifyLineSignature(
      settings.line_channel_secret,
      rawBody,
      signature
    );
    if (!valid) {
      return c.text("invalid signature", 401);
    }
  }

  const body: LineWebhookBody = JSON.parse(rawBody);

  for (const event of body.events) {
    const source = event.source;
    if (!source) continue;

    if (
      (event.type === "follow" || event.type === "message") &&
      source.type === "user" &&
      source.userId &&
      !settings.line_target_id
    ) {
      await updateSettings(c.env.DB, {
        line_target_id: source.userId,
        line_target_type: "user",
      });
      break;
    }

    if (
      (event.type === "join" || event.type === "message") &&
      source.type === "group" &&
      source.groupId
    ) {
      await updateSettings(c.env.DB, {
        line_target_id: source.groupId,
        line_target_type: "group",
      });
      break;
    }
  }

  return c.json({ ok: true });
});
