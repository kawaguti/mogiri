# mogiri

Conference reception bot for Discord with Eventbrite

## About

## Installation

**Node.js 20 LTS is required.**  
Ignore any warnings about unmet peer dependencies, as they're all optional.

Please put these environment values on config.json file on root dir.
Rename config.example.json is a good start.
```config.json
{
    "mogiri_response": "This is an example config.json file",
    "clientId": "1234567890123456789 <- take from Discord Developer Portal",
    "guildId": "123456789012345678 <- take from Discord Server",
    "token": "AAAAAAAAAAAAAAAAAAAAAAAA.AAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAA <- take from Discord Developer Portal",
    "conferences" : {
        "scrumfest-niigata" : {
            "eventbrite_private_key": "AAAAAAAAAAAAAAAAAAAA <- take from Eventbrite",
            "eventbrite_event_id": "123456789012 <- take from Eventbrite Event URL",
            "discord_role": "BBBBBBBB <- make this role in Discord Server"
        },
        "scrumfest-osaka" : {
            "eventbrite_private_key": "AAAAAAAAAAAAAAAAAAAA <- take from Eventbrite",
            "eventbrite_event_id": "123456789012 <- take from Eventbrite Event URL",
            "discord_role": "CCCCCCC <- make this role in Discord Server"
        }
    }
}
```

To get your Eventbrite private key : <https://www.eventbrite.com/platform/api-keys>

Event ID can be taken from your event management page URL, eid parameter 12-digits, <https://www.eventbrite.com/myevent?eid=123456789012>

To register your bot to your server, please see...

Setting up a bot application : <https://discordjs.guide/preparations/setting-up-a-bot-application.html>

Adding your bot to servers : <https://discordjs.guide/preparations/adding-your-bot-to-servers.html>

Adding your slash command to servers : <https://discordjs.guide/creating-your-bot/creating-commands.html#command-deployment-script>


## config and run
in bash
```
$ node deploy-commands.js
$ node index.js
```

in Powershell
```
PS > $ node deploy-commands.js
PS > node index.js
```

## Quick Example

```Shell
You> /mogiri
Bot> This is an example config.json file

You> /scrumfest-osaka ordernumber: 1234567890
Bot> @You, 1234567890は有効なEventbriteオーダー番号です。
Bot> @You, XXXのロールをつけました！
```
