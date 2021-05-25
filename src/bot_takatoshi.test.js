const BotTakatoshi = require('./bot_takatoshi')

describe('タカトシクラスについて', () => {
  it('一つ以上の受付けパターンが定義されていること', () => {
    expect(BotTakatoshi.PATTERNS).toBeInstanceOf(Array)
    expect(BotTakatoshi.PATTERNS.length).toBeGreaterThan(0)
  })

  const mockMsg = {reply: jest.fn()}
  const target = new BotTakatoshi(mockMsg)

  beforeEach(() => {mockMsg.reply.mockClear()})
  it('ボケに突っ込むこと1', () => {
    target.commit('ミルク')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('欧米か!')
  })
  it('ボケに突っ込むこと2', () => {
    target.commit('うっかり')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('八兵衛か!')
  })
})
