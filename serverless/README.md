# mogiri サーバーレス版（Cloudflare Workers + D1）

Discord の **HTTP Interactions**（Interactions Endpoint URL）でスラッシュコマンドを受ける mogiri です。
Gateway（WebSocket の常時接続）を使わないので、常時起動のサーバーが要りません。

## いまの状態（2026-10-27 に本番を切り替え済み）

| | 本番 | テスト |
|---|---|---|
| Discord アプリ | **mogiri（Application ID `961867459093225502`）** | mogiri-test |
| Worker / D1 | `mogiri`（wrangler に `--env production` を付ける） | `mogiri-test`（何も付けない） |
| Cloudflare アカウント | 管理担当の個人アカウント（団体アカウントができたら移す） | 同じ個人アカウント |

- Developer Portal には「mogiri」という名前のアプリが **2つ** ある。本番は Application ID `961867459093225502` のほう（サーバーに入っているのもこちら）。もう一方には Interactions Endpoint URL を設定しないこと
- 切り戻し先の Gateway 版（Azure）は停止中。イベントの前日か当日に起動しておけば、本番アプリの Interactions Endpoint URL を空にするだけで戻せる（下の切り替え手順の 7）
- カンファレンスの追加は [ADDING-CONFERENCES.md](ADDING-CONFERENCES.md)

> ⚠️ 開発と動作確認は、必ずテスト用アプリ（mogiri-test）で行うこと。本番アプリの Interactions Endpoint URL を変えると、その瞬間から本番の受付の行き先が変わる。

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
- `/<カンファレンス名> ordernumber:<注文番号>` … Pretix で注文を確認し、ロールを付ける。Pretix に問い合わせる前に試行回数を数え、上限（`CHECKIN_MAX_ATTEMPTS` 回 / `CHECKIN_ATTEMPT_WINDOW_SECONDS` 秒。既定 5回 / 600秒）を超えたら Pretix を呼ばずに本人にだけ知らせる。上限で止めた試行は数えないので、待ち時間は延びない。すでにロールを持つ人の実行は数えない。注文番号は全角・小文字・先頭の `#`・前後の空白を直してから確認する
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
- `scripts/import-checkins.mjs` … 受付チャンネルの過去の記録を D1 用の SQL にする（何度実行しても重複しない）。`[カンファレンス名]` のない古い記録は `--conference` を付けたときだけ取り込むが、Gateway 版の `/mogiri-check` がテスト用注文番号で出した投稿も同じ文面なので、付けるときはテスト用注文番号の分が数に入ることに注意
- `scripts/check-config.mjs` … config.json が移せるか、テスト用注文番号が形式チェックを通るかを、値を出さずに確かめる
- `scripts/deploy.mjs` … デプロイ先のアカウント（`CLOUDFLARE_ACCOUNT_ID`）が指定されているかを確かめてから `wrangler deploy` する（`npm run deploy` / `npm run deploy:production`）
- `wrangler.toml` … Worker の設定。どの環境でも同じ値だけを書く（下の「設定の置き場所」）

## 設定の置き場所

公開リポジトリには、環境ごとに違う値（アカウント ID、D1 の ID、Public Key、管理者の ID）を入れない。設定ファイルを人から人へ渡すこともしない。

| 値 | 置き場所 | 変えるとき |
|---|---|---|
| Worker と D1 の名前、互換性の日付など | `wrangler.toml`（Git に入れる）。テスト用は何も付けず、本番は `[env.production]` | コードと一緒にコミットしてデプロイ |
| どの Cloudflare アカウントか | 各自の `serverless/.env` に `CLOUDFLARE_ACCOUNT_ID=<アカウント ID>`（Git に入れない）。wrangler が自動で読む | 各自で書く。アカウント ID は `npx wrangler whoami` かダッシュボードで分かる |
| `DISCORD_PUBLIC_KEY`（Discord アプリの Public Key） | Cloudflare の Secret | `npx wrangler secret put DISCORD_PUBLIC_KEY`。デプロイは要らない |
| `ADMIN_USER_IDS`（`/mogiri-admin` を使える Discord ユーザー ID、カンマ区切り） | Cloudflare の Secret | `npx wrangler secret put ADMIN_USER_IDS`。デプロイは要らない |
| `DISCORD_BOT_TOKEN`、`PRETIX_KEY_xxx` | Cloudflare の Secret | `npx wrangler secret put ...` |
| `MOGIRI_RESPONSE`、`PRETIX_ALLOWED_ORIGINS`、`CHECKIN_MAX_ATTEMPTS`、`CHECKIN_ATTEMPT_WINDOW_SECONDS` | コードの既定値（`/mogiri` の案内、`https://pretix.eu`、5回、600秒） | 変えたいときは Secret に同じ名前で入れると、そちらが使われる |

- D1 は `database_name` だけで探す。**同じ名前の D1 がそのアカウントに見つからないと、`wrangler deploy` は空の D1 を黙って作る**。アカウントを取り違えると空の受付記録で動き出すので、デプロイは必ず `npm run deploy`（テスト用）/ `npm run deploy:production`（本番）で行う。`CLOUDFLARE_ACCOUNT_ID` がないと止まる
- Secret（`DISCORD_PUBLIC_KEY` と `ADMIN_USER_IDS` を含む）はデプロイで上書きされない。ダッシュボードで「変数」（平文）として足した値は、次のデプロイで消える
- Secret の値はダッシュボードでも読めない。今の値を確かめたいときは、入れ直す
- `serverless/.env` には `CLOUDFLARE_ACCOUNT_ID` だけを書く（API トークンなどは書かない）。`.dev.vars` がないと、`wrangler dev` は `.env` の中身を手元の Worker の Secret として読み込む。`wrangler dev` で使う値は `.dev.vars` に書く

### 古い形（vars と wrangler.production.toml）から移す（2026-10-28 に mogiri-test と本番の両方で済み）

記録として残す。手元に古い `wrangler.production.toml` が残っていたら消してよい（もう使わない）。

以前は `DISCORD_PUBLIC_KEY` と `ADMIN_USER_IDS` を `[vars]`（平文の変数）で入れていた。新しい `wrangler.toml` でそのままデプロイすると、この2つが消えて、Secret を入れるまで全リクエストが 401 になり受付が止まる。
デプロイと同時に Secret を入れる（`--secrets-file`。同じ版に入るので、止まる時間がない）。

1. 2つの値を書いた JSON ファイルを **リポジトリの外** に作る（`{"DISCORD_PUBLIC_KEY": "...", "ADMIN_USER_IDS": "...,..."}`）。値を画面やチャットに出さない
2. `npm run deploy -- --secrets-file <そのファイル>`（本番は `npm run deploy:production -- --secrets-file <そのファイル>`）
3. すぐにファイルを消す
4. `npx wrangler secret list`（本番は `--env production`）に2つが出ること、Discord で `/mogiri` が応答し `/mogiri-admin list` が使えることを確かめる
5. テスト用 → 本番の順に行う。本番が終わったら、手元の `serverless/wrangler.production.toml` を消し、`.gitignore` の `serverless/wrangler.production.toml` の行も消す

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

どの変更のあとに何を確かめるかは [TESTING.md](TESTING.md)。自動テストは次のとおり。

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
npx wrangler d1 execute mogiri-test --local --file=schema.sql
npx wrangler dev
```

`DISCORD_PUBLIC_KEY`、`ADMIN_USER_IDS`、テスト用アプリの Bot トークンなどは `serverless/.dev.vars`（gitignore 済み）に `DISCORD_BOT_TOKEN=...` の形で書く。
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
npx wrangler whoami
```

`whoami` に出たアカウント ID を、`serverless/.env` に `CLOUDFLARE_ACCOUNT_ID=<アカウント ID>` と書く（gitignore 済み）。

```bash
npx wrangler d1 create mogiri-test
npx wrangler d1 execute mogiri-test --remote --file=schema.sql
npm run deploy
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put ADMIN_USER_IDS
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put PRETIX_KEY_SCRUMGATHERING
```

- `d1 create` が `database_id` を `wrangler.toml` に書き足そうとしたら断る（またはコミットしない）。名前だけで見つかる
- `DISCORD_PUBLIC_KEY` はテスト用アプリのもの、`ADMIN_USER_IDS` は自分の Discord ユーザー ID

最後に表示される URL（`https://mogiri-test.<アカウント>.workers.dev`）を控える。

### 3. テスト用アプリに Endpoint URL を設定する

Developer Portal で **テスト用アプリ** の General Information > Interactions Endpoint URL に Worker の URL を入れて保存する。保存のときに Discord が署名付きの PING を送ってくるので、保存できれば署名検証が動いている。

### 4. コマンドを登録して試す

```powershell
$env:DISCORD_APPLICATION_ID = "<テスト用アプリの ID>"
$env:DISCORD_BOT_TOKEN = "<テスト用アプリの Bot トークン>"
node scripts/register-commands.mjs <テスト用サーバー ID>
```

表示される `application:` がテスト用アプリの名前になっていることを確かめる。そのうえで、[TESTING.md](TESTING.md) の「B. テスト環境での全項目」を行う。

### 5. 切り戻しの練習（テスト用アプリで一度だけ）

本番で問題が出たときの戻し方（下の「本番への切り替え手順」の 7）を、テスト用アプリで試しておく。

1. テスト用アプリの Interactions Endpoint URL を空にして保存する
2. テスト用サーバーで `/mogiri` を実行し、「アプリケーションが応答しませんでした」になることを確かめる（コマンドが Worker に届かなくなった）
   - Gateway 版まで含めて試すときは、テスト用アプリの Bot トークンと、テスト用サーバー・テスト用カンファレンスだけを書いた `config.json` を用意し、タグ `azure-gateway-last-good` のコードを手元で `node index.js` で起動する。`/mogiri` に Gateway 版が応答すれば、戻し方の確認になる
3. Interactions Endpoint URL に Worker の URL を入れ直して保存し、`/mogiri` が再び応答することを確かめる

## 見込みの費用

| 項目 | 無料枠 | mogiri の想定 |
|---|---|---|
| Workers リクエスト | 10万件/日 | 大きなイベントの日でも数千件 |
| Workers CPU 時間 | 10ms/リクエスト | 署名検証と JSON 処理だけ（API の応答待ちは数えない） |
| `waitUntil` の続きの処理 | 応答後 30秒まで | Pretix 2回 + Discord 3回程度で数秒 |
| D1 | 読み取り 500万行/日、書き込み 10万行/日、5GB | チェックイン1件で書き込み1行 |

**月額 $0 の見込み**（Azure App Service B1 の月 $13 前後が不要になる）。もし CPU 時間の上限にかかるようなら、Workers Paid（月 $5）に上げれば 30秒まで使える。

## 本番用の Cloudflare アカウント（団体アカウント）

本番の Worker と D1 は、最終的には **団体のメールアドレスを持ち主にした Cloudflare アカウント** に置く。
テスト用の `mogiri-test` は、これまでどおり個人のアカウントに置いたままにする。

> 団体アカウントが用意できるまでは、本番も管理担当の個人アカウントに置き、運営メンバーをそのアカウントのメンバーに追加して運用する。
> その間も、本番の操作には `--env production` を付けて `mogiri-test` と分けて操作する。
> 団体アカウントに移すときは、新しいアカウントに Worker と D1 を作り直し、`wrangler d1 export` で D1 の中身を移し、Secret を入れ直し、本番アプリの Interactions Endpoint URL を新しい URL に替える。

### アカウントとメンバー

| だれ | Cloudflare のロール | 理由 |
|---|---|---|
| 団体のメールアドレス（持ち主） | Super Administrator | アカウントの持ち主。ふだんの作業には使わない |
| 管理担当の個人アカウント（1人） | Super Administrator | 持ち主が使えなくなったときに、アカウントを取り戻せるようにもう1人置く |
| カンファレンスを追加する運営メンバーの個人アカウント | Developer Platform Editor | Secret の追加と、デプロイ・D1 の操作ができれば足りる（作成・削除はできない） |

- Cloudflare のロール名は変わることがあるので、招待の画面で「Workers Scripts と D1 を編集できる」ことを確かめて選ぶ。請求やDNSの権限は要らない
- Developer Platform Editor では、D1 の概要のグラフ（クエリー数）が「not authorized for that account」になることがある。中身はコンソールタブか `npx wrangler d1 execute` で見る
- 持ち主のアカウントのログイン情報と二段階認証のバックアップコードは、団体で共有している保管場所に置く（個人のパソコンだけに置かない）

### 二段階認証

- 持ち主のアカウントと、メンバーの個人アカウントのすべてで二段階認証（認証アプリ）を有効にする
- アカウントの設定でメンバーに二段階認証を必須にできる場合は、有効にしておく
- バックアップコードは各自で保管する。なくすとアカウントに入れなくなる

### wrangler がどのアカウントを使うかを固定する

複数のアカウントに入れる人は、wrangler がどれを使うかを取り違えやすい。
**`serverless/.env` に `CLOUDFLARE_ACCOUNT_ID` を必ず書き、本番の操作には毎回 `--env production` を付ける。**

1. `npx wrangler whoami` で、いまログインしているユーザーと、使えるアカウントの一覧（アカウント ID 付き）を確かめる。別のユーザーでログインしていたら `npx wrangler logout` → `npx wrangler login`
2. `serverless/.env` に `CLOUDFLARE_ACCOUNT_ID=<本番のアカウント ID>` と書く（gitignore 済み）。テスト用と本番が別のアカウントになったら、本番の ID は `serverless/.env.production` に書く（`--env production` のときだけ読まれ、`.env` より優先される）
3. 本番の操作は、すべて `--env production` を付けて実行する

```bash
npm run deploy:production
npx wrangler secret put PRETIX_KEY_XXX --env production
npx wrangler secret put ADMIN_USER_IDS --env production
npx wrangler d1 execute mogiri --remote --env production --command "SELECT COUNT(*) FROM checkins"
npx wrangler tail --env production
```

- `--env production` を付け忘れると、`mogiri-test` に対して実行される。本番に反映されないときは、まず付け忘れを疑う
- 何も付けずに実行すると、wrangler が「環境が指定されていない」という警告を出す。テスト用に対して実行するときは気にしなくてよい（消したいときは `--env ""` を付ける）
- `CLOUDFLARE_ACCOUNT_ID` を書かずにおくと、ログイン中のユーザーが使えるアカウントから選ばれ、別のアカウントに空の D1 と Worker を作ってしまうことがある

### アカウントを移すと変わるもの

- Worker の URL が変わる（`https://mogiri.<団体アカウントのサブドメイン>.workers.dev`）。本番アプリの Interactions Endpoint URL には、この URL を入れる
- Secret（Bot トークンと Pretix のトークン）は、アカウントごとに入れ直す。鍵の作り直しは、切り戻しが不要になってから（下の切り替え手順の 8）。それまでは今の値を入れる
- D1 の中身も、アカウントをまたいでは移らない。下の切り替え手順の 2 と 3 で入れる

切り替えたあとのカンファレンスの追加手順は [ADDING-CONFERENCES.md](ADDING-CONFERENCES.md) にまとめてある。

## 本番への切り替え手順（イベントのない時期に行う）

前提: テスト用アプリで上のチェックリストがすべて通っていること。本番用の Worker と D1 を作るときは、事前に関係者の了承を取る。
本番の操作は、すべて団体アカウントに対して `--env production` を付けて行う（上の「本番用の Cloudflare アカウント」を参照）。以下では `--env production` を省いて書いている。

1. **本番用の Worker と D1 を作る**
   `npx wrangler whoami` で団体アカウントが見えることを確かめ、`serverless/.env`（または `.env.production`）の `CLOUDFLARE_ACCOUNT_ID` を団体アカウントの ID にする。
   `npx wrangler d1 create mogiri`（`database_id` は `wrangler.toml` に書かない）→ `schema.sql` を適用 → `npm run deploy:production` → `npx wrangler secret put` で `DISCORD_PUBLIC_KEY`（本番アプリの Public Key）、`ADMIN_USER_IDS`、`DISCORD_BOT_TOKEN`（本番の Bot トークン）を入れる
2. **カンファレンス設定を移す**
   まず `node scripts/check-config.mjs ../config.json` で、全カンファレンスが移せるか・テスト用注文番号が形式チェックを通るかを確かめる（値は表示されない）。
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
7. **問題があれば戻す**（Azure の Gateway 版は予備として停止・凍結中。コードはタグ `azure-gateway-last-good`）
   1. Azure Portal で App Service `mogiri` を **開始** する（または `az webapp start --resource-group <リソースグループ> --name mogiri`）。
      Gateway 版が Discord に接続するまで1〜2分待つ（Bot がオンライン表示になる）。この間はまだ Worker が応答している
   2. Developer Portal で **本番アプリ** の Interactions Endpoint URL を空にして保存する。この瞬間から、スラッシュコマンドは Gateway 版に届く
      （先に URL を空にすると、Gateway 版が起動するまでの間コマンドがどこにも届かないので、この順番にする）
   3. `/mogiri` と、テスト用注文番号での受付を確かめる
   - 注意: Gateway 版は起動時に受付チャンネルの過去ログから「何枚目か」を数える。サーバーレス版の期間の投稿には注文番号が書かれていないので、その期間のチェックインは Gateway 版の枚数に数えられない（記録は D1 に残っている）
   - Azure のコードが壊れていた場合は、GitHub Actions の "Build and deploy ..." を **タグ `azure-gateway-last-good` を選んで** 手動実行すれば、凍結した版を入れ直せる（main を選ばないこと）
8. **Azure を止め、Gateway 版を片付ける**（数週間〜次のイベントまで問題がなければ）
   - Azure App Service `mogiri`（停止中）を削除し、B1 の課金を止める
   - 次をまとめて1つのコミットで削除する。**順番に注意**：ワークフローが残ったまま `secrets/` だけを消すと、main への push で Azure のデプロイが復号に失敗するので、必ず同じコミットで消す
     - `.github/workflows/main_mogiri.yml`（Azure へのデプロイ）と `.github/scripts/decrypt_secret.sh`
     - `secrets/config.json.gpg` と `secrets/util/`（config.json の暗号化・復号用）
     - Gateway 版のコード: `index.js`、`deploy-commands.js`、`src/mogiri.js`、`src/mogiri-check.js`、`src/eventbrite.js`、`test/eventbrite.test.js`、`config.example.json`
     - ルートの依存: `discord.js`、`axios`（`src/pretix.js` と `src/orderid.js` は残す。`@discordjs/builders` などは `deploy-commands.js` の書き換えで外し済み）
   - 必要なら、サーバーレス版のテストを回す GitHub Actions を新しく作る（デプロイはしない、テストと `npm audit signatures` だけ）
   - GitHub の Secrets（`AZUREAPPSERVICE_PUBLISHPROFILE_...`、`SECRET_PASSPHRASE`）を削除する。タグ `azure-gateway-last-good` も不要になる
   - **鍵を作り直す**：`secrets/config.json.gpg` はファイルを消しても公開リポジトリの履歴に残り続ける。暗号化されてはいるが、念のため、本番アプリの Bot トークンを Reset し、Pretix の API トークンも作り直して、新しい値を `npx wrangler secret put` で入れ直す。これで履歴に残った古い値は使えなくなる
