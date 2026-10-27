// Discord から届いたリクエストの署名（Ed25519）を WebCrypto で検証する。
// https://discord.com/developers/docs/interactions/overview#setting-up-an-endpoint-validating-security-request-headers

const encoder = new TextEncoder();
const keyCache = new Map();

// 古いリクエストの使い回し（リプレイ）を防ぐため、タイムスタンプが大きくずれたものは拒否する
const MAX_SKEW_SECONDS = 300;

export function hexToBytes(hex) {
    if (typeof hex !== 'string' || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
        throw new Error('invalid hex string');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

async function importPublicKey(publicKeyHex) {
    let key = keyCache.get(publicKeyHex);
    if (!key) {
        key = await crypto.subtle.importKey('raw', hexToBytes(publicKeyHex), { name: 'Ed25519' }, false, ['verify']);
        keyCache.set(publicKeyHex, key);
    }
    return key;
}

// 署名が正しければリクエスト本文（文字列）を、正しくなければ null を返す
export async function verifyDiscordRequest(request, publicKeyHex, now = Date.now()) {
    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');
    if (!signature || !timestamp || !publicKeyHex) return null;
    if (!/^[0-9a-fA-F]{128}$/.test(signature) || !/^\d{1,12}$/.test(timestamp)) return null;
    if (Math.abs(now / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS) return null;

    const body = await request.text();
    const key = await importPublicKey(publicKeyHex);
    const valid = await crypto.subtle.verify('Ed25519', key, hexToBytes(signature), encoder.encode(timestamp + body));
    return valid ? body : null;
}
