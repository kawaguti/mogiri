const config = require('config');
const fs = require('fs');
const BotBase = require('./bot_base')
const {logger} = require('./logger')
const {MogiriError, NotFoundTicketError, UsedTicketError, NotFoundRoleInGuild} = require('./exception')
const EVENT_ROLE = config.discord.roleForValidUser

// 受付番号リスト 
const { GoogleSpreadsheet } = require('google-spreadsheet');
const doc = new GoogleSpreadsheet(config.googlespreadsheet.sheetid);
const credentials = config.googlespreadsheet.credentials;

// Mogiri が動作する正規表現パターン
const PATTERNS = [
  /#(version|VERSION)/,
  /#(?<ticket>\d{7})([^\d]|$)/
]

class BotMogiri extends BotBase {
  get patterns() { return PATTERNS }

  async run(index, match) {
    const FUNCS = [
      () => {this.reply(`Mogiri Version ${process.env.npm_package_version}.`)},
      this.referPermission
    ]

    try {
      await FUNCS[index].call(this, match)
    } catch (error) {
      logger.info(error);
      this.reply(error.message);
    }
  }

  /**
   * 受付番号リストによる参加確認
   * @param {object} match result of RegExp#exec
   */
  async referPermission(match) {
    const role = this.getDiscordRole()
    if ( this.hasDiscordRole(role)) {
      return;
    }
    const {author} = this.message
    const ticket = match.groups.ticket
    if ( !await findOder(ticket,author.tag)) {
      throw new NotFoundTicketError(ticket)
    }
    
    this.reply(`${ticket} は初めての登録です。`);
    this.addDiscordRole(role)
  }

  /**
   * ロールを取得する
   * @throws NotFoundRoleInGuild
   */
    getDiscordRole() {
      const {guild} = this.message
      const role = guild.roles.cache.find(role => role.name === EVENT_ROLE);
      if (!role) {
        throw new NotFoundRoleInGuild(EVENT_ROLE)
      }
      console.log("Get role: " + role.name)
      return role;
    }

  /**
   * 付与済ロールを確認する
   */
     hasDiscordRole(role) {
      console.log("add role: " + role.name)
      const {member} = this.message
      if (member.roles.cache.some(role => role.name === EVENT_ROLE)) {
        this.reply("すでに" + role.name + "のロールをお持ちでした！");
        return true;
      }
      return false;
    }
  

  /**
   * ロールを付与する
   * @throws NotFoundRoleInGuild
   */
   addDiscordRole(role){
    const {member} = this.message
    member.roles
      .add(role)
      .then((updatedMember) => {
        console.log(updatedMember + ": " + updatedMember.user.tag )
        this.reply(role.name + "のロールをつけました！");
      })
      .catch((error) => {
        this.reply("あら、" + role.name + " のロールの付与に失敗してしまいました。スタッフが確認いたします。少々お待ちください。");
        console.log("Error: " + member.user.tag + ": " +  role.name + " : " + error.stack)
    });
  }
}

async function findOder (ticket,discordId) {
  await doc.useServiceAccountAuth(credentials);
  await doc.loadInfo();
  console.log(doc.title); 
  const sheet = doc.sheetsByTitle[config.googlespreadsheet.sheetname];
  console.log(sheet.title);
  await sheet.loadCells({ // GridRange object
    startRowIndex: config.googlespreadsheet.orderrange.startRowIndex,
    endRowIndex: config.googlespreadsheet.acceptrange.endRowIndex - config.googlespreadsheet.orderrange.startRowIndex + 1, 
    startColumnIndex:config.googlespreadsheet.orderrange.startColumnIndex, 
    endColumnIndex: config.googlespreadsheet.acceptrange.endColumnIndex - config.googlespreadsheet.orderrange.startColumnIndex + 1
  });
  for ( let j = config.googlespreadsheet.orderrange.startColumnIndex; j <= config.googlespreadsheet.orderrange.endColumnIndex; j++){
      for ( let i = config.googlespreadsheet.orderrange.startRowIndex ; i <= config.googlespreadsheet.orderrange.endRowIndex; i++) {
          const order = sheet.getCell(i, j);
          if (order.value != null ) {
            console.log ("search: " + discordId + ": " + ticket + ": " + order.value.toString()  + ": " + i + ": " + j);
            if ( ticket == order.value.toString() ){
              console.log ( "order hit! " + "AcceptedId cell: " + i + ": " + (j + config.googlespreadsheet.acceptrange.startColumnIndex));
              AcceptedId = sheet.getCell(i, j + config.googlespreadsheet.acceptrange.startColumnIndex - config.googlespreadsheet.orderrange.startColumnIndex)
              if ( AcceptedId.value != null ){
                throw new UsedTicketError(ticket)
              }else{
                AcceptedId.value = discordId;
                await AcceptedId.save()
                .then((updatedMember) => console.log("update: " + order.value.toString() + ": " + discordId ))
                .catch((error) => {
                  console.log( "Error: " + error.message +  "StackTrace: " + error.stack)
                });;
                return true;
              }
            }
          }
      }
  }
  return false;
}



module.exports = BotMogiri;
