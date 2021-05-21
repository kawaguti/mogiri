const {
  isValidOrderOnEventbrite2,
  isForThisEvent2,
  isWatchChannel
} = require('./mogiri')

describe('test for isValidOrderOnEventbrite2', () => {
  describe('有効番号の時に', () => {
    const mockDS = {reply: jest.fn()}
    const result = isValidOrderOnEventbrite2(mockDS, '12', {status: 'placed'})
    it('true が戻ること', () => {
      expect(result).toBe(true)
    })
    it('reply が呼ばれること', () => {
      expect(mockDS.reply).toBeCalledTimes(1)
    })
    it('メッセージコードが期待したものであること', () => {
      expect(mockDS.reply).toBeCalledWith('VALID_ORDER_ON_EVENTBRITE', '12')
    })
  })
  
  describe('無効番号で、データステータスが文字列の時に', () => {
    const mockDS = {reply: jest.fn()}
    const result = isValidOrderOnEventbrite2(mockDS, '23', {status: '困'})
    it('false が戻ること', () => {
      expect(result).toBe(false)
    })
    it('reply が呼ばれること', () => {
      expect(mockDS.reply).toBeCalledTimes(1)
    })
    it('メッセージコードが期待したものであること', () => {
      expect(mockDS.reply).toBeCalledWith('INVALID_TICKET_STATUS_ON_EVENTBRITE_1', '23', '困')
    })
  })
  
  describe('無効番号で、データステータスが文字列ではない時に', () => {
    const mockDS = {reply: jest.fn()}
    const result = isValidOrderOnEventbrite2(mockDS, '23', {status: []})
    it('false が戻ること', () => {
      expect(result).toBe(false)
    })
    it('reply が呼ばれること', () => {
      expect(mockDS.reply).toBeCalledTimes(1)
    })
    it('メッセージコードが期待したものであること', () => {
      expect(mockDS.reply).toBeCalledWith('INVALID_TICKET_STATUS_ON_EVENTBRITE_2', '23', [])
    })
  })
})

describe('test for isForThisEvent2', () => {
  describe('当該イベントのオーダー番号の時に', () => {
    const mockDS = {reply: jest.fn()}
    const result = isForThisEvent2(mockDS, 'hoge', {event_id: '34'}, '34')
    it('true が戻ること', () => {
      expect(result).toBe(true)
    })
    it('reply が呼ばれないこと', () => {
      expect(mockDS.reply).toBeCalledTimes(0)
    })
  })

  describe('当該イベントのオーダー番号ではなかった時に', () => {
    const mockDS = {reply: jest.fn()}
    const result = isForThisEvent2(mockDS, 'hoge', {event_id: '34'}, '35')
    it('false が戻ること', () => {
      expect(result).toBe(false)
    })
    it('reply が呼ばれること', () => {
      expect(mockDS.reply).toBeCalledTimes(1)
    })
    it('メッセージコードが期待したものであること', () => {
      expect(mockDS.reply).toBeCalledWith('NOT_FOR_THIS_EVENT', 'hoge')
    })
  })
})

describe('test for isWatchChannel', () => {
  it('受付なら true を戻すこと', () => {
    expect(isWatchChannel('受付')).toBe(true)
  })
  it('実行委員会なら true を戻すこと', () => {
    expect(isWatchChannel('実行委員会')).toBe(true)
  })
  it('品川なら true を戻すこと', () => {
    expect(isWatchChannel('品川')).toBe(true)
  })
  it('三河なら false を戻すこと', () => {
    expect(isWatchChannel('三河')).toBe(false)
  })
})
