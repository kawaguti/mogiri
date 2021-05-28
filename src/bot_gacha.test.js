const BotGacha = require('./bot_gacha')

describe('ガチャクラスについて', () => {
  it('一つ以上の受付けパターンが定義されていること', () => {
    expect(BotGacha.PATTERNS).toBeInstanceOf(Array)
    expect(BotGacha.PATTERNS.length).toBeGreaterThan(0)
  })

  const mockMsg = {reply: jest.fn()}
  const target = new BotGacha(mockMsg)

  beforeEach(() => {mockMsg.reply.mockClear()})
  it('ガチャが回ること', () => {
    target.commit('ガチャ')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('こんなん出ましたぁ〜'))
  })
  it('ラッキーナンバーが回ること', () => {
    target.commit('ラッキーナンバー')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('あなたのラッキーナンバー'))
  })
  it('範囲内の乱数を取得できること', () => {
    expect(target.getRandom(3)).toBeLessThan(3)
  })
})
