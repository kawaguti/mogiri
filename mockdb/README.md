# What is mockdb?

## 1. 概要

Eventbright のモックサーバー。 json-server で動きます。

## 2. 使用方法

### 起動

```sh
% npm run mockdb
```

### 動作確認

```sh
% curl -X GET http://localhost:3000/v3/orders
```

## 3. 同梱ファイル

- data.json
  - テストデータ
- route.json
  - ルート
- eventbrite.http 
  - テスト URL 集。 ([vscode-restclient](https://github.com/Huachao/vscode-restclient/blob/master/README.md))
