// スラッシュコマンドの定義と、カンファレンス設定の入力チェック

const STRING = 3;
const SUB_COMMAND = 1;
const ADMINISTRATOR = String(1 << 3);

export const RESERVED_NAMES = ['mogiri', 'mogiri-check', 'mogiri-admin'];

export const BASE_COMMANDS = [
    { name: 'mogiri', description: 'mogiri の案内を表示します' },
    { name: 'mogiri-check', description: '設定とチケット確認の動作をテストします', default_member_permissions: ADMINISTRATOR },
    {
        name: 'mogiri-admin',
        description: 'カンファレンスの設定を管理します（運営者のみ）',
        default_member_permissions: ADMINISTRATOR,
        options: [
            { type: SUB_COMMAND, name: 'list', description: 'このサーバーのカンファレンス一覧' },
            {
                type: SUB_COMMAND, name: 'add', description: 'カンファレンスを追加・更新し、コマンドを登録します',
                options: [
                    { type: STRING, name: 'name', description: 'コマンド名（例: rsgt2027）', required: true },
                    { type: STRING, name: 'role', description: '付与するロール名', required: true },
                    { type: STRING, name: 'organizer', description: 'Pretix の organizer', required: true },
                    { type: STRING, name: 'event', description: 'Pretix のイベント slug', required: true },
                    { type: STRING, name: 'key_secret', description: 'Pretix トークンを入れた Secret 名（PRETIX_KEY_...）', required: true },
                    { type: STRING, name: 'test_order', description: 'mogiri-check で使うテスト用注文番号' },
                    { type: STRING, name: 'base_url', description: 'Pretix の URL（省略時 https://pretix.eu）' },
                ],
            },
            {
                type: SUB_COMMAND, name: 'remove', description: 'カンファレンスを削除し、コマンドも消します',
                options: [{ type: STRING, name: 'name', description: 'コマンド名', required: true }],
            },
            { type: SUB_COMMAND, name: 'sync', description: 'このサーバーのコマンド登録を D1 の内容に合わせ直します' },
            {
                type: SUB_COMMAND, name: 'analytics', description: '受付枚数を表示します（name を指定すると Pretix の販売枚数も）',
                options: [{ type: STRING, name: 'name', description: 'コマンド名。指定すると Pretix の販売枚数と並べる' }],
            },
        ],
    },
];

export function conferenceCommand(name) {
    return {
        name,
        description: `${name} の参加者ロールを受け取ります`,
        options: [{ type: STRING, name: 'ordernumber', description: 'Pretix の注文番号', required: true }],
    };
}

export function guildCommands(conferences) {
    return [...BASE_COMMANDS, ...conferences.map(c => conferenceCommand(c.name))];
}

export const DEFAULT_PRETIX_BASE_URL = 'https://pretix.eu';

// 入力が正しければ null、誤りがあればその説明を返す。
// pretix_base_url を許可リストに限り、Secret 名を PRETIX_KEY_ に限ることで、
// 別のホストへトークンを送らせたり Bot トークンを読ませたりできないようにする。
export function validateConference(c, allowedOrigins) {
    if (!/^[a-z0-9_-]{1,32}$/.test(c.name || '')) return 'name は英小文字・数字・`-`・`_` の32文字以内にしてください';
    if (RESERVED_NAMES.includes(c.name)) return `${c.name} は予約されたコマンド名です`;
    if (!c.discord_role || c.discord_role.length > 100) return 'role を指定してください';
    if (!allowedOrigins.includes(c.pretix_base_url)) return `base_url は次のいずれかにしてください: ${allowedOrigins.map(o => `\`${o}\``).join(', ')}`;
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(c.pretix_organizer || '')) return 'organizer の形式が正しくありません';
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(c.pretix_event_slug || '')) return 'event の形式が正しくありません';
    if (!/^PRETIX_KEY_[A-Z0-9_]{1,64}$/.test(c.pretix_key_secret || '')) return 'key_secret は `PRETIX_KEY_` で始まる英大文字・数字・`_` にしてください';
    if (c.ordernumber_for_test && !/^[A-Za-z0-9]{1,32}$/.test(c.ordernumber_for_test)) return 'test_order の形式が正しくありません（英数字のみ）';
    if (!/^\d{1,20}$/.test(c.guild_id || '')) return 'guild_id の形式が正しくありません';
    return null;
}

export function allowedPretixOrigins(env) {
    return (env.PRETIX_ALLOWED_ORIGINS || DEFAULT_PRETIX_BASE_URL).split(',').map(s => s.trim()).filter(Boolean);
}
