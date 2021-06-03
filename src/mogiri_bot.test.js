const MogiriBot = require('./mogiri_bot')

it('一つ以上の受付けパターンが定義されていること', () => {
  expect(MogiriBot.PATTERNS).toBeInstanceOf(Array)
  expect(MogiriBot.PATTERNS.length).toBeGreaterThan(0)
})

it('', async () => {
  const mockMsg = {content: '#9876543210', reply: jest.fn()}
  const target = new MogiriBot(mockMsg)

  // await expect(target.commit(message.content)).resolves.toBeUndefined()
})

it('', async () => {
  const mockMsg = {content: '#8888888888', reply: jest.fn()}
  const target = new MogiriBot(mockMsg)

  // await expect(target.commit(message.content)).resolves.toBeUndefined()
})
