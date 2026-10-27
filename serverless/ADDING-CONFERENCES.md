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
- Discord で `/mogiri-admin` を使える権限（Worker の設定 `ADMIN_USER_IDS` に自分のユーザー ID が入っていること）
- 新しいトークンを入れるときだけ: 団体の Cloudflare アカウントのメンバーであることと、手元に mogiri のリポジトリと `serverless/wrangler.production.toml`（作り方は [README.md](README.md) の「本番用の Cloudflare アカウント」）

## 手順

### 1. Discord に参加者ロールを作る

1. サーバー設定 > ロール で、参加者ロール（例: `ScrumFestSapporo2027参加者`）を作る
2. ロールの一覧で、**mogiri の Bot のロールより下** に置く（上にあると、Bot がロールを付けられない）

### 2. Pretix のトークンを Secret に入れる（新しい organizer のときだけ）

同じ organizer のトークンがもう入っていれば、この手順は飛ばす。

```bash
cd serverless
npx wrangler whoami
npx wrangler secret put PRETIX_KEY_SAPPORO --config wrangler.production.toml
```

- `whoami` で、団体アカウントが一覧に出ることを確かめる
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
| 「アプリケーションが応答しませんでした」 | 本番の Discord アプリの Interactions Endpoint URL が設定されているか。Cloudflare の Worker が動いているか（`npx wrangler tail mogiri --config wrangler.production.toml`） |
| 「ロールを付けられませんでした」 | 参加者ロールが Bot のロールより下にあるか |
| `/mogiri-check` で Secret がないと出る | 手順 2 の Secret 名と、`key_secret` の名前が同じか。`--config wrangler.production.toml` を付けたか |
| `/mogiri-admin` が拒否される | 自分の Discord ユーザー ID が `ADMIN_USER_IDS` に入っているか（入れるには `wrangler.production.toml` を直してデプロイが要る） |
