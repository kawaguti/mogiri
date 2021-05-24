const BotGacha = require('./bot_gacha')

describe('ミルクボーイクラスについて', () => {
  const mockMsg = {reply: jest.fn()}
  const target = new BotGacha(mockMsg)

  beforeEach(() => {mockMsg.reply.mockClear()})
  it('ガチャが回ること', () => {
    target.commit('ガチャ')
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('こんなん出ましたぁ〜'))
  })
})
