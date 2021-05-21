const Unjash = require('./unjash')

describe('アンジャッシュクラスについて', () => {
  const target = new Unjash()
  it('ボケに突っ込むこと1', () => {
    expect(target.dispatch('大島さん')).toEqual('児島だよ')
  })
  it('ボケに突っ込むこと2', () => {
    expect(target.dispatch('児島さん')).toEqual('そうだよ')
  })
  it('null を戻すこと', () => {
    expect(target.dispatch('小島さん')).toBeNull()
  })
})
