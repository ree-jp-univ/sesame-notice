import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import {
  authMiddleware,
  signToken,
  sessionCookieHeader,
  clearCookieHeader,
  hashPassword,
  verifyPassword,
} from "./auth";
import type { Variables } from "./auth";
import { loginHtml } from "./loginHtml";
import { registerHtml } from "./registerHtml";
import { webhookRoute } from "./routes/webhook";
import { apiRoute } from "./routes/api";
import { lineWebhookRoute } from "./routes/lineWebhook";
import { pollHistory } from "./poller";
import { setupHtml } from "./setupHtml";
import { getUserByUsername, createUser, ensureSettings, updateSettings } from "./db";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", cors());

// --- Public routes ---

app.get("/login", (c) => c.html(loginHtml(c.req.query("error") === "1")));

app.post("/login", async (c) => {
  const secret = c.env.SERVER_SECRET;
  if (!secret) return c.text("SERVER_SECRET not configured", 500);

  const form = await c.req.formData();
  const username = ((form.get("username") as string | null) ?? "").trim();
  const password = (form.get("password") as string | null) ?? "";

  const user = await getUserByUsername(c.env.DB, username);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.redirect("/login?error=1");
  }

  const token = await signToken(user.id, secret);
  await updateSettings(c.env.DB, user.id, {
    last_login_at: new Date().toISOString(),
    last_warning_sent_at: null,
  });

  return new Response(null, {
    status: 302,
    headers: { Location: "/setup", "Set-Cookie": sessionCookieHeader(token) },
  });
});

app.get("/logout", () =>
  new Response(null, {
    status: 302,
    headers: { Location: "/login", "Set-Cookie": clearCookieHeader() },
  })
);

app.get("/register", (c) => c.html(registerHtml()));

app.post("/register", async (c) => {
  const secret = c.env.SERVER_SECRET;
  if (!secret) return c.text("SERVER_SECRET not configured", 500);

  const form = await c.req.formData();
  const username = ((form.get("username") as string | null) ?? "").trim();
  const password = (form.get("password") as string | null) ?? "";
  const confirm = (form.get("confirm") as string | null) ?? "";

  if (username.length < 3 || username.length > 32) {
    return c.html(registerHtml("ユーザー名は3〜32文字で入力してください"));
  }
  if (password.length < 1) {
    return c.html(registerHtml("パスワードを入力してください"));
  }
  if (password !== confirm) {
    return c.html(registerHtml("パスワードが一致しません"));
  }

  const existing = await getUserByUsername(c.env.DB, username);
  if (existing) {
    return c.html(registerHtml("このユーザー名はすでに使用されています"));
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await createUser(c.env.DB, { id, username, password_hash: passwordHash });
  await ensureSettings(c.env.DB, id);

  const token = await signToken(id, secret);
  await updateSettings(c.env.DB, id, { last_login_at: new Date().toISOString() });

  return new Response(null, {
    status: 302,
    headers: { Location: "/setup", "Set-Cookie": sessionCookieHeader(token) },
  });
});

// Public webhook routes (auth handled internally)
app.route("/webhook", webhookRoute);
app.route("/line/webhook", lineWebhookRoute);

// --- Protected routes ---
app.use("/setup", authMiddleware);
app.use("/api/*", authMiddleware);

app.get("/", (c) => c.redirect("/setup"));
app.get("/setup", (c) => c.html(setupHtml));
app.route("/api", apiRoute);

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await pollHistory(env);
  },
};
