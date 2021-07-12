# mogiri

Conference reception bot for Discord with Eventbrite

## About

## Installation

**Node.js 14.0.0 or newer is required.**  
Ignore any warnings about unmet peer dependencies, as they're all optional.

Please put these environment values on .env file on root dir.

```config/{development|production}.json
{
    "data" : {
        "filePath": "orders_attendees.csv"
    },

    "eventbrite" : {
        "privateKey" : "{Your Evendbrite Private Key}",
        "eventId" : "{Your Evendbrite Event ID}"
    },

    "discord" : {
        "privateKey" : "{Your Discord Private Key}",
        "roleForValidUser" : "{Discord Role Name for Valid User}
```

To get your Eventbrite private key : <https://www.eventbrite.com/platform/api-keys>

Event ID can be taken from your event management page URL, eid parameter
12-digits, <https://www.eventbrite.com/myevent?eid=123456789012>

To register your bot to your server, please see...

Setting up a bot application : <https://discordjs.guide/preparations/setting-up-a-bot-application.html>

Adding your bot to servers : <https://discordjs.guide/preparations/adding-your-bot-to-servers.html>

## config and run

in bash

```
$ export NODE_ENV=production
$ node index.js
```

in Powershell

```
PS > $env:NODE_ENV=production
PS > node index.js
```

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
