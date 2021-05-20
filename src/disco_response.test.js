const DiscoResponse = require('./disco_response')

describe('For Discord Response', () => {

  describe('test for reply', () => {
    const msg = {
      reply: jest.fn()
    }
    const target = new DiscoResponse(msg)
    it('パニックになること', () => {
      msg.reply.mockClear()
      target.reply('HOGE')
      expect(msg.reply).toBeCalledWith(expect.stringMatching('パニック'))
    })
    it('テーブル中のメッセージが返信されること', () => {
      msg.reply.mockClear()
      target.reply('NOT_FOR_THIS_EVENT', '123')
      expect(msg.reply).toBeCalledWith(expect.stringMatching('123'))
    })
  })
})
