import type { HistoryEntry } from "./types";

const WS_URL =
  "https://82q6nuplv0.execute-api.ap-northeast-1.amazonaws.com/production";

const TIMEOUT_MS = 15_000;

export type BizWebSocketResult = {
  entries: HistoryEntry[];
  rawMessages: unknown[];
};

export async function fetchHistoryViaBizWebSocket(
  bizToken: string,
  deviceUUID: string
): Promise<BizWebSocketResult> {
  const url = `${WS_URL}?token=${encodeURIComponent(bizToken)}&lang=ja`;
  const resp = await fetch(url, { headers: { Upgrade: "websocket" } });
  const ws = (resp as unknown as { webSocket: WebSocket | null }).webSocket;
  if (!ws) throw new Error("WebSocket upgrade failed");
  ws.accept();

  const rawMessages: unknown[] = [];

  return new Promise<BizWebSocketResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`Biz WebSocket timeout. messages: ${JSON.stringify(rawMessages)}`));
    }, TIMEOUT_MS);

    let historyRequested = false;

    ws.addEventListener("message", (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      rawMessages.push(msg);

      if (msg.action === "biz3KeepAlive" && !historyRequested) {
        historyRequested = true;
        ws.send(JSON.stringify({
          action: "biz3GetDeviceHistory",
          list: [{ deviceUUID, lastKey: null }],
          pageSize: null,
          op: "getHistory",
        }));
        return;
      }

      if (msg.action === "biz3GetDeviceHistory") {
        clearTimeout(timer);
        ws.close();

        if (!msg.success) {
          reject(new Error(`biz3GetDeviceHistory failed: code=${msg.code} msg=${msg.message}. raw: ${JSON.stringify(rawMessages)}`));
          return;
        }

        const raw = (msg.data as BizHistoryItem[] | undefined) ?? [];
        const entries: HistoryEntry[] = raw.map((item) => ({
          recordID: item.record_id ?? 0,
          type: item.type,
          timeStamp: item.timestamp ?? 0,
          historyTag: item.history_tag,
        }));
        resolve({ entries, rawMessages });
      }
    });

    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error(`WS error. messages: ${JSON.stringify(rawMessages)}`));
    });

    ws.addEventListener("close", () => {
      clearTimeout(timer);
      reject(new Error(`WS closed unexpectedly. messages: ${JSON.stringify(rawMessages)}`));
    });

    ws.send(JSON.stringify({ action: "biz3KeepAlive" }));
  });
}

interface BizHistoryItem {
  record_id?: number;
  device_id?: string;
  type: number;
  timestamp?: number;
  history_tag?: string;
  parameter?: string;
}

// Generic single-action helper for debug endpoints
export async function bizRequest(
  bizToken: string,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<unknown> {
  const url = `${WS_URL}?token=${encodeURIComponent(bizToken)}&lang=ja`;
  const resp = await fetch(url, { headers: { Upgrade: "websocket" } });
  const ws = (resp as unknown as { webSocket: WebSocket | null }).webSocket;
  if (!ws) throw new Error("WebSocket upgrade failed");
  ws.accept();
  const messages: unknown[] = [];

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`timeout. messages: ${JSON.stringify(messages)}`));
    }, TIMEOUT_MS);

    let ready = false;
    ws.addEventListener("message", (event: MessageEvent) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(event.data as string); } catch { return; }
      messages.push(msg);

      if (msg.action === "biz3KeepAlive" && !ready) {
        ready = true;
        ws.send(JSON.stringify({ action, ...payload }));
        return;
      }
      if (msg.action === action) {
        clearTimeout(timer);
        ws.close();
        resolve(msg);
      }
    });
    ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("WS error")); });
    ws.addEventListener("close", () => { clearTimeout(timer); reject(new Error(`WS closed. messages: ${JSON.stringify(messages)}`)); });
    ws.send(JSON.stringify({ action: "biz3KeepAlive" }));
  });
}
