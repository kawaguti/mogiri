# mogiri サーバーレス版（Cloudflare Workers + D1）

Discord の **HTTP Interactions**（Interactions Endpoint URL）でスラッシュコマンドを受ける mogiri です。
Gateway（WebSocket の常時接続）を使わないので、常時起動のサーバーが要りません。

> ⚠️ **本番の Discord アプリケーションの Interactions Endpoint URL は、切り替えの日まで絶対に設定しないこと。**
> 設定した瞬間からスラッシュコマンドが HTTP に届くようになり、Azure で動いている Gateway 版が応答しなくなります。
> 開発と動作確認は、必ず別のテスト用 Discord アプリケーションで行ってください。

## 何が変わるか（Gateway 版との違い）

| | Gateway 版（index.js） | サーバーレス版（serverless/） |
|---|---|---|
| 動く場所 | Azure App Service B1（常時起動） | Cloudflare Workers（リクエストのときだけ） |
| カンファレンス設定 | config.json（変えるたびにデプロイ） | D1。Discord で `/mogiri-admin add` するだけ。コマンド登録も自動 |
| Pretix トークン | config.json | Worker の Secret（`PRETIX_KEY_...`）。D1 には Secret 名だけ |
| 何枚目かの判定 | 起動時に受付チャンネルの過去1500件を読む | D1 の `checkins` テーブルで数える |
| 受付チャンネルの投稿 | 注文番号を含む | **注文番号を含まない**（`@本人 のチェックインを確認し…[conf] (1/2枚目)`）。番号は D1 にだけ残る |
| 本人への応答 | 全員に見える | 本人にだけ見える（ephemeral） |
| 注文番号の総当たり対策 | なし | ユーザーごとに試行回数の上限（既定: 10分に5回。D1 の `checkin_attempts`） |
| Eventbrite | 対応 | 非対応（Pretix のみ） |
| ランタイム依存 | discord.js, axios など | なし（fetch と WebCrypto のみ。`src/pretix.js` を共用） |

### コマンド

- `/mogiri` … 案内（`MOGIRI_RESPONSE`）を返す
- `/<カンファレンス名> ordernumber:<注文番号>` … Pretix で注文を確認し、ロールを付ける。Pretix に問い合わせる前に試行回数を数え、上限（`CHECKIN_MAX_ATTEMPTS` 回 / `CHECKIN_ATTEMPT_WINDOW_SECONDS` 秒。既定 5回 / 600秒）を超えたら Pretix を呼ばずに本人にだけ知らせる。上限に達したあとの試行も数えるので、試し続けるかぎり解除されない。すでにロールを持つ人の実行は数えない
- `/mogiri-check` … ロールの有無・Secret の設定・テスト用注文番号での Pretix 確認・D1 の記録件数を表示（既定では管理者のみ表示）
- `/mogiri-admin list | add | remove | sync` … カンファレンス設定の管理。`ADMIN_USER_IDS` に書いたユーザーだけが使える

### 処理の流れ

1. Discord → Worker に POST。`X-Signature-Ed25519` / `X-Signature-Timestamp` を WebCrypto（Ed25519）で検証。5分以上ずれたタイムスタンプも拒否
2. PING には PONG を返す
3. Pretix や Discord REST を呼ぶコマンドは、まず deferred 応答（type 5）を返す（3秒制限のため）
4. `ctx.waitUntil` で続きを処理し、終わったら `PATCH /webhooks/{app}/{token}/messages/@original` で結果に書き換える
5. ロール付与（`PUT /guilds/.../members/.../roles/...`）と受付チャンネルへの投稿は Bot トークンで REST を呼ぶ。投稿は常に `allowed_mentions: { parse: [] }`（@everyone などで通知が飛ばない）

## ファイル

- `src/index.js` … エントリーポイント（署名検証 → 振り分け）
- `src/handlers.js` … 各コマンドの処理
- `src/verify.js` … 署名検証
- `src/discord.js` … Discord REST のラッパー
- `src/store.js` … D1（カンファレンス設定とチェックイン記録）
- `src/commands.js` … コマンド定義と、設定の入力チェック
- `../src/pretix.js` … Pretix の判定ロジック（Gateway 版と共用。fetch 版に書き換え済み）
- `schema.sql` … D1 のテーブル
- `scripts/register-commands.mjs` … 最初に `/mogiri` `/mogiri-check` `/mogiri-admin` を登録する
- `scripts/import-config.mjs` … 今の config.json から D1 用の SQL を作る（キーは出力しない）
- `scripts/import-checkins.mjs` … 受付チャンネルの過去の記録を D1 用の SQL にする
- `wrangler.example.toml` … 設定の雛形（`wrangler.toml` にコピーして使う。gitignore 済み）

## 依存とサプライチェーン対策

- ランタイム依存は **0**。Worker の本体は fetch と WebCrypto だけで動く
- 開発用に `wrangler@4.151.0`（2026-10-14 公開）を **serverless/ だけ** に入れている。ルートの package.json / lockfile は変えていない
- `serverless/.npmrc` で `ignore-scripts=true`。wrangler・esbuild・workerd はインストールスクリプトなしで動くことを確認済み
- 入れ直すとき:

  ```bash
  cd serverless
  npm ci --ignore-scripts
  npm audit
  npm audit signatures
  ```

## テスト

```bash
npm run test:serverless
```

`node:sqlite` で D1 の代わりをし、本物の `schema.sql` を使う（追加の依存なし）。Discord と Pretix は偽物に差し替えるので、外部には接続しない。

## ローカルで試す

Worker 自体は `wrangler dev` で手元の Workers ランタイム（workerd）とローカルの D1 で動く。
ただし **Discord はインターネットから届く HTTPS の URL にしか送ってこない** ので、Discord から実際に叩いてもらうには公開 URL が要る。

| やり方 | Discord から叩ける | クラウドに作るもの | 備考 |
|---|---|---|---|
| `npm run test:serverless` | ×（偽物で再現） | なし | 署名・分岐・D1 の SQL まで確認できる |
| `wrangler dev` に署名付きリクエストを送る | × | なし | 実際のランタイムで署名検証と D1 が動くか確認できる |
| `wrangler dev` + `cloudflared tunnel --url http://localhost:8787` | ○ | なし（一時的な trycloudflare.com の URL） | cloudflared の別インストールが必要 |
| workers.dev に `mogiri-test` をデプロイ | ○ | Worker と D1（無料枠） | 下の手順。いちばん手間が少ない |

`wrangler dev` を使う場合:

```bash
cd serverless
cp wrangler.example.toml wrangler.toml
npx wrangler d1 execute mogiri-test --local --file=schema.sql
npx wrangler dev --var DISCORD_PUBLIC_KEY:<公開鍵>
```

テスト用アプリの Bot トークンなどは `serverless/.dev.vars`（gitignore 済み）に `DISCORD_BOT_TOKEN=...` の形で書く。
トンネルを使う場合は、表示された URL を **テスト用アプリ** の Interactions Endpoint URL に入れる。そのあとは下の手順4と同じ。

## テスト用アプリでの動作確認の手順

### 1. テスト用 Discord アプリケーションとサーバーを用意する

1. <https://discord.com/developers/applications> で **新しい** アプリケーション（例: `mogiri-test`）を作る
2. Bot タブで Bot トークンを発行する（Privileged Gateway Intents は不要）
3. OAuth2 > URL Generator で scope `bot` と `applications.commands`、権限 `Manage Roles` `Send Messages` `View Channels` を選び、テスト用サーバーに招待する
4. テスト用サーバーに参加者ロール（例: `RSGT2027参加者`）を作り、ロール一覧で **Bot のロールより下** に置く
5. 控えておくもの: Application ID、Public Key、Bot トークン、サーバー ID、自分のユーザー ID

### 2. Cloudflare 側を用意する（初回だけ）

```bash
cd serverless
npm ci --ignore-scripts
npx wrangler login
npx wrangler d1 create mogiri-test
```

`wrangler.example.toml` を `wrangler.toml` にコピーし、`database_id`、`DISCORD_PUBLIC_KEY`（テスト用アプリのもの）、`ADMIN_USER_IDS` を書き換える。

```bash
npx wrangler d1 execute mogiri-test --remote --file=schema.sql
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put PRETIX_KEY_SCRUMGATHERING
npx wrangler deploy
```

最後に表示される URL（`https://mogiri-test.<アカウント>.workers.dev`）を控える。

### 3. テスト用アプリに Endpoint URL を設定する

Developer Portal で **テスト用アプリ** の General Information > Interactions Endpoint URL に Worker の URL を入れて保存する。保存のときに Discord が署名付きの PING を送ってくるので、保存できれば署名検証が動いている。

### 4. コマンドを登録して試す

```powershell
$env:DISCORD_APPLICATION_ID = "<テスト用アプリの ID>"
$env:DISCORD_BOT_TOKEN = "<テスト用アプリの Bot トークン>"
node scripts/register-commands.mjs <テスト用サーバー ID>
```

表示される `application:` がテスト用アプリの名前になっていることを確かめる。そのうえで、Discord で次を試す。

- [ ] `/mogiri` … 案内が返る
- [ ] `/mogiri-admin add name:rsgt2027 role:RSGT2027参加者 organizer:<organizer> event:<slug> key_secret:PRETIX_KEY_SCRUMGATHERING test_order:<テスト用注文番号>` … 追加され、数秒後に `/rsgt2027` が使えるようになる
- [ ] `/mogiri-admin list` … 本人にだけ一覧が見える
- [ ] `/mogiri-check` … ロールと Pretix の確認結果が出る。チャンネルに注文番号が出ていない
- [ ] `/rsgt2027 ordernumber:<有効な注文番号>` … 本人にだけ「認証が完了」が見え、ロールが付き、チャンネルに `@自分 のチェックインを確認し… (1/N枚目)` が出る（注文番号は出ない）
- [ ] 別のユーザーで同じ注文番号 … `(2/N枚目)` になる
- [ ] ロールを持ったまま再実行 … 「すでに…ロールをお持ちでした」
- [ ] 存在しない注文番号 … 本人には失敗が、チャンネルには番号なしの失敗が出る
- [ ] 入場券を含まない注文 … 「入場券ではない」
- [ ] 存在しない注文番号を続けて6回 … 6回目は「確認の回数が上限…に達しました」になり、チャンネルには投稿されない
- [ ] `ADMIN_USER_IDS` にないユーザーの `/mogiri-admin` … 拒否される
- [ ] `/mogiri-admin remove name:rsgt2027` … `/rsgt2027` が消える
- [ ] `npx wrangler tail` でエラーが出ていない

## 見込みの費用

| 項目 | 無料枠 | mogiri の想定 |
|---|---|---|
| Workers リクエスト | 10万件/日 | 大きなイベントの日でも数千件 |
| Workers CPU 時間 | 10ms/リクエスト | 署名検証と JSON 処理だけ（API の応答待ちは数えない） |
| `waitUntil` の続きの処理 | 応答後 30秒まで | Pretix 2回 + Discord 3回程度で数秒 |
| D1 | 読み取り 500万行/日、書き込み 10万行/日、5GB | チェックイン1件で書き込み1行 |

**月額 $0 の見込み**（Azure App Service B1 の月 $13 前後が不要になる）。もし CPU 時間の上限にかかるようなら、Workers Paid（月 $5）に上げれば 30秒まで使える。

## 本番への切り替え手順（イベントのない時期に行う）

前提: テスト用アプリで上のチェックリストがすべて通っていること。本番用の Worker と D1 を作るときは、事前に関係者の了承を取る。

1. **本番用の Worker と D1 を作る**
   `wrangler.toml` の `name` と `database_name` を本番用（例: `mogiri`）にし、`DISCORD_PUBLIC_KEY` を本番アプリのものに替える。
   `npx wrangler d1 create mogiri` → `schema.sql` を適用 → `npx wrangler secret put DISCORD_BOT_TOKEN`（本番の Bot トークン）→ `npx wrangler deploy`
2. **カンファレンス設定を移す**
   `node scripts/import-config.mjs ../config.json > conferences.sql` → `npx wrangler d1 execute mogiri --remote --file=conferences.sql`。
   表示された `PRETIX_KEY_...` を `npx wrangler secret put` で設定する（同じ organizer のトークンなら1つにまとめ、`/mogiri-admin add` で `key_secret` を付け替えてもよい）。
3. **（任意）過去のチェックイン記録を移す**
   `node scripts/import-checkins.mjs <guildId> <受付チャンネル ID> > checkins.sql` → `npx wrangler d1 execute mogiri --remote --file=checkins.sql`。
   続いて開催中のイベントがなければ省略してよい。
4. **基本コマンドを登録する**
   本番アプリの ID とトークンで `node scripts/register-commands.mjs <guildId>`（サーバーごと）。既存のカンファレンスのコマンドはそのまま残る。この時点では、まだ Gateway 版が応答する。
5. **切り替える**
   Developer Portal で **本番アプリ** の Interactions Endpoint URL に本番 Worker の URL を設定する。この瞬間から、スラッシュコマンドは Worker に届く。
6. **すぐに確認する**
   `/mogiri`、`/mogiri-check`、テスト用注文番号での受付、`/mogiri-admin sync`（コマンド登録を D1 の内容に揃える）。
7. **問題があれば戻す**
   Interactions Endpoint URL を空にして保存すれば、すぐに Gateway 版（Azure）に戻る。Azure はしばらく止めずに残しておく。
8. **Azure を止め、Gateway 版を片付ける**（数週間〜次のイベントまで問題がなければ）
   - Azure App Service `mogiri` を停止し、問題がなければ削除する
   - 次をまとめて1つのコミットで削除する。**順番に注意**：ワークフローが残ったまま `secrets/` だけを消すと、main への push で Azure のデプロイが復号に失敗するので、必ず同じコミットで消す
     - `.github/workflows/main_mogiri.yml`（Azure へのデプロイ）と `.github/scripts/decrypt_secret.sh`
     - `secrets/config.json.gpg` と `secrets/util/`（config.json の暗号化・復号用）
     - Gateway 版のコード: `index.js`、`deploy-commands.js`、`src/mogiri.js`、`src/mogiri-check.js`、`src/eventbrite.js`、`test/eventbrite.test.js`、`config.example.json`
     - ルートの依存: `discord.js`、`@discordjs/builders`、`@discordjs/rest`、`discord-api-types`、`axios`（`src/pretix.js` と `src/orderid.js` は残す）
   - 必要なら、サーバーレス版のテストを回す GitHub Actions を新しく作る（デプロイはしない、テストと `npm audit signatures` だけ）
   - GitHub の Secrets（`AZUREAPPSERVICE_PUBLISHPROFILE_...`、`SECRET_PASSPHRASE`）を削除する
   - **鍵を作り直す**：`secrets/config.json.gpg` はファイルを消しても公開リポジトリの履歴に残り続ける。暗号化されてはいるが、念のため、本番アプリの Bot トークンを Reset し、Pretix の API トークンも作り直して、新しい値を `npx wrangler secret put` で入れ直す。これで履歴に残った古い値は使えなくなる
