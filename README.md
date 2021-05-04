# mogiri

Conference reception bot for Discord with Eventbrite

## About

## Installation

**Node.js 14.0.0 or newer is required.**  
Ignore any warnings about unmet peer dependencies, as they're all optional.

Please put these environment values on .env file on root dir.

```DotENV:.env
EVENTBRITE_PRIVATE_KEY={Your Evendbrite Private Key}
DISCORD_PRIVATE_KEY={Your Discord Private Key}
DISCORD_ROLE_FOR_VALIDATED_USER={Discord Role Name for Valid User}
```

To get your Eventbrite private key : <https://www.eventbrite.com/platform/api-keys>

To register your bot to your server, please see...

Setting up a bot application : <https://discordjs.guide/preparations/setting-up-a-bot-application.html>

Adding your bot to servers : <https://discordjs.guide/preparations/adding-your-bot-to-servers.html>

## Quick Example

```Shell
You> 大島さん
Bot> 児島だよ
 
You> My order number is 1234567890
Bot> @You, 1234567890は有効なEventbriteオーダー番号です。
Bot> @You, XXXのロールをつけました！

You> My order number is 1234567890
Bot> @You, あら、1234567890はEventbrite上に見当たりませんでした。10桁のOrder番号をご確認ください。
```
