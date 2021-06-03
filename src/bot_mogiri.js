const config = require('config');
const BotBase = require('./bot_base')
const {logger} = require('./logger')
const {dumpAttendeesOnThisOrder} = require('./matsumoto')
const {TicketWarehouse, EbTicket} = require('./ticket_man')
const {NotFoundRoleInGuild} = require('./exception')

const DATA_PATH = ['development', 'test'].includes(process.env.NODE_ENV) ?
'./data/test_data' : './data/orders_attendees'
const EVENT_ID = config.eventbrite.eventId
const EVENT_ROLE = config.discord.roleForValidUser

const warehouse = new TicketWarehouse(DATA_PATH, EVENT_ID)

class BotMogiri extends BotBase {
  static PATTERNS = [/#(\d{10})([^\d]|$)/]

  async commit() {
    const match_strings = BotMogiri.PATTERNS[0].exec(this.message.content)
    match_strings && await this.run(match_strings[1])
  }

  async run(ticket) {
    const message = this.message
    const eb_ticket = warehouse.getEbTicket(ticket)

    if (!eb_ticket) {
      message.reply(`${ticket}は初めての問い合わせです。`);
    } else {
      if(eb_ticket.isFull) {
        message.reply('あら、登録可能な人数を超えてしまいますので、スタッフが確認いたします。少々お待ちください。');
        return;
      }

      if (eb_ticket.isRegisterd(message.author.username)) {
        //MEMO: 同じチケット番号で登録済みのケース
        message.reply(`${ticket} で ${message.author.username} さんは前に処理した記録がありますが、念のためもう一回確認しますね。`);
      } else {
        //MEMO: 同じチケット番号で未登録のケース (二人目以降)
        message.reply(`${ticket} は初めての登録です。`);
      }
      message.reply(eb_ticket.info);
    }

    try {
      //MEMO: アンダーコミットの時に eventbrite に問い合わせてしまう
      const eb_ticket = await EbTicket.reference(ticket, EVENT_ID)
      message.reply(`${ticket}は有効なEventbriteオーダー番号です。`)

      eb_ticket.addAttendance(message.author?.username);
      warehouse.addEbTicket(eb_ticket);
      this.atacheDiscordRole();
      message.reply(eb_ticket.info);
    } catch (error) {
      logger.info(error);
      message.reply(error.message);
    }
  }

  /**
   * ロールを付与する
   * @throws NotFoundRoleInGuild
   */
  atacheDiscordRole() {
    const guild = this.message.guild
    const member = this.message.member

    const role = guild.roles.cache.find(role => role.name === EVENT_ROLE);
    if (!role) {
      throw new NotFoundRoleInGuild(EVENT_ROLE)
    }
    if (member.roles.cache.some(role => role.name === EVENT_ROLE)) {
      logger.info("すでに" + role.name + "のロールをお持ちでした！");
      this.message.reply("すでに" + role.name + "のロールをお持ちでした！");
    } else {
      member.roles.add(role);
      logger.info(role.name + "のロールをつけました！");
      this.message.reply(role.name + "のロールをつけました！");
    }
  }
}


module.exports = BotMogiri;
