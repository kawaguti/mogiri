# カンファレンスを追加する手順（サーバーレス版に切り替えたあと）

> ⚠️ **切り替えたあとは、`secrets/config.json.gpg` を更新して main に push しても、受付には何も反映されません。エラーも出ません。**
>
> | | 切り替える前（Azure の Gateway 版） | 切り替えたあと（サーバーレス版） |
> |---|---|---|
> | 設定の置き場所 | `config.json` を暗号化した `secrets/config.json.gpg` | Cloudflare の D1（データベース） |
> | 追加のしかた | `config.json` を書き換えて暗号化し、main に push してデプロイ | Discord で `/mogiri-admin add` を実行するだけ。デプロイは要らない |
> | Pretix のトークン | `config.json` の中 | Cloudflare の Secret（`PRETIX_KEY_...`） |
> | push したとき | Azure にデプロイされる | **何も起きない**（Azure は止まっていて、Cloudflare は push を見ていない） |
>
> 受付でコマンドが出てこない・ロールが付かないときは、まず `/mogiri-admin list` に追加したカンファレンスがあるかを確かめてください。

どちらで動いているかは、Discord で `/mogiri` を実行すると分かります。「mogiri（サーバーレス版）です。」と返れば、サーバーレス版です。

## 用意するもの

- Pretix の organizer と、イベントの slug（Pretix の URL `https://pretix.eu/<organizer>/<slug>/` の部分）
- そのイベントを読める Pretix の API トークン
  - 同じ organizer のトークンがもう Secret に入っていれば、それを使い回せる（`/mogiri-admin list` の Secret 名を見る）
- テスト用の注文番号（`/mogiri-check` で使う。入場券を含む、支払い済みの注文）
- Discord で `/mogiri-admin` を使える権限。次の2つがそろっている必要がある
  - Worker の Secret `ADMIN_USER_IDS` に自分の Discord ユーザー ID が入っていること（管理担当に頼む）
  - そのサーバーで `/mogiri-admin` が見えること。`/mogiri-check` と `/mogiri-admin` は、既定ではサーバーの「管理者」権限を持つ人にしか表示されない。管理者でないときは、サーバー設定 > 連携サービス > **mogiri** で、自分（または運営スタッフのロール）にこの2つのコマンドを許可してもらう
- 新しいトークンを入れるときだけ:
  - 本番の Worker がある Cloudflare アカウントのメンバーであること（管理担当に招待してもらう）
  - 手元に mogiri のリポジトリ（main）と、`serverless/.env` に `CLOUDFLARE_ACCOUNT_ID=<本番のアカウント ID>` と書いたファイル。アカウント ID は、招待されたあとに `npx wrangler whoami` で表示される（Git に入れない。人から受け取るファイルはない）

> 💡 Developer Portal には「mogiri」という名前のアプリが2つあります。本番は **Application ID `961867459093225502`** のほうです。Developer Portal で何かを確かめるときは、この ID を見てから操作してください。

## 手順

### 1. Discord に参加者ロールを作る

1. サーバー設定 > ロール で、参加者ロール（例: `ScrumFestSapporo2027参加者`）を作る
2. ロールの一覧で、**mogiri の Bot のロールより下** に置く（上にあると、Bot がロールを付けられない）

### 2. Pretix のトークンを Secret に入れる（新しい organizer のときだけ）

同じ organizer のトークンがもう入っていれば、この手順は飛ばす。

```bash
cd serverless
npx wrangler whoami
npx wrangler secret put PRETIX_KEY_SAPPORO --env production
```

- `whoami` で、本番の Worker があるアカウント（`.env` の `CLOUDFLARE_ACCOUNT_ID`）が一覧に出ることを確かめる
- `--env production` を付け忘れると、テスト用の `mogiri-test` に入ってしまう
- Secret 名は `PRETIX_KEY_` で始まり、英大文字・数字・`_` だけにする
- トークンはプロンプトに貼り付ける。チャットやファイル、コマンドの引数には書かない

### 3. Discord でカンファレンスを追加する

受付をするサーバーで実行する（結果は本人にだけ見える）。

```
/mogiri-admin add name:scrumfestsapporo2027 role:ScrumFestSapporo2027参加者 organizer:<organizer> event:<slug> key_secret:PRETIX_KEY_SAPPORO test_order:<テスト用注文番号>
```

- `name` が参加者の打つコマンド名になる（`/scrumfestsapporo2027`）。英小文字・数字・`-`・`_` の32文字以内で、ほかのカンファレンスと重ならない名前にする
- Pretix が pretix.eu 以外のときだけ `base_url` を付ける
- 数秒で `/scrumfestsapporo2027` が使えるようになる。出てこなければ Discord を再読み込みする

### 4. 確かめる

- [ ] `/mogiri-admin list` … 追加したカンファレンスが出る
- [ ] `/mogiri-check` … ロールが見つかり、テスト用注文番号が有効と出る（注文番号はチャンネルに出ない）
- [ ] 自分のアカウントで `/scrumfestsapporo2027 ordernumber:<テスト用注文番号>` … ロールが付く。確かめたらロールを外しておく

## 変更・削除

- 設定を直す … 同じ `name` でもう一度 `/mogiri-admin add` を実行すると上書きされる
- イベントが終わったら … `/mogiri-admin remove name:scrumfestsapporo2027`。コマンドも消える。チェックインの記録は D1 に残る
- コマンドの表示がおかしいとき … `/mogiri-admin sync` で、このサーバーのコマンドを D1 の内容に揃え直す

## うまくいかないとき

| 症状 | 確かめること |
|---|---|
| 「アプリケーションが応答しませんでした」 | 本番の Discord アプリの Interactions Endpoint URL が設定されているか。Cloudflare の Worker が動いているか（`npx wrangler tail --env production`） |
| 「ロールを付けられませんでした」 | 参加者ロールが Bot のロールより下にあるか |
| `/mogiri-check` で Secret がないと出る | 手順 2 の Secret 名と、`key_secret` の名前が同じか。`--env production` を付けたか |
| `/mogiri-admin` が拒否される | 自分の Discord ユーザー ID が `ADMIN_USER_IDS` に入っているか（足すときは管理担当が `npx wrangler secret put ADMIN_USER_IDS --env production` で全員分を入れ直す。デプロイは要らない） |
| `/mogiri-admin` や `/mogiri-check` がコマンドの一覧に出ない | そのサーバーで管理者権限があるか、連携サービス > mogiri で許可されているか。Discord を再読み込み（Ctrl+R）してもう一度見る |
| 受付は成功したのに、受付チャンネルに投稿が出ない | Bot にそのチャンネルへの投稿権限があるか。投稿に失敗しても受付（ロールと記録）は終わっていて、本人には「完了」と出る。ログ（`npx wrangler tail`）に `failed to post the check-in record` が出る |
