const BotDoctorX = require('./bot_doctorx.js')

describe('ドクターX クラスについて', () => {
  const mockMsg = {reply: jest.fn()}
  const target = new BotDoctorX(mockMsg)

  beforeEach(() => {mockMsg.reply.mockClear()})
  it('してください', () => {
    target.commit('してください')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('いたしませ〜ん'))
  })
  it('議事録', () => {
    target.commit('議事録')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('それって医師免許、いりませんよね'))
  })
})
