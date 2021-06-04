const BotBase = require('./bot_base')

describe('BotBase について', () => {
  it('範囲内の乱数を取得できること', () => {
    const target = new BotBase()
      expect(target.getRandom(3)).toBeLessThan(3)
  })
  it('抽象メソッド呼び出しで例外が発生すること', async () => {
    const target = new BotBase()
    await expect(target.commit()).rejects.toThrow(Error)
  })
})
