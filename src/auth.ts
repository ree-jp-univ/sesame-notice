import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { Env } from "./types";

const COOKIE_NAME = "session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30日

function toBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  return Uint8Array.from(
    atob(s.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

// --- Password hashing (PBKDF2) ---

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `${toHex(salt)}:${toHex(new Uint8Array(hash))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(hash)) === hashHex;
}

// --- Session token (HMAC-SHA256) ---
// Format: "{userId}:{timestamp}.{base64url(HMAC(userId:timestamp, SERVER_SECRET))}"

async function hmacKey(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

export async function signToken(userId: string, secret: string): Promise<string> {
  const ts = String(Date.now());
  const data = `${userId}:${ts}`;
  const key = await hmacKey(secret, "sign");
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${toBase64Url(sig)}`;
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<{ userId: string } | null> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const data = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);

  const colonIdx = data.indexOf(":");
  if (colonIdx === -1) return null;
  const userId = data.slice(0, colonIdx);
  const ts = data.slice(colonIdx + 1);

  if (!userId || !ts) return null;
  const tsNum = Number(ts);
  if (isNaN(tsNum) || Date.now() - tsNum > MAX_AGE_SEC * 1000) return null;

  const key = await hmacKey(secret, "verify");
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sig),
      new TextEncoder().encode(data)
    );
    if (!valid) return null;
  } catch {
    return null;
  }

  return { userId };
}

// --- Cookie headers ---

export function sessionCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SEC}; Path=/`;
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}

// --- Webhook token (SHA-256 of userId:SERVER_SECRET, first 16 hex chars) ---

export async function deriveWebhookToken(userId: string, secret: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${userId}:${secret}`)
  );
  return toHex(new Uint8Array(hash)).slice(0, 16);
}

// --- Auth middleware ---

export type Variables = { userId: string };

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const secret = c.env.SERVER_SECRET;
  if (!secret) {
    return c.text(
      "SERVER_SECRET が未設定です。`wrangler secret put SERVER_SECRET` で設定してください。",
      500
    );
  }

  const token = getCookie(c, COOKIE_NAME);
  const result = token ? await verifyToken(token, secret) : null;

  if (!result) {
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.redirect("/login");
  }

  c.set("userId", result.userId);
  await next();
});
