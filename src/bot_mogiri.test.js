const {NotFoundRoleInGuild} = require('./exception')
const BotMogiri = require('./bot_mogiri')

it('一つ以上の受付けパターンが定義されていること', () => {
  const target = new BotMogiri()
  expect(target.patterns.length).toBeGreaterThan(0)
})



describe('ロール付与について', () => {
  it('ロールが見つからない例外が出ること', () => {
    const mockMsg = {
      reply: jest.fn(),
      guild: {roles: {cache: [{name: '偽ロール'}]}}
    }
    const target = new BotMogiri()
    target.message = mockMsg
    expect(() => target.getDiscordRole()).toThrow(NotFoundRoleInGuild)
  })
  
  it('重複ロールのメッセージが出ること', async () => {
    const mockMsg = {
      reply: jest.fn(),
      member: {roles: {cache: [{name: 'ロックンロール'}]}}
    }
    const mockRole = {
      name: {name: 'ロックンロール'}
    }
    const target = new BotMogiri()
    target.message = mockMsg
    target.hasDiscordRole(mockRole)
  
    expect(mockMsg.reply).toBeCalledTimes(1)
    expect(mockMsg.reply).toBeCalledWith(expect.stringMatching(/お持ちでした/))
  })
  
})

