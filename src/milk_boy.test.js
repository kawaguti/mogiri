const MilkBoy = require('./milk_boy')

describe('ミルクボーイクラスについて', () => {
  const mockMsg = {reply: jest.fn()}
  const target = new MilkBoy(mockMsg)

  beforeEach(() => {mockMsg.reply.mockClear()})
  it('ボケに突っ込むこと1', () => {
    target.commit('忘れた')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('ほな、一緒に考えてあげよ。')
  })
  it('ボケに突っ込むこと2', () => {
    target.commit('忘れてしまった')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('ほな、一緒に考えてあげよ。')
  })
  it('ボケに突っ込むこと3', () => {
    target.commit('忘れました')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('ほな、一緒に考えてあげよ。')
  })
  it('ボケに突っ込むこと4', () => {
    target.commit('違う')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith('違うことあれへんがな!!')
  })
})
