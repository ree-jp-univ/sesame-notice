export type Env = {
  DB: D1Database;
};

export type LockState = "locked" | "unlocked";

export type HistoryEntry = {
  recordID: number;
  type: number;
  timeStamp: number;
  historyTag?: string;
  parameter?: string;
};

// Ref: https://mseeeen.msen.jp/gas-sesame-lock-history-to-google-spreadsheet/
export const LOCK_TYPES = new Set([1, 6, 7, 10, 13, 14, 16]);
export const UNLOCK_TYPES = new Set([2, 3, 8, 9, 11, 15, 17]);
