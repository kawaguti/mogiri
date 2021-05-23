const Unjash = require('./unjash')

/**
 * @deprecated
 */
describe('アンジャッシュクラスについて', () => {
  const target = new Unjash()
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
  const mockMsg = {reply: jest.fn()}
  const target = new Unjash(mockMsg)

  beforeEach(() => {mockMsg.reply.mockClear()})
  it('ボケに突っ込むこと1', () => {
    target.commit('大島さん')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('児島だよ')
  })
  it('ボケに突っ込むこと2', () => {
    target.commit('児島さん')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('そうだよ')
  })
  it('ボケに突っ込むこと2', () => {
    target.commit('児島さん、大島さん')
    expect(mockMsg.reply).toBeCalledTimes(2)
    expect(mockMsg.reply).toBeCalledWith('児島だよ')
    expect(mockMsg.reply).toBeCalledWith('そうだよ')
  })
})
