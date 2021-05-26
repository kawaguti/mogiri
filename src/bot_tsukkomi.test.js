const BotTsukkomi = require('./bot_tsukkomi.js')

describe('ツッコミボットについて', () => {
  it('一つ以上の受付けパターンが定義されていること', () => {
    expect(BotTsukkomi.PATTERNS).toBeInstanceOf(Array)
    expect(BotTsukkomi.PATTERNS.length).toBeGreaterThan(0)
  })

  describe('', () => {
    const mockMsg = {reply: jest.fn()}
    const target = new BotTsukkomi(mockMsg)
    const EXP = /(いたしませ〜ん|それって医師免許、いりませんよね)/
  
    beforeEach(() => {mockMsg.reply.mockClear()})
    it('してください', () => {
      target.commit('してください')
      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(EXP))
    })
    it('なさい', () => {
      target.commit('書きなさい')
      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(EXP))
    })
    it('できますか', () => {
      target.commit('できますか?')
      expect(mockMsg.reply).toBeCalledTimes(1)
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('失敗し'))
    })
  })
})
