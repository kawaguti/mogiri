const BotGacha = require('./bot_gacha')

describe('ガチャクラスについて', () => {
  it('一つ以上の受付けパターンが定義されていること', () => {
    const target = new BotGacha()
    expect(target.patterns.length).toBeGreaterThan(0)
  })

  it('ガチャが回ること', () => {
    const mockMsg = {content: 'ガチャ', reply: jest.fn()}
    new BotGacha().commit(mockMsg)

    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('こんなん出ましたぁ〜'))
  })
  it('ラッキーナンバーが回ること', () => {
    const mockMsg = {content: 'ラッキーナンバー', reply: jest.fn()}
    new BotGacha().commit(mockMsg)

    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('あなたのラッキーナンバー'))
  })
  it('一人を選ぶこと', () => {
    const mockMsg = {content: '一人選んでください 山田 田中', reply: jest.fn()}
    new BotGacha().commit(mockMsg)

    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('選ばれ'))
  })
  it('計算できること', () => {
    const mockMsg = {content: '計算してください 1+1', reply: jest.fn()}
    new BotGacha().commit(mockMsg)

    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('結果'))
  })
})
