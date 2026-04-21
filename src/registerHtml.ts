export function registerHtml(error?: string): string {
  const errorHtml = error
    ? `<div class="error-banner">${error.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sesame Notice — 新規登録</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f5f7;
      color: #1d1d1f;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #6e6e73; font-size: 14px; margin-bottom: 24px; }
    label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #3a3a3c; }
    input[type="password"], input[type="text"] {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid #d1d1d6;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      transition: border-color .15s;
      background: #fafafa;
    }
    input:focus { border-color: #0071e3; background: #fff; }
    .field { margin-bottom: 16px; }
    .btn-primary {
      width: 100%;
      padding: 11px;
      background: #0071e3;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 4px;
    }
    .btn-primary:hover { background: #0062c4; }
    .error-banner {
      background: #fee2e2;
      color: #991b1b;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .sub-link {
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
      color: #6e6e73;
    }
    .sub-link a { color: #0071e3; text-decoration: none; }
  </style>
</head>
<body>
<div class="card">
  <h1>🔑 Sesame Notice</h1>
  <p class="subtitle">新規登録</p>
  ${errorHtml}
  <form method="POST" action="/register">
    <div class="field">
      <label for="username">ユーザー名（3〜32文字）</label>
      <input type="text" id="username" name="username" autocomplete="username" required minlength="3" maxlength="32" />
    </div>
    <div class="field">
      <label for="password">パスワード</label>
      <input type="password" id="password" name="password" autocomplete="new-password" required />
    </div>
    <div class="field">
      <label for="confirm">パスワード（確認）</label>
      <input type="password" id="confirm" name="confirm" autocomplete="new-password" required />
    </div>
    <button type="submit" class="btn-primary">登録する</button>
  </form>
  <div class="sub-link">
    すでにアカウントをお持ちの方は <a href="/login">ログイン</a>
  </div>
</div>
</body>
</html>`;
}
