# RoboMart demo-app

架空のロボット販売 EC サイト。Issue #22 自動改修デモの Web 対象。

## 公開URL

| 用途 | 外部URL | ローカル代替 |
|------|---------|-------------|
| RoboMart トップ | https://hermes-dev.shift-ai-adoption.org:8888/ | `http://localhost:3002/` |
| 商品一覧 API | https://hermes-dev.shift-ai-adoption.org:8888/api/robots | `http://localhost:3002/api/robots` |

## 起動

```bash
npm install
node server.js               # 内部: http://localhost:3002 / 外部: https://hermes-dev.shift-ai-adoption.org:8888 (Caddy経由)
# or
PORT=3003 node server.js     # 別ポート (SG範囲 3000-3003 内で選ぶ)
```

## API

| Method | Path | 説明 | バグ埋込 |
|:-:|:-|:-|:-:|
| GET | /api/robots | 商品一覧 | |
| GET | /api/robots/:sku | 商品詳細 | ★1 |
| GET | /api/cart | 現在のカート | |
| POST | /api/cart/items | カート追加 `{sku, qty}` | |
| POST | /api/orders | 注文確定 `{payment_method, shipping_address}` | ★2 |

## バグ発火

### ★1: PRODUCT_STOCK_ZERO_NPE
`GET /api/robots/RBT-DOG-02` (stock=0) → 500 TypeError (`.map` on undefined)

### ★2: ORDER_TOTAL_UNDEFINED_TAX
`POST /api/orders` に `payment_method: "invoice"` → 500 TypeError (`.toFixed` on undefined)

## バグ切替

`bug-config.json` の `enabled` を `false` にすると当該バグが黙る。両方 `false` にすれば通常動作するアプリになる。

## ログ

`logs/app.log` に JSON Lines 相当の1行1リクエストで出力。各行に `TrackID:` (7桁英数) を付与。

```
2026-07-17T13:00:00.123Z INFO  TrackID:ABC1234 [/api/robots/RBT-DOG-02] method=GET
2026-07-17T13:00:00.128Z ERROR TrackID:ABC1234 [/api/robots/RBT-DOG-02] method=GET status=500 err=TypeError: ... at=at getProduct (src/routes/products.js:34:33)
```

## watchdog

`node watchdog.js` で `logs/app.log` を tail し、`ERROR` 行を検知したら `../auto-repair-demo/examples/incident_management.xlsx` にインシデント行を append する。同一 TrackID は 1 行に集約 (2 件目以降は無視)。

## 画面

- `/` — 商品一覧 (ロボット4種)
- `/product/:sku` — 商品詳細
- `/cart` — カート + 注文確定フォーム (決済方法選択で invoice を選ぶとバグ2発火)
