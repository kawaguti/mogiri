const {EbTicket, TicketWarehouse} = require('./ticket_man')
const {NotFoundTicketError, NotForThisEventError, InvalidTicketStatusError} = require('./exception')

const TEST_DATA_FILE = './data/test_data'

describe('Eventbrite チケットについて', () => {
  describe('初期値なしの場合において', () => {
    const target = new EbTicket()
    const exp = {id: null, limit: null, attendees: []}
    it('raw',         () => { expect(target.raw).toEqual(exp) })
    it('id',          () => { expect(target.id).toBeNull() })
    it('event_id',    () => { expect(target.event_id).toBeNull() })
    it('status',      () => { expect(target.status).toBeNull() })
    it('limit',       () => { expect(target.limit).toBeNull() })
    it('attendees',   () => { expect(target.attendees).toEqual([]) })
    it('isEffective', () => { expect(target.isEffective).toBe(false) })
  })
  describe('永続化データの復帰において', () => {
    const target = new EbTicket({id: '11', limit: 2, attendees: ['a', 'b']})
    const exp = {id: '11', limit: 2, attendees: ['a', 'b']}
    it('raw',         () => { expect(target.raw).toEqual(exp) })
    it('id',          () => { expect(target.id).toBe('11') })
    it('event_id',    () => { expect(target.event_id).toBeNull() })
    it('status',      () => { expect(target.status).toBeNull() })
    it('limit',       () => { expect(target.limit).toBe(2) })
    it('attendees',   () => { expect(target.attendees).toEqual(['a', 'b']) })
    it('isEffective', () => { expect(target.isEffective).toBe(true) })
  })
  describe('eventbrite からの生成において', () => {
    const target = new EbTicket({id: '11', event_id: 'x01', status: 'placed'})
    const exp = {id: '11', limit: null, attendees: []}
    it('raw',         () => { expect(target.raw).toEqual(exp) })
    it('id',          () => { expect(target.id).toBe('11') })
    it('event_id',    () => { expect(target.event_id).toBe('x01') })
    it('status',      () => { expect(target.status).toBe('placed') })
    it('limit',       () => { expect(target.limit).toBeNull() })
    it('attendees',   () => { expect(target.attendees).toEqual([]) })
    it('isEffective', () => { expect(target.isEffective).toBe(false) })
  })

  describe('満員判定において', () => {
    it('無効チケットは満員であること', () => {
      const target = new EbTicket()
      expect(target.isFull).toBe(true)
    })
    it('定員に満たなければ満員でないこと', () => {
      const target = new EbTicket({id: '11', limit: 2, attendees: []})
      expect(target.isFull).toBe(false)
    })
    it('定員と同数なら満員であること', () => {
      const target = new EbTicket({id: '11', limit: 2, attendees: ['a', 'b']})
      expect(target.isFull).toBe(false)
    })
    it('定員オーバーなら満員であること', () => {
      const target = new EbTicket({id: '11', limit: 2, attendees: ['a', 'b', 'c']})
      expect(target.isFull).toBe(true)
    })
  })

  describe('参加済みの確認', () => {
    const target = new EbTicket({id: '1', limit: 1, attendees: ['y']})
    it('', () => {
      expect(target.isRegisterd('y')).toBe(true)
    })
    it('', () => {
      expect(target.isRegisterd('z')).toBe(false)
    })
  })
  describe('参加者を追加できること', () => {
    const target = new EbTicket()
    it('追加できること', () => {
      target.addAttendance('yama')
      expect(target.attendees).toEqual(['yama'])
    })
    it('重複しないこと', () => {
      target.addAttendance('yama')
      target.addAttendance('yama')
      expect(target.attendees).toEqual(['yama'])
    })
    it('アルファベット順であること', () => {
      target.addAttendance('yama')
      target.addAttendance('kawa')
      expect(target.attendees).toEqual(['kawa', 'yama'])
    })
  })
})

describe('eventbrite へのチケットの問い合わせについて', () => {
  it('有効チケットを取得できること - 1234567890', async () => {
    const exp = new EbTicket({id: '1234567890', limit: 2, attendees: []})
    await expect(EbTicket.reference('1234567890', 'x01')).resolves.toEqual(exp)
  })
  it('有効チケットを取得できること - 9876543210', async () => {
    const exp = new EbTicket({id: '9876543210', limit: 1, attendees: []})
    await expect(EbTicket.reference('9876543210', 'x01')).resolves.toEqual(exp)
  })
  it('存在しないチケットで例外が発生すること - 9999999999', async () => {
    await expect(EbTicket.reference('9999999999', 'x01')).rejects.toThrow(NotFoundTicketError)
  })
  it('イベント違いで例外が発生すること - 8888888888', async () => {
    await expect(EbTicket.reference('8888888888', 'x01')).rejects.toThrow(NotForThisEventError)
  })
  it('ステータス異常で例外が発生すること - 7777777777', async () => {
    await expect(EbTicket.reference('7777777777', 'x01')).rejects.toThrow(InvalidTicketStatusError)
  })
})

describe('チケット倉庫について', () => {
  const target = new TicketWarehouse(TEST_DATA_FILE, 'y01')
  beforeAll(() => {
    target.reset()
  })

  it('', () => {
    expect(target.getEbTicket('9999')).toBeNull()
  })
  it('一件追加できること', () => {
    const ticket = new EbTicket({id: '11', limit: 2, attendees: []})
    target.addEbTicket(ticket)
    expect(target.getEbTicket('11')).toEqual(ticket)
  })
  it('二件追加で一件目を取れること', () => {
    const tickets = [
      new EbTicket({id: '111', limit: 1, attendees: [1]}),
      new EbTicket({id: '223', limit: 1, attendees: []}),
      new EbTicket({id: '111', limit: 2, attendees: [2]})
    ]

    tickets.forEach(it => target.addEbTicket(it))
    expect(target.getEbTicket('111'))
      .toEqual(new EbTicket({id: '111', limit: 2, attendees: [1, 2]}))
    expect(target.getEbTicket('223'))
      .toEqual(new EbTicket({id: '223', limit: 1, attendees: []}))
  })
})
