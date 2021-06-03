const {NotForRoleInGuild} = require('./exception')
const BotMogiri = require('./bot_mogiri')

it('一つ以上の受付けパターンが定義されていること', () => {
  expect(BotMogiri.PATTERNS).toBeInstanceOf(Array)
  expect(BotMogiri.PATTERNS.length).toBeGreaterThan(0)
})

it('ロールが見つからない例外が出ること', () => {
  const mockMsg = {
    reply: jest.fn(),
    guild: {roles: {cache: [{name: '偽ロール'}]}}
  }
  const target = new BotMogiri(mockMsg)
  expect(() => target.atacheDiscordRole()).toThrow(NotForRoleInGuild)
})

it('重複ロールのメッセージが出ること', async () => {
  const mockMsg = {
    reply: jest.fn(),
    guild: {roles: {cache: [{name: 'ロックンロール'}]}},
    member: {roles: {cache: [{name: 'ロックンロール'}]}}
  }
  new BotMogiri(mockMsg).atacheDiscordRole()

  expect(mockMsg.reply).toBeCalledTimes(1)
  expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(/お持ちでした/))
})

it('ロール付与のメッセージが出ること', async () => {
  const mockMsg = {
    reply: jest.fn(),
    guild: {roles: {cache: [{name: 'ロックンロール'}]}},
    member: {roles: {cache: [], add: jest.fn()}}
  }
  new BotMogiri(mockMsg).atacheDiscordRole()

  expect(mockMsg.member.roles.add).toBeCalledTimes(1)
  expect(mockMsg.member.roles.add).toBeCalledWith({name: 'ロックンロール'})
  expect(mockMsg.reply).toBeCalledTimes(1)
  expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(/つけました/))
})
