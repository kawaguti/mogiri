class MogiriBot {
  static PATTERNS = []
  constructor(message) {
    this._message = message;
  }
  get message() { return this._message; }

  commit() {
    throw new Error('You have to implement the method commit!');
  }

  getRandom(max) {
    return Math.floor(Math.random() * max)
  }
}

module.exports = MogiriBot;
