const MogoriMessage = require('./mogiri_message')

describe('For Mogiri Message', () => {
  describe('', () => {
    const mockMsg = {reply: jest.fn()}
    const target = new MogoriMessage(mockMsg)
    it('パニックになること', () => {
      expect(target.create('HOGE')).toEqual('パニック!')
    })
    it('テーブル中のメッセージが戻ること', () => {
      mockMsg.reply.mockClear()
      expect(target.create('NOT_FOR_THIS_EVENT', '123')).toEqual(expect.stringMatching('123'))
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
