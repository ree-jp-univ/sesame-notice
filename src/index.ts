import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { webhookRoute } from "./routes/webhook";
import { apiRoute } from "./routes/api";
import { lineWebhookRoute } from "./routes/lineWebhook";
import { pollHistory } from "./poller";
import { setupHtml } from "./setupHtml";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.route("/webhook", webhookRoute);
app.route("/api", apiRoute);
app.route("/line/webhook", lineWebhookRoute);

app.get("/", (c) => c.redirect("/setup"));
app.get("/setup", (c) => c.html(setupHtml));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await pollHistory(env);
  },
};
