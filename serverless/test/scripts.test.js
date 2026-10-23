import { parseCheckinMessage, toInsert } from '../scripts/import-checkins.mjs';
import { convertConfig, secretNameFor } from '../scripts/import-config.mjs';

describe('import-config', function() {
    const config = {
        conferences: {
            'rsgt2027': {
                pretix_base_url: 'https://pretix.eu/',
                pretix_organizer: 'scrumgathering',
                pretix_event_slug: 'rsgt2027',
                pretix_private_key: 'super-secret-pretix-key',
                discord_role: 'RSGT2027参加者',
                ordernumber_for_test: 'AB12C',
            },
            'scrumfest-old': { eventbrite_private_key: 'eb-secret', eventbrite_event_id: '1', discord_role: 'x' },
        },
        guilds: { RSGT: { guildId: '111111111111111111', conferences: ['rsgt2027'] } },
    };

    it('converts Pretix conferences without writing the API key', function() {
        const { statements, secrets, skipped } = convertConfig(config, ['https://pretix.eu']);
        statements.should.have.length(1);
        statements[0].should.containEql('\'rsgt2027\'');
        statements[0].should.containEql('\'https://pretix.eu\'');
        statements[0].should.containEql('\'PRETIX_KEY_RSGT2027\'');
        statements.join('\n').should.not.containEql('super-secret-pretix-key');
        statements.join('\n').should.not.containEql('eb-secret');
        secrets.should.eql(['PRETIX_KEY_RSGT2027']);
        skipped[0].should.startWith('scrumfest-old');
    });

    it('derives secret names from conference names', function() {
        secretNameFor('scrumfest-osaka-2027').should.equal('PRETIX_KEY_SCRUMFEST_OSAKA_2027');
    });
});

describe('import-checkins', function() {
    it('parses tagged Gateway check-in messages', function() {
        parseCheckinMessage('AB12Cは有効なPretixオーダー番号です。 [rsgt2027] (1/2枚目)')
            .should.eql({ order: 'AB12C', conference: 'rsgt2027' });
    });

    it('uses the default conference only for untagged messages', function() {
        parseCheckinMessage('AB12Cは有効なPretixオーダー番号です。', 'rsgt2026').should.eql({ order: 'AB12C', conference: 'rsgt2026' });
        (parseCheckinMessage('AB12Cは有効なPretixオーダー番号です。') === null).should.be.true();
    });

    it('ignores other messages', function() {
        (parseCheckinMessage('AB12Cは有効なPretixオーダー番号ではありませんでした。', 'x') === null).should.be.true();
        (parseCheckinMessage('RSGTのロールをつけました！', 'x') === null).should.be.true();
    });

    it('builds an idempotent insert keyed by message id', function() {
        toInsert({ id: '123', timestamp: '2027-01-08T00:00:00.000+00:00' }, '111', { order: 'AB12C', conference: 'rsgt2027' })
            .should.equal('INSERT OR IGNORE INTO checkins (guild_id, conference, order_number, message_id, created_at) VALUES (\'111\', \'rsgt2027\', \'AB12C\', \'123\', \'2027-01-08T00:00:00.000Z\');');
    });
});
