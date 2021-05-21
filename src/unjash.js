class Unjash {
  NETAS = [{
    pattern: /大島さん/,
    handler: (content) => '児島だよ'
  }, {
    pattern: /児島さん/,
    handler: (content) => 'そうだよ'
  }]

  dispatch(content) {
    for (const it of this.NETAS) {
      if (it.pattern.test(content)) {
        return it.handler(content)
      }
    }

    return null
  }
}


module.exports = Unjash;
