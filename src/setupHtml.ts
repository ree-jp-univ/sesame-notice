export const setupHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sesame Notice — セットアップ</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f5f7;
      color: #1d1d1f;
      min-height: 100vh;
      padding: 24px 16px 48px;
    }
    .container { max-width: 640px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
    .subtitle { color: #6e6e73; font-size: 14px; margin-bottom: 32px; }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    .card h2 {
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-desc { font-size: 13px; color: #6e6e73; margin-bottom: 18px; }
    label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #3a3a3c; }
    input[type="text"], input[type="password"], select {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid #d1d1d6;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      transition: border-color .15s;
      background: #fafafa;
    }
    input:focus, select:focus { border-color: #0071e3; background: #fff; }
    .field { margin-bottom: 14px; }
    .radio-group { display: flex; gap: 12px; margin-bottom: 14px; }
    .radio-option {
      flex: 1;
      border: 1.5px solid #d1d1d6;
      border-radius: 10px;
      padding: 10px 14px;
      cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    .radio-option.selected { border-color: #0071e3; background: #f0f7ff; }
    .radio-option input { display: none; }
    .radio-option .label { font-size: 14px; font-weight: 500; }
    .radio-option .desc { font-size: 12px; color: #6e6e73; margin-top: 2px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: opacity .15s;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: #0071e3; color: #fff; }
    .btn-secondary { background: #e5e5ea; color: #1d1d1f; }
    .btn-sm { padding: 7px 14px; font-size: 13px; }
    .btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 999px;
      font-weight: 500;
    }
    .status-ok { background: #d1fae5; color: #065f46; }
    .status-warn { background: #fef3c7; color: #92400e; }
    .status-err { background: #fee2e2; color: #991b1b; }
    .device-list { list-style: none; }
    .device-item {
      padding: 10px 12px;
      border: 1.5px solid #d1d1d6;
      border-radius: 10px;
      cursor: pointer;
      margin-bottom: 8px;
      transition: border-color .15s, background .15s;
    }
    .device-item:hover, .device-item.selected { border-color: #0071e3; background: #f0f7ff; }
    .device-item .name { font-weight: 500; font-size: 14px; }
    .device-item .uuid { font-size: 11px; color: #6e6e73; font-family: monospace; }
    .webhook-box {
      background: #f5f5f7;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      font-family: monospace;
      word-break: break-all;
      margin-top: 12px;
      position: relative;
    }
    .copy-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: #e5e5ea;
      border: none;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
    }
    .step-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #0071e3;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .waiting-indicator { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6e6e73; margin-top: 10px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #0071e3; animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    .separator { border: none; border-top: 1px solid #e5e5ea; margin: 18px 0; }
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1d1d1f;
      color: #fff;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 14px;
      opacity: 0;
      transition: opacity .3s;
      pointer-events: none;
      white-space: nowrap;
    }
    .toast.show { opacity: 1; }
  </style>
</head>
<body>
<div class="container">
  <h1>🔑 Sesame Notice</h1>
  <p class="subtitle">鍵の開閉を LINE・Discord に通知するウェブフックサービス</p>

  <!-- Step 1: Sesame -->
  <div class="card">
    <h2><span class="step-badge">1</span> Sesame 設定</h2>
    <p class="card-desc">
      CANDY HOUSE ダッシュボードで発行した API キーと、Sesame アプリで確認できるデバイス UUID を入力してください。<br>
      <small style="color:#6e6e73;">UUID: Sesame アプリ → デバイス → 右上メニュー → デバイス情報</small>
    </p>

    <div class="field">
      <label>Sesame API Key</label>
      <input type="password" id="sesame-api-key" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
    </div>
    <div class="field">
      <label>デバイス UUID</label>
      <input type="text" id="device-uuid" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="font-family:monospace;" />
    </div>
  </div>

  <!-- Step 2: LINE -->
  <div class="card">
    <h2><span class="step-badge">2</span> LINE 設定 <span style="font-size:13px;font-weight:400;color:#6e6e73;">（任意）</span></h2>
    <p class="card-desc">LINE Developers でチャンネルを作成し、Channel Access Token と Channel Secret を入力してください。</p>

    <div class="field">
      <label>Channel Access Token</label>
      <input type="password" id="line-token" placeholder="..." />
    </div>
    <div class="field">
      <label>Channel Secret</label>
      <input type="password" id="line-secret" placeholder="..." />
    </div>

    <hr class="separator" />

    <label style="margin-bottom:10px;">通知先の種類</label>
    <div class="radio-group">
      <label class="radio-option selected" id="opt-user" onclick="selectLineType('user')">
        <input type="radio" name="line-type" value="user" checked />
        <div class="label">👤 個人 (1:1)</div>
        <div class="desc">ボットを友達追加して通知を受け取る</div>
      </label>
      <label class="radio-option" id="opt-group" onclick="selectLineType('group')">
        <input type="radio" name="line-type" value="group" />
        <div class="label">👥 グループ</div>
        <div class="desc">グループにボットを招待して通知</div>
      </label>
    </div>

    <div id="line-instructions">
      <p id="line-hint" style="font-size:13px;color:#3a3a3c;margin-bottom:10px;">
        📱 LINE アプリでボットを<strong>友達追加</strong>し、なんでもメッセージを送ってください。
      </p>
      <div class="btn-row">
        <button class="btn btn-secondary btn-sm" onclick="startLineCapture()">待機開始</button>
        <span id="line-capture-status"></span>
      </div>
      <div class="waiting-indicator" id="line-waiting" style="display:none;">
        <div class="dot"></div>
        <span id="line-waiting-text">LINE からのメッセージを待っています…</span>
      </div>
      <div class="field" id="line-target-field" style="display:none;margin-top:12px;">
        <label>取得した通知先 ID</label>
        <input type="text" id="line-target-id" readonly />
      </div>
    </div>
  </div>

  <!-- Step 3: Discord -->
  <div class="card">
    <h2><span class="step-badge">3</span> Discord 設定 <span style="font-size:13px;font-weight:400;color:#6e6e73;">（任意）</span></h2>
    <p class="card-desc">通知先チャンネルの「連携サービス」→「ウェブフック」で URL を生成して貼り付けてください。</p>

    <div class="field">
      <label>Discord Webhook URL</label>
      <input type="text" id="discord-url" placeholder="https://discord.com/api/webhooks/..." />
    </div>
  </div>

  <!-- Save & Test -->
  <div class="card">
    <h2><span class="step-badge">4</span> 保存・確認</h2>
    <p class="card-desc">設定を保存してください。1分ごとに Sesame の履歴を確認し、開閉を検知したら通知します。</p>

    <div class="btn-row">
      <button class="btn btn-primary" onclick="saveConfig()">💾 設定を保存</button>
      <button class="btn btn-secondary" onclick="sendTest()">🔔 テスト通知を送る</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
  let lineType = 'user';
  let linePollingTimer = null;

  function showToast(msg, duration = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }

  function selectLineType(type) {
    lineType = type;
    document.getElementById('opt-user').classList.toggle('selected', type === 'user');
    document.getElementById('opt-group').classList.toggle('selected', type === 'group');
    const hint = document.getElementById('line-hint');
    if (type === 'user') {
      hint.innerHTML = '📱 LINE アプリでボットを<strong>友達追加</strong>し、なんでもメッセージを送ってください。';
    } else {
      hint.innerHTML = '📱 グループを開いてボットを<strong>招待</strong>してください（招待されたタイミングで自動取得）。';
    }
  }

  async function startLineCapture() {
    if (linePollingTimer) clearInterval(linePollingTimer);
    document.getElementById('line-waiting').style.display = 'flex';
    document.getElementById('line-target-field').style.display = 'none';
    document.getElementById('line-waiting-text').textContent =
      lineType === 'user'
        ? 'LINE からのメッセージを待っています…'
        : 'グループ招待を待っています…';

    linePollingTimer = setInterval(async () => {
      const res = await fetch('/api/config');
      const cfg = await res.json();
      if (cfg.line_target_id) {
        clearInterval(linePollingTimer);
        document.getElementById('line-waiting').style.display = 'none';
        document.getElementById('line-target-id').value = cfg.line_target_id;
        document.getElementById('line-target-field').style.display = 'block';
        showToast('✅ ' + (cfg.line_target_type === 'group' ? 'グループ' : 'ユーザー') + ' ID を取得しました！');
      }
    }, 3000);
  }

  async function saveConfig() {
    const payload = {
      sesame_api_key: document.getElementById('sesame-api-key').value.trim() || undefined,
      device_uuid: document.getElementById('device-uuid').value.trim() || undefined,
      line_token: document.getElementById('line-token').value.trim() || undefined,
      line_channel_secret: document.getElementById('line-secret').value.trim() || undefined,
      discord_webhook_url: document.getElementById('discord-url').value.trim() || undefined,
    };

    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast('✅ 保存しました（1分以内にポーリングが開始されます）');
    } else {
      showToast('保存失敗: ' + res.status);
    }
  }

  async function sendTest() {
    const res = await fetch('/api/test', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      showToast('🔔 テスト通知を送りました！');
    } else {
      showToast('通知失敗: ' + (data.errors || []).join(', '));
    }
  }

  // Load current config on page load
  (async () => {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    if (cfg.device_uuid) {
      document.getElementById('device-uuid').value = cfg.device_uuid;
    }
    if (cfg.discord_webhook_url) {
      document.getElementById('discord-url').value = cfg.discord_webhook_url;
    }
    if (cfg.line_target_id) {
      document.getElementById('line-target-id').value = cfg.line_target_id;
      document.getElementById('line-target-field').style.display = 'block';
      if (cfg.line_target_type === 'group') selectLineType('group');
    }
  })();
</script>
</body>
</html>`;
