const {MockMessage} = require("jest-discordjs-mocks");
const MogiriBot = require('./mogiri_bot')

it('一つ以上の受付けパターンが定義されていること', () => {
  expect(MogiriBot.PATTERNS).toBeInstanceOf(Array)
  expect(MogiriBot.PATTERNS.length).toBeGreaterThan(0)
})

it('', async () => {

  const message = new MockMessage();

  message.reply = jest.fn()
  message.content = "#9876543210";
  // message.content = "#8888888888";
  const target = new MogiriBot(message)

  // await expect(target.commit(message.content)).resolves.toBeUndefined()
})
