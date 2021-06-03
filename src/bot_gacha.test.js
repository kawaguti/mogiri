const BotGacha = require('./bot_gacha')

describe('ガチャクラスについて', () => {
  it('一つ以上の受付けパターンが定義されていること', () => {
    expect(BotGacha.PATTERNS).toBeInstanceOf(Array)
    expect(BotGacha.PATTERNS.length).toBeGreaterThan(0)
  })

  it('ガチャが回ること', () => {
    const mockMsg = {content: 'ガチャ', reply: jest.fn()}
    new BotGacha(mockMsg).commit()

    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('こんなん出ましたぁ〜'))
  })
  it('ラッキーナンバーが回ること', () => {
    const mockMsg = {content: 'ラッキーナンバー', reply: jest.fn()}
    new BotGacha(mockMsg).commit()

    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('あなたのラッキーナンバー'))
  })
  it('範囲内の乱数を取得できること', () => {
    const target = new BotGacha()
      expect(target.getRandom(3)).toBeLessThan(3)
  })
})
