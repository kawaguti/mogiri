const {MockMessage} = require("jest-discordjs-mocks");
const MogiriBot = require('./mogiri_bot')

it('', async () => {
  const message = new MockMessage();

  message.reply = jest.fn()
  message.content = "#9876543210";
  // message.content = "#8888888888";
  const target = new MogiriBot(message)

  await expect(target.commit(message.content)).resolves.toBeUndefined()
})
