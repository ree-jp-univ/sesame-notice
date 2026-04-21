# Sesame Notice

CANDY HOUSE の Sesame スマートロックが開閉したとき、**LINE** と **Discord** にリアルタイム通知を送るサービスです。

Cloudflare Workers + D1 で動くため、サーバー不要・常時無料枠で運用できます。

```
鍵が開閉
  ↓ Sesame Webhook
Cloudflare Worker
  ├─ 🔒 鍵が閉まりました (2026-04-21 09:00 JST) → LINE
  └─ 🔓 鍵が開きました  (2026-04-21 09:00 JST) → Discord
```

---

## 必要なもの

| サービス | 用途 | 無料枠 |
|---|---|---|
| [Cloudflare](https://dash.cloudflare.com/) アカウント | Workers + D1 のホスティング | 十分 |
| Sesame スマートロック | 通知元デバイス | — |
| LINE Developers チャンネル | LINE 通知（任意） | あり |
| Discord サーバー | Discord 通知（任意） | あり |

LINE・Discord はどちらか一方だけでも動作します。

---

## セットアップ

### 1. リポジトリをクローンして依存関係をインストール

```bash
git clone <このリポジトリ>
cd sesame-notice
npm install
```

### 2. Cloudflare にログイン

```bash
npx wrangler login
```

### 3. D1 データベースを作成

```bash
npm run db:create
```

出力に `database_id` が表示されるので、`wrangler.toml` に貼り付けます。

```toml
[[d1_databases]]
binding = "DB"
database_name = "sesame-notice"
database_id = "ここに貼り付ける"   # ← 追記
```

### 4. データベースを初期化

```bash
# 本番用（Cloudflare 上のリモート D1）
npm run db:migrate

# ローカル開発用（wrangler dev で使う場合）
npm run db:migrate:local
```

### 5. デプロイ

```bash
npm run deploy
```

デプロイ後に表示される URL（例: `https://sesame-notice.yourname.workers.dev`）をメモしておきます。

---

## 初期設定（Web UI）

デプロイした URL の `/setup` をブラウザで開きます。

```
https://sesame-notice.yourname.workers.dev/setup
```

### Step 1 — Sesame

1. [CANDY HOUSE Dashboard](https://my.candyhouse.co) → **API Settings** → API キーを発行
2. セットアップ画面に API キーを入力し「デバイス一覧を取得」をクリック
3. 表示されたデバイスの中から通知対象を選択

### Step 2 — LINE（任意）

#### LINE Developers でチャンネルを作成する

1. [LINE Developers Console](https://developers.line.biz/console/) でプロバイダーを作成
2. 「Messaging API」チャンネルを作成
3. **Channel Secret**（基本設定）と **Channel Access Token**（Messaging API設定 → 発行）を取得
4. セットアップ画面に両方を入力

#### 通知先を設定する

**個人（1:1）の場合**
- LINE アプリでボットを**友達追加**してからメッセージを送る
- セットアップ画面で「待機開始」→ 自動でユーザー ID を取得

**グループの場合**
- LINE グループにボットを**招待**する
- セットアップ画面で「グループ」を選択して「待機開始」→ 自動でグループ ID を取得

#### Webhook URL を LINE に登録する

LINE Developers Console → Messaging API設定 → Webhook URL に以下を入力して「検証」:

```
https://sesame-notice.yourname.workers.dev/line/webhook
```

### Step 3 — Discord（任意）

1. 通知先の Discord チャンネルを開く
2. チャンネル設定 → **連携サービス** → **ウェブフック** → 新しいウェブフック
3. Webhook URL をコピーしてセットアップ画面に貼り付け

### Step 4 — 保存して Sesame Webhook を登録

1. 「設定を保存」をクリック
2. 「テスト通知を送る」で LINE・Discord に届くか確認
3. 画面下部に表示される Webhook URL をコピー:
   ```
   https://sesame-notice.yourname.workers.dev/webhook?device_id={device_id}&state={state}
   ```
4. Sesame アプリ → デバイス → 右上メニュー → **Web API** → **Webhook URL** に貼り付け

これで設定完了です。鍵を操作して通知が届けば成功です。

---

## ローカル開発

```bash
npm run dev
# → http://localhost:8787/setup
```

ローカルで動作確認する場合は Sesame Webhook の代わりに curl でテストできます。

```bash
# 施錠の通知をシミュレート
curl "http://localhost:8787/webhook?device_id=test&state=locked"

# 開錠の通知をシミュレート
curl "http://localhost:8787/webhook?device_id=test&state=unlocked"
```

---

## エンドポイント一覧

| エンドポイント | 説明 |
|---|---|
| `GET /setup` | セットアップ Web UI |
| `GET /webhook?device_id=...&state=locked\|unlocked` | Sesame Webhook 受信口 |
| `POST /line/webhook` | LINE Messaging API Webhook（userId/groupId 自動取得） |
| `GET /api/config` | 現在の設定を確認 |
| `POST /api/config` | 設定を保存 |
| `GET /api/sesame/devices` | Sesame デバイス一覧を取得 |
| `POST /api/test` | テスト通知を送信 |
