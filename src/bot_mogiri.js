const config = require('config');
const fs = require('fs');
const YAML = require('yaml');
const BotBase = require('./bot_base')
const {logger} = require('./logger')
const {dumpAttendeesOnThisOrder} = require('./matsumoto')
const {TicketWarehouse, EbTicket} = require('./ticket_man')
const {NotFoundRoleInGuild, NotFoundInInviteList} = require('./exception')

// EventBrite チケット管理準備
const DATA_PATH = ['development', 'test'].includes(process.env.NODE_ENV) ?
'./data/test_data' : './data/orders_attendees'
const EVENT_ID = config.eventbrite.eventId
const EVENT_ROLE = config.discord.roleForValidUser

const warehouse = new TicketWarehouse(DATA_PATH, EVENT_ID)

// 招待リスト (スポンサー、スピーカー)
const PERMISSION_FILE =  config.invitation.filePath;
const PERMISSIONS = YAML
    .parse(fs.readFileSync(PERMISSION_FILE, 'utf8'))

const { GoogleSpreadsheet } = require('google-spreadsheet');
const doc = new GoogleSpreadsheet(config.googlespreadsheet.sheetid);
const credentials = config.googlespreadsheet.credentials;

// Mogiri が動作する正規表現パターン
const PATTERNS = [
  /#(version|VERSION)/,
  /#(?<ticket>\d{10})([^\d]|$)/,
  /[#＃](大阪|札幌|三河|広島|福岡|品川|仙台|四国|栃木|京都|ベトナム|新潟|鳥取|金沢|xp祭り|学びと心理学|あじゃてく)[\s　]*枠/,
  /[#＃](SFO|ＳＦＯ)[\s　]?(2021|２０２１)/
]

class BotMogiri extends BotBase {
  get patterns() { return PATTERNS }

  async run(index, match) {
    const FUNCS = [
      () => {this.reply(`Mogiri Version ${process.env.npm_package_version}.`)},
      this.referEventBrite,
      this.referPermission,
      this.referPermission,
    ]

    try {
      await FUNCS[index].call(this, match)
    } catch (error) {
      logger.info(error);
      this.reply(error.message);
    }
  }

  /**
   * EventBrite による参加確認
   * @param {object} match result of RegExp#exec
   */
  async referEventBrite(match) {
    const {author} = this.message
    const ticket = match.groups.ticket
    const eb_ticket = warehouse.getEbTicket(ticket)

    if (!eb_ticket) {
      this.reply(`${ticket}は初めての問い合わせです。`);
    } else {
      if(eb_ticket.isFull) {
        this.reply('あら、登録可能な人数を超えてしまいますので、スタッフが確認いたします。少々お待ちください。');
        return;
      }

      if (eb_ticket.isRegisterd(author.username)) {
        //MEMO: 同じチケット番号で登録済みのケース
        this.reply(`${ticket} で ${author.username} さんは前に処理した記録がありますが、念のためもう一回確認しますね。`);
      } else {
        //MEMO: 同じチケット番号で未登録のケース (二人目以降)
        this.reply(`${ticket} は初めての登録です。`);
      }
      this.reply(eb_ticket.info);
    }

    //FIXME: refactoring で例外処理を消す。(run で行っているから)
    // ただし、アンダーコミットの時に eventbrite に問い合わせてしまうので
    // フローの見直しが必要。
    try {
      const eb_ticket = await EbTicket.reference(ticket, EVENT_ID)
      this.reply(`${ticket}は有効なEventbriteオーダー番号です。`)

      eb_ticket.addAttendance(author?.username);
      warehouse.addEbTicket(eb_ticket);
      this.atacheDiscordRole();
      this.reply(eb_ticket.info);
    } catch (error) {
      logger.info(error);
      this.reply(error.message);
    }
  }

  /**
   * 招待リストによる参加確認
   * @param {object} match result of RegExp#exec
   */
  async referPermission(match) {
    const {author} = this.message
    if (!PERMISSIONS.includes(author.tag)) {
      if ( !await findInvitaiton(author.tag)) {
        throw new NotFoundInInviteList()
      }
    }    

    this.atacheDiscordRole()
  }

  /**
   * ロールを付与する
   * @throws NotFoundRoleInGuild
   */
  atacheDiscordRole() {
    const {guild, member} = this.message

    const role = guild.roles.cache.find(role => role.name === EVENT_ROLE);
    if (!role) {
      throw new NotFoundRoleInGuild(EVENT_ROLE)
    }
    if (member.roles.cache.some(role => role.name === EVENT_ROLE)) {
      this.reply("すでに" + role.name + "のロールをお持ちでした！");
    } else {
      member.roles.add(role);
      this.reply(role.name + "のロールをつけました！");
    }
  }
}

async function findInvitaiton (discordId) {
  await doc.useServiceAccountAuth(credentials);
  await doc.loadInfo();
  console.log(doc.title); 
  const sheet = doc.sheetsByTitle[config.googlespreadsheet.sheetname];
  console.log(sheet.title);
  await sheet.loadCells(config.googlespreadsheet.loadrange);
  const scanrange = config.googlespreadsheet.scanrange;
  for ( let j = scanrange[0][0]; j< scanrange[0][1]; j++){
      for ( let i = scanrange[1][0] ; i < scanrange[1][1]; i++) {
          const a1 = sheet.getCell(i, j);
          if (a1.value != null ) {
            console.log (discordId + ": " + a1.value.toString() );
            if ( discordId == a1.value.toString() ){
              console.log ( "hit!" );
              return true;
            }
          }
      }
  }
  return false;
}



module.exports = BotMogiri;
