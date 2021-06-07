const {NotFoundRoleInGuild, NotFoundInInviteList} = require('./exception')
const BotMogiri = require('./bot_mogiri')

it('一つ以上の受付けパターンが定義されていること', () => {
  const target = new BotMogiri()
  expect(target.patterns.length).toBeGreaterThan(0)
})

describe('参照処理の分岐について', () => {
  const target = new BotMogiri()
  target.referEventBrite = jest.fn()
  target.referPermission = jest.fn()

  beforeEach(() => {
    target.referEventBrite.mockClear()
    target.referPermission.mockClear()
  })
  it('EventBrite 参照が呼ばれること', () => {
    const mockMsg = {cleanContent: '#1234567890'}
    target.commit(mockMsg)
    expect(target.referEventBrite).toBeCalledTimes(1)
    expect(target.referPermission).toBeCalledTimes(0)
  })
  it('トラック名でローカル権限チェックが呼ばれること', () => {
    const mockMsg = {cleanContent: '#京都枠'}
    target.commit(mockMsg)
    expect(target.referPermission).toBeCalledTimes(1)
    expect(target.referEventBrite).toBeCalledTimes(0)
  })
  it('イベント名でローカル権限チェックが呼ばれること', () => {
    const mockMsg = {cleanContent: '#SFO２０２１'}
    target.commit(mockMsg)
    expect(target.referPermission).toBeCalledTimes(1)
    expect(target.referEventBrite).toBeCalledTimes(0)
  })
})

describe('ロール付与について', () => {
  it('ロールが見つからない例外が出ること', () => {
    const mockMsg = {
      reply: jest.fn(),
      guild: {roles: {cache: [{name: '偽ロール'}]}}
    }
    const target = new BotMogiri()
    target.message = mockMsg
    expect(() => target.atacheDiscordRole()).toThrow(NotFoundRoleInGuild)
  })
  
  it('重複ロールのメッセージが出ること', async () => {
    const mockMsg = {
      reply: jest.fn(),
      guild: {roles: {cache: [{name: 'ロックンロール'}]}},
      member: {roles: {cache: [{name: 'ロックンロール'}]}}
    }
    const target = new BotMogiri()
    target.message = mockMsg
    target.atacheDiscordRole()
  
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(/お持ちでした/))
  })
  
  it('ロール付与のメッセージが出ること', async () => {
    const mockMsg = {
      reply: jest.fn(),
      guild: {roles: {cache: [{name: 'ロックンロール'}]}},
      member: {roles: {cache: [], add: jest.fn()}}
    }
    const target = new BotMogiri()
    target.message = mockMsg
    target.atacheDiscordRole()
  
    expect(mockMsg.member.roles.add).toBeCalledTimes(1)
    expect(mockMsg.member.roles.add).toBeCalledWith({name: 'ロックンロール'})
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(/つけました/))
  })
})

describe('ローカル権限確認について', () => {
  const target = new BotMogiri()
  target.atacheDiscordRole = jest.fn()

  it('ローカルに存在すればロール付与が呼ばれること', () => {
    const mockMsg = {author: {tag: 'Tommy109#5308'}}
    target.message = mockMsg
    target.referPermission()
    expect(target.atacheDiscordRole).toBeCalledTimes(1)
  })
  it('ローカルに存在しなければ例外になること', () => {
    const mockMsg = {author: {username: ''}}
    target.message = mockMsg
    expect(() => target.referPermission()).toThrow(NotFoundInInviteList)
  })
})