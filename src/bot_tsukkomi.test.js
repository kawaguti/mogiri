const BotTsukkomi = require('./bot_tsukkomi.js')

describe('ツッコミボットについて', () => {
  it('一つ以上の受付けパターンが定義されていること', () => {
    const target = new BotTsukkomi()
    expect(target.patterns.length).toBeGreaterThan(0)
  })

  describe('', () => {
    const EXP = /(いたしませ〜ん|それって医師免許、いりませんよね)/

    it('してください', async () => {
      const mockMsg = {cleanContent: 'してください', reply: jest.fn()}
      await new BotTsukkomi().commit(mockMsg)

      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(EXP))
    })

    it('なさい', async () => {
      const mockMsg = {cleanContent: '書きなさい', reply: jest.fn()}
      await new BotTsukkomi().commit(mockMsg)

      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(EXP))
    })

    it('できますか', async () => {
      const mockMsg = {cleanContent: 'できますか?', reply: jest.fn()}
      await new BotTsukkomi().commit(mockMsg)

      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('失敗し'))
    })

    it('ごめんなさい', async () => {
      const mockMsg = {cleanContent: 'ごめんなさい?', reply: jest.fn()}
      await new BotTsukkomi().commit(mockMsg)
      expect(mockMsg.reply).toBeCalledTimes(0)
    })
    it('分かりましたか', async () => {
      const mockMsg = {cleanContent: '分かりましたか?', reply: jest.fn()}
      await new BotTsukkomi().commit(mockMsg)
      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('御意'))
    })
  })
})
