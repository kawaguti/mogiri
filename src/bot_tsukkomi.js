const BotBase = require("./bot_base");

/**
 * ツッコミボット
 * 概要:
 * - パターンにマッチしたメッセージがあれば、それに紐づくツッコミを返します。
 * - 複数のパターンを登録できます。
 * - 複数のツッコミを登録できます。
 * - 複数のツッコミのうちからランダムに一つを選んで返信します。
 * - 決まった言葉のみ返信できます。変数は使えません。
 * - 変数を使いたい場合は、新たなクラスを起こしてください。
 */

const WAREHOUSE = [
  {
    name: "アンジャッシュ",
    vocabularies: [
      {
        words: [/大島さん/],
        replies: ["児島だよ"],
      }, {
        words: [/児島さん/],
        replies: ["そうだよ"],
      },
    ],
  }, {
    name: "DoctorX",
    vocabularies: [
      {
        words: [/(てくだ|な)さい/],
        replies: ["いたしませ〜ん", "それって医師免許、いりませんよね?!"],
      }, {
        words: [/ますか(\?|？)/],
        replies: ["私、失敗しませんから", "私、失敗しないので"],
      },
    ],
  }, {
    name: "ミルクボーイ",
    vocabularies: [
      {
        words: [/忘れ(た|ました|てしまった|てもーた)/],
        replies: ["ほな、オレが一緒に考えてあげよ。"],
      },
      {
        words: [/違う/],
        replies: ["違うことあれへんがな!!"],
      },
      {
        words: [/(貰|もら)(った|いました)/, /(頂|いただ|戴)きました/],
        replies: ["こんなんなんぼあってもいいですからねぇ〜"],
      }
    ]
  }, {
    name: "タカ&トシ",
    vocabularies: [
      {
        words: [/ミルク/],
        replies: ["欧米か!"],
      },
      {
        words: [/うっかり/],
        replies: ["八兵衛か!"],
      }
    ]
  }, {
    name: "笑い飯",
    vocabularies: [
      {
        words: [/鳥人/],
        replies: ["バッサ、バッサ"]
      }
    ]
  }, {
    name: "千鳥",
    vocabularies: [
      {
        words: [/北米/],
        replies: ["わたくし \"きすい館\" の女将、 \"はくべい\" でございます。"]
      }, {
        words: [/はくべい/],
        replies: ["しろいたいらで \"白平\" でございます。"]
      }
    ]
  }, {
    name: "うっせぇわ",
    vocabularies: [
      {
        words: [/ルール/],
        replies: ["はぁ? うっせぇ、うっせぇ、うっせぇわ!", "あなたが思うより健康です!!", "一切合切凡庸なあなたじゃ分からないかもね!!!"]
      }, {
        words: [/マナー/],
        replies: ["はぁ? うっせぇ、うっせぇ、うっせぇわ!", "くせぇ口塞げや、限界です!!", "絶対絶対現代の代弁者は私やろがい!!!"]
      }
    ]
  }
];

function createPatterns() {
  return WAREHOUSE.map((theme) =>
    theme.vocabularies.map((voca) => voca.words).flat()
  ).flat();
}

class BotTsukkomi extends BotBase {
  static PATTERNS = createPatterns();

  async commit() {
    WAREHOUSE.forEach((theme) => {
      theme.vocabularies.forEach((voca) => {
        voca.words.find((wd) => wd.test(this.message.content)) &&
          this.message.reply(voca.replies[this.getRandom(voca.replies.length)]);
      });
    });
  }
}


module.exports = BotTsukkomi;
