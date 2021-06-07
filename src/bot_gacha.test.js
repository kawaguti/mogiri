const BotGacha = require('./bot_gacha')

describe('ガチャクラスについて', () => {
  it('一つ以上の受付けパターンが定義されていること', () => {
    const target = new BotGacha()
    expect(target.patterns.length).toBeGreaterThan(0)
  })

  it('ガチャが回ること', () => {
    const target = new BotGacha()
    target.gacha = jest.fn()
    const fixtures = [
      'ガチャを回して!',
      'gacha 1000'
    ]
    fixtures.forEach(it => {
      target.gacha.mockClear()
      target.commit({cleanContent: it, reply: () => {}})
      expect(target.gacha).toBeCalledWith(expect.objectContaining({input: it}))
    })
  })

  it('ラッキーナンバーが回ること', () => {
    const mockMsg = {cleanContent: 'ラッキーナンバー', reply: jest.fn()}
    new BotGacha().commit(mockMsg)

    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('あなたのラッキーナンバー'))
  })

  it('一つを選ぶこと', () => {
    const target = new BotGacha()
    target.chooseOne = jest.fn()
    const fixtures = [
      '1つ選　 山田 田中',
      '一人選んでください 山田 田中',
      'なにかを選んでください 山田 田中',
      '誰かを選んでください 山田 田中'
    ]
    fixtures.forEach(it => {
      target.chooseOne.mockClear()
      target.commit({cleanContent: it, reply: () => {}})
      expect(target.chooseOne).toBeCalledWith(expect.objectContaining({input: it}))
    })
  })

  it('計算できること', () => {
    const target = new BotGacha()
    target.calc = jest.fn()
    const fixtures = [
      '計算 3',
      '計算してください 1+1',
      '集計 1000+20000',
      '合計 333'
    ]
    fixtures.forEach(it => {
      target.calc.mockClear()
      target.commit({cleanContent: it, reply: () => {}})
      expect(target.calc).toBeCalledWith(expect.objectContaining({input: it}))
    })
  })
})
