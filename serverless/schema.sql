-- mogiri サーバーレス版の D1 スキーマ
-- 適用: npx wrangler d1 execute <DB名> --remote --file=schema.sql

-- カンファレンスの設定。スラッシュコマンド名 = name。
-- Pretix の API トークンそのものはここに置かず、Worker の Secret 名（pretix_key_secret）だけを持つ。
CREATE TABLE IF NOT EXISTS conferences (
    name TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    discord_role TEXT NOT NULL,
    pretix_base_url TEXT NOT NULL,
    pretix_organizer TEXT NOT NULL,
    pretix_event_slug TEXT NOT NULL,
    pretix_key_secret TEXT NOT NULL,
    ordernumber_for_test TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_conferences_guild ON conferences (guild_id);

-- チェックインの記録。同じ注文番号が何枚目かを数えるのに使う。
-- message_id は受付チャンネルの過去ログを取り込んだときの重複防止用。
CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    conference TEXT NOT NULL,
    order_number TEXT NOT NULL,
    user_id TEXT,
    message_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_checkins_order ON checkins (conference, order_number);
CREATE INDEX IF NOT EXISTS idx_checkins_guild ON checkins (guild_id, created_at);

-- 受付コマンドの試行の記録。注文番号の総当たりで Pretix の API 制限を使い切られないよう、
-- ユーザーごとに一定時間内の試行回数を数える。古い行は記録のたびに消す。
CREATE TABLE IF NOT EXISTS checkin_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_checkin_attempts_user ON checkin_attempts (user_id, created_at);
