// D1 に置くカンファレンス設定とチェックイン記録の読み書き

const CONFERENCE_COLUMNS = 'name, guild_id, discord_role, pretix_base_url, pretix_organizer, pretix_event_slug, pretix_key_secret, ordernumber_for_test';

export function createStore(db) {
    return {
        getConference: name =>
            db.prepare(`SELECT ${CONFERENCE_COLUMNS} FROM conferences WHERE name = ?1`).bind(name).first(),

        async listConferences(guildId) {
            const { results } = await db.prepare(`SELECT ${CONFERENCE_COLUMNS} FROM conferences WHERE guild_id = ?1 ORDER BY name`)
                .bind(guildId).all();
            return results;
        },

        upsertConference: c =>
            db.prepare(`INSERT INTO conferences (${CONFERENCE_COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ON CONFLICT (name) DO UPDATE SET guild_id = excluded.guild_id, discord_role = excluded.discord_role,
                    pretix_base_url = excluded.pretix_base_url, pretix_organizer = excluded.pretix_organizer,
                    pretix_event_slug = excluded.pretix_event_slug, pretix_key_secret = excluded.pretix_key_secret,
                    ordernumber_for_test = excluded.ordernumber_for_test,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
                .bind(c.name, c.guild_id, c.discord_role, c.pretix_base_url, c.pretix_organizer,
                    c.pretix_event_slug, c.pretix_key_secret, c.ordernumber_for_test ?? null)
                .run(),

        async deleteConference(name, guildId) {
            const result = await db.prepare('DELETE FROM conferences WHERE name = ?1 AND guild_id = ?2').bind(name, guildId).run();
            return result.meta.changes > 0;
        },

        // チェックインを記録し、同じカンファレンス・注文番号で何件目かを返す。
        // batch は1つのトランザクションで実行されるので、同時に来ても数え間違えない。
        async recordCheckin({ guildId, conference, orderNumber, userId }) {
            const [, counted] = await db.batch([
                db.prepare('INSERT INTO checkins (guild_id, conference, order_number, user_id) VALUES (?1, ?2, ?3, ?4)')
                    .bind(guildId, conference, orderNumber, userId),
                db.prepare('SELECT COUNT(*) AS n FROM checkins WHERE conference = ?1 AND order_number = ?2')
                    .bind(conference, orderNumber),
            ]);
            return counted.results[0].n;
        },

        // 直近 windowSeconds 秒の試行が maxAttempts 回未満なら今回の試行を記録して true を返す。
        // 上限に達していれば記録せずに false を返す（止められた試行で待ち時間が延びないように）。
        // そのユーザーの古い記録はここで消すので、テーブルは大きくならない。
        async recordAttempt(userId, windowSeconds, maxAttempts) {
            const since = `-${windowSeconds} seconds`;
            const [, inserted] = await db.batch([
                db.prepare(`DELETE FROM checkin_attempts WHERE user_id = ?1 AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?2)`)
                    .bind(userId, since),
                db.prepare(`INSERT INTO checkin_attempts (user_id)
                    SELECT ?1 WHERE (SELECT COUNT(*) FROM checkin_attempts WHERE user_id = ?1) < ?2`)
                    .bind(userId, maxAttempts),
            ]);
            return inserted.meta.changes > 0;
        },

        // あるユーザーの受付の記録（新しい順）。その注文で何枚目だったかも返す
        async userCheckins(guildId, userId) {
            const { results } = await db.prepare(`SELECT c.conference, c.order_number, c.created_at,
                    (SELECT COUNT(*) FROM checkins p WHERE p.conference = c.conference AND p.order_number = c.order_number
                        AND p.created_at <= c.created_at) AS nth
                FROM checkins c WHERE c.guild_id = ?1 AND c.user_id = ?2 ORDER BY c.created_at DESC LIMIT 20`)
                .bind(guildId, userId).all();
            return results;
        },

        // ある注文番号での受付の記録（古い順）
        async orderCheckins(guildId, orderNumber) {
            const { results } = await db.prepare(`SELECT conference, user_id, created_at FROM checkins
                WHERE guild_id = ?1 AND order_number = ?2 ORDER BY created_at, id`).bind(guildId, orderNumber).all();
            return results;
        },

        // 直近 windowSeconds 秒の受付の試行回数（記録は消さない）
        async countRecentAttempts(userId, windowSeconds) {
            const row = await db.prepare(`SELECT COUNT(*) AS n FROM checkin_attempts
                WHERE user_id = ?1 AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?2)`)
                .bind(userId, `-${windowSeconds} seconds`).first();
            return row?.n ?? 0;
        },

        // カンファレンスごとの受付枚数（記録の数）、注文の数、since 以降の受付枚数
        async checkinCounts(guildId, since) {
            const { results } = await db.prepare(`SELECT conference, COUNT(*) AS total, COUNT(DISTINCT order_number) AS orders,
                    SUM(CASE WHEN created_at >= ?2 THEN 1 ELSE 0 END) AS since_count
                FROM checkins WHERE guild_id = ?1 GROUP BY conference`).bind(guildId, since).all();
            return results;
        },

        checkinStats: guildId =>
            db.prepare(`SELECT COUNT(*) AS total, MIN(created_at) AS oldest_at
                FROM checkins WHERE guild_id = ?1`).bind(guildId).first(),
    };
}
