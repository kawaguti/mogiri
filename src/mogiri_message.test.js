const MogoriMessage = require('./mogiri_message')

describe('For Mogiri Message', () => {
  describe('test for create', () => {
    const target = new MogoriMessage()
    it('パニックになること', () => {
      expect(target.create('HOGE')).toEqual('パニック!')
    })
    it('メッセージに期待した引数が含まれていること (NOT_FOR_THIS_EVENT)', () => {
      const result = target.create('NOT_FOR_THIS_EVENT', '123')
      expect(result).toEqual(expect.stringMatching('123'))
    })
    it('メッセージに期待した引数が含まれていること (NOT_FOUND_ON_EVENTBRITE)', () => {
      const result = target.create('NOT_FOUND_ON_EVENTBRITE', '123', 'ABC')
      expect(result).toEqual(expect.stringMatching('123'))
      expect(result).toEqual(expect.stringMatching('ABC'))
    })
  })

  describe('test for reply', () => {
    const mockMsg = {reply: jest.fn()}
    const target = new MogoriMessage(mockMsg)
    it('パニックになること', () => {
      mockMsg.reply.mockClear()
      target.reply('HOGE')
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('パニック'))
    })
    it('テーブル中のメッセージが返信されること', () => {
      mockMsg.reply.mockClear()
      target.reply('NOT_FOR_THIS_EVENT', '123')
      expect(mockMsg.reply).toBeCalledWith(expect.stringMatching('123'))
    })
  })
})
