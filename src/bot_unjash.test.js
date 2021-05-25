const BotUnjash = require('./bot_unjash')

/**
 * @deprecated
 */
describe('アンジャッシュクラスについて', () => {
  const target = new BotUnjash()
  it('ボケに突っ込むこと1', () => {
    expect(target.dispatch('大島さん')).toEqual('児島だよ')
  })
  it('ボケに突っ込むこと2', () => {
    expect(target.dispatch('児島さん')).toEqual('そうだよ')
  })
  it('null を戻すこと', () => {
    expect(target.dispatch('小島さん')).toBeNull()
  })
})

describe('アンジャッシュクラスについて', () => {
  it('一つ以上の受付けパターンが定義されていること', () => {
    expect(BotUnjash.PATTERNS).toBeInstanceOf(Array)
    expect(BotUnjash.PATTERNS.length).toBeGreaterThan(0)
  })

  const mockMsg = {reply: jest.fn()}
  const target = new BotUnjash(mockMsg)

  beforeEach(() => {mockMsg.reply.mockClear()})
  it('ボケに突っ込むこと1', () => {
    target.commit('大島さん')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('児島だよ!')
  })
  it('ボケに突っ込むこと2', () => {
    target.commit('児島さん')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('そうだよ')
  })
})
