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
