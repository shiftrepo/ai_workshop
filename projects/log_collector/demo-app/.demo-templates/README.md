# .demo-templates

デモリセット時にコピー復元される "バグ入りの初期状態" ファイル群。

Web UI の 🔁 デモリセットボタン (POST /api/reset) 実行時、以下のファイルが demo-app 側に上書きコピーされます:

- `src/routes/products.js` — バグ1 (PRODUCT_STOCK_ZERO_NPE) の分岐入り
- `src/routes/orders.js` — バグ2 (ORDER_TOTAL_UNDEFINED_TAX) の分岐入り
- `bug-config.json` — 両バグの enabled=true

コピー後、リセットAPI が demo-app プロセス (`node server.js`) を SIGTERM で停止し、
新しい server.js を setsid で spawn し直します。

**追加バグ**: 新しいバグをデモに加えたい場合、この配下にバグ入り版のソースを保存すれば
リセット後の初期状態に含まれます。
