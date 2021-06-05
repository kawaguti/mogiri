const BotBase = require("./bot_base");

/**
 * ツッコミボット
 * 概要:
 * - パターンにマッチしたメッセージがあれば、それに紐づくツッコミを返します。
 * - 複数のツッコミのうちからランダムに一つを選んで返信します。
 * - 決まった言葉のみ返信できます。変数は使えません。
 * - 変数を使いたい場合は、新たなクラスを起こしてください。
 */

const VOCABULARIES = [
  {
    // アンジャッシュ
    words: /大島さん/,
    replies: ["児島だよ"],
  }, {
    words: /児島さん/,
    replies: ["そうだよ"],
  }, {
    // DoctorX
    words: /(てくだ|な)さい/,
    replies: ["いたしませ〜ん", "それって医師免許、いりませんよね?!"],
  }, {
    words: /ますか[\?？]/,
    replies: ["私、失敗しませんから", "私、失敗しないので"],
  }, {
    words: /(メロン|めろん)[\?？]/,
    replies: ["完熟マンゴーです。"],
  }, {
    // ミルクボーイ
    words: /忘れ(た|ました|てしまった|てもーた)/,
    replies: ["ほな、オレが一緒に考えてあげよ。"],
  }, {
    words: /違う/,
    replies: ["違うことあれへんがな!!"],
  }, {
    words: /(頂|いただ|戴)きました/,
    replies: ["こんなんなんぼあってもいいですからねぇ〜"],
  }, {
    // タカ&トシ
    words: /ミルク/,
    replies: ["欧米か!"],
  }, {
    words: /うっかり/,
    replies: ["八兵衛か!"],
  }, {
    // 笑い飯
    words: /鳥人/,
    replies: ["バッサ、バッサ"]
  }, {
    // 千鳥
    words: /北米/,
    replies: ["わたくし \"きすい館\" の女将、 \"はくべい\" でございます。"]
  }, {
    words: /はくべい/,
    replies: ["しろいたいらで \"白平\" でございます。"]
  }, {
    // うっせぇわ
    words: /(ルール|マナー)です/,
    replies: [
      "はぁ? うっせぇ、うっせぇ、うっせぇわ!",
      "あなたが思うより健康です!!",
      "一切合切凡庸なあなたじゃ分からないかもね!!!",
      "くせぇ口塞げや、限界です!!",
      "絶対絶対現代の代弁者は私やろがい!!!"
    ]
  }
];

class BotTsukkomi extends BotBase {
  get patterns() { return VOCABULARIES.map(it => it.words) }

  async run(index, match) {
    const box = VOCABULARIES[index].replies
    this.reply(box[this.getRandom(box.length)])
  }
}


module.exports = BotTsukkomi;
