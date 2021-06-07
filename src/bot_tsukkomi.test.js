const BotTsukkomi = require('./bot_tsukkomi.js')

describe('ツッコミボットについて', () => {
  it('一つ以上の受付けパターンが定義されていること', () => {
    const target = new BotTsukkomi()
    expect(target.patterns.length).toBeGreaterThan(0)
  })

  describe('', () => {
    const EXP = /(いたしませ〜ん|それって医師免許、いりませんよね)/

    it('してください', () => {
      const mockMsg = {content: 'してください', reply: jest.fn()}
      new BotTsukkomi().commit(mockMsg)

      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(EXP))
    })

    it('なさい', () => {
      const mockMsg = {content: '書きなさい', reply: jest.fn()}
      new BotTsukkomi().commit(mockMsg)

      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(EXP))
    })

    it('できますか', () => {
      const mockMsg = {content: 'できますか?', reply: jest.fn()}
      new BotTsukkomi().commit(mockMsg)

      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('失敗し'))
    })
  })
})
