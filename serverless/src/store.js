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

        checkinStats: guildId =>
            db.prepare(`SELECT COUNT(*) AS total, MIN(created_at) AS oldest_at
                FROM checkins WHERE guild_id = ?1`).bind(guildId).first(),
    };
}
