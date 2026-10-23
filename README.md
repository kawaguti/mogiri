# mogiri

Conference reception bot for Discord with Pretix (and Eventbrite)

## About

Attendees run `/<conference> ordernumber:<order number>` in Discord. mogiri checks the order with the ticketing API and gives them the attendee role.

There are two versions in this repository:

| Version | Where | Status |
|---|---|---|
| Gateway bot (`index.js`, discord.js) | Azure App Service, deployed on push to `main` | **Current production** |
| Serverless (`serverless/`, Discord HTTP Interactions) | Cloudflare Workers + D1 | Prototype, Pretix only. See [serverless/README.md](serverless/README.md) (Japanese) |

The serverless version is planned to replace the Gateway bot outside event periods. Until then, the instructions below are for the Gateway bot.

## Installation (Gateway bot)

**Node.js 22 LTS or later is required.**  
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

The example above is the original Eventbrite format. Current deployments mostly use Pretix and list servers under `guilds`:

- Pretix conference: `pretix_base_url`, `pretix_organizer`, `pretix_event_slug`, `pretix_private_key`, `discord_role`, `ordernumber_for_test`
- `guilds.<name>`: `guildId`, `conferences` (list of conference names), `checkin_channel_id` (reception channel used for counting check-ins)

A conference with `pretix_private_key` is checked with Pretix; otherwise Eventbrite is used.

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
PS > node deploy-commands.js
PS > node index.js
```

## Quick Example

```Shell
You> /mogiri
Bot> This is an example config.json file

You> /rsgt2027 ordernumber: ABC12
Bot> ABC12は有効なPretixオーダー番号です。 [rsgt2027] (1/1枚目)
Bot> RSGT2027参加者のロールをつけました！
Bot> Pretixでの認証が完了しました。
```

The serverless version no longer posts the order number to the channel and replies to the attendee privately.
