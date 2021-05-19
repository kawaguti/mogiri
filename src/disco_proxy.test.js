const DiscoProxy = require('./disco_proxy')

describe('For Discord Proxy', () => {

  describe('test for messageNotForThisEvent', () => {
    const msg = {
      reply: jest.fn()
    }
    const target = new DiscoProxy(msg)
    target.messageNotForThisEvent('123')

    it('reply が呼ばれること', () => {
      expect(msg.reply).toBeCalledTimes(1)
    })
    it('メッセージに ID が含まれていること', () => {
      expect(msg.reply).toBeCalledWith(expect.stringMatching('123'))
    })
  })

  describe('test for messageValidOrderOnEventbrite', () => {
    const msg = {
      reply: jest.fn()
    }
    const target = new DiscoProxy(msg)

    target.messageValidOrderOnEventbrite(345)
    it('reply が呼ばれること', () => {
      expect(msg.reply).toBeCalledTimes(1)
    })
    it('メッセージに ID が含まれていること', () => {
      expect(msg.reply).toBeCalledWith(expect.stringMatching('345'))
    })
  })
})
