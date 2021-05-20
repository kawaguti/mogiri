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

  describe('test for messageNotForThisEvent', () => {
    const msg = {
      reply: jest.fn()
    }
    const target = new DiscoResponse(msg)
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
    const target = new DiscoResponse(msg)

    target.messageValidOrderOnEventbrite(345)
    it('reply が呼ばれること', () => {
      expect(msg.reply).toBeCalledTimes(1)
    })
    it('メッセージに ID が含まれていること', () => {
      expect(msg.reply).toBeCalledWith(expect.stringMatching('345'))
    })
  })

  describe('test for messageOverCommittedOnThisOrder', () => {
    const msg = {
      reply: jest.fn()
    }
    const target = new DiscoResponse(msg)

    target.messageOverCommittedOnThisOrder()
    it('reply が呼ばれること', () => {
      expect(msg.reply).toBeCalledTimes(1)
    })
    it('文字列が含まれていること', () => {
      expect(msg.reply).toBeCalledWith(expect.any(String))
    })
  })

  describe('test for messageNotFoundOnEventbrite', () => {
    const msg = {
      reply: jest.fn()
    }
    const target = new DiscoResponse(msg)

    target.messageNotFoundOnEventbrite('543', 'XYZ')
    it('reply が呼ばれること', () => {
      expect(msg.reply).toBeCalledTimes(1)
    })
    it('メッセージに ID が含まれていること', () => {
      expect(msg.reply).toBeCalledWith(expect.stringMatching('543'))
    })
    it('ステータスが含まれていること', () => {
      expect(msg.reply).toBeCalledWith(expect.stringMatching('XYZ'))
    })
  })

  describe('test for messageInvalidTicketStatusOnEventbrite', () => {
    describe('status が文字列の場合', () => {
      const msg = {
        reply: jest.fn()
      }
      const target = new DiscoResponse(msg)
  
      target.messageInvalidTicketStatusOnEventbrite('543', 'XYZ')
      it('reply が呼ばれること', () => {
        expect(msg.reply).toBeCalledTimes(1)
      })
      it('メッセージに ID が含まれていること', () => {
        expect(msg.reply).toBeCalledWith(expect.stringMatching('543'))
      })
      it('ステータスが含まれていること', () => {
        expect(msg.reply).toBeCalledWith(expect.stringMatching('XYZ'))
      })
    })
    describe('status が文字列ではない場合', () => {
      const msg = {
        reply: jest.fn()
      }
      const target = new DiscoResponse(msg)
  
      target.messageInvalidTicketStatusOnEventbrite('543', ['XYZ'])
      it('reply が呼ばれること', () => {
        expect(msg.reply).toBeCalledTimes(1)
      })
      it('メッセージに ID が含まれていること', () => {
        expect(msg.reply).toBeCalledWith(expect.stringMatching('543'))
      })
      it('ステータスが含まれていないいること', () => {
        expect(msg.reply).not.toBeCalledWith(expect.stringMatching('XYZ'))
      })
    })
  })
})
