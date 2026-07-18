#!/usr/bin/env bash
set -euo pipefail

DEMO_APP="$(cd "$(dirname "$0")/../../demo-app" && pwd)"
ORCH="$(cd "$(dirname "$0")" && pwd)"
EXAMPLES="$ORCH/../examples"

echo "==> reset excel"
cp "$EXAMPLES/incident_management_template.xlsx" "$EXAMPLES/incident_management.xlsx"

echo "==> reset logs"
: > "$DEMO_APP/logs/app.log" 2>/dev/null || true

echo "==> enabled bugs:"
node -e "const b=require('$DEMO_APP/bug-config.json').bugs;for(const[k,v]of Object.entries(b))if(v.enabled)console.log('  -',k,':',v.description)"

echo "==> start demo-app"
(cd "$DEMO_APP" && node server.js > /tmp/robomart.log 2>&1 &)
sleep 1

echo "==> start watchdog"
(cd "$DEMO_APP" && node watchdog.js > /tmp/watchdog.log 2>&1 &)
sleep 1

echo "==> start web-ui (Excel閲覧+編集用WEBコンソール)"
(cd "$ORCH" && node web-ui.js > /tmp/webui.log 2>&1 &)
sleep 1
echo "    → http://localhost:${WEB_UI_PORT:-4001} をブラウザで開いてください"

APP_PORT="${PORT:-3002}"

# 演者操作でバグを発火させたい場合は --fire-bugs を渡す
if [[ " $* " == *" --fire-bugs "* ]]; then
  echo "==> trigger bugs (RoboMart at :$APP_PORT)"
  curl -s http://localhost:$APP_PORT/api/robots/RBT-DOG-02 > /dev/null || true
  curl -sc /tmp/rm.cookie -b /tmp/rm.cookie -X POST -H 'Content-Type: application/json' \
       -d '{"sku":"RBT-CAT-03","qty":1}' http://localhost:$APP_PORT/api/cart/items > /dev/null || true
  curl -sc /tmp/rm.cookie -b /tmp/rm.cookie -X POST -H 'Content-Type: application/json' \
       -d '{"payment_method":"invoice","shipping_address":"Tokyo"}' http://localhost:$APP_PORT/api/orders > /dev/null || true
  sleep 2
else
  cat <<EOM

┌────────────────────────────────────────────────────────────────────┐
│  Excel は空の状態です。ブラウザからバグを発火させてください:        │
│                                                                      │
│  1) RoboMart:  http://ec2-54-88-196-71.compute-1.amazonaws.com:3002 │
│     - "WalkyDog Mk2 (在庫切れ)" をクリック → バグ1 発火               │
│     - トップ→在庫あり商品を "カートに入れる" → カートで              │
│       決済方法「請求書払い」を選び注文確定 → バグ2 発火               │
│                                                                      │
│  2) Web UI:    http://ec2-54-88-196-71.compute-1.amazonaws.com:4001 │
│     - バグ発火後 数秒でインシデントが行として現れます                │
│                                                                      │
│  演者操作なしで自動発火させたい場合: ./run-demo.sh --fire-bugs      │
└────────────────────────────────────────────────────────────────────┘

EOM
fi

cat <<EOM
==> 準備完了。状態機械の実行は Web UI (:${WEB_UI_PORT:-4001}) から手動で操作します:
   - 各行の "▶ 進める" ボタン: 対象1件を次段へ
   - "▶ 全行を1tick進める" ボタン: 全行を1tick進める
   - "🔁 デモリセット" ボタン: Excel/ログ/PR を初期状態へ

demo-app / watchdog / web-ui はバックグラウンドで動作中。停止するには:
   pkill -f "node server.js"; pkill -f "node watchdog.js"; pkill -f "node web-ui.js"

バックグラウンド常時ポーリング運用にしたい場合 (Web UIボタンなしで自動化):
   cd $ORCH && node excel-driver.js       # 3秒毎に自動tick
EOM
