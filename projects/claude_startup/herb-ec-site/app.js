const express = require('express');
const path = require('path');
const fs = require('fs');

// アプリケーションの初期化
const app = express();
const PORT = process.env.PORT || 3000;

// EJSをビューエンジンとして設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));

// ルーティングのインポート
const indexRoutes = require('./routes/index');

// ルーティングの設定
app.use('/', indexRoutes);

// サーバーの起動
const server = app.listen(PORT, () => {
  console.log(`ハーブECサイトサーバーが http://localhost:${PORT} で起動しました`);

  // PIDファイルの作成
  fs.writeFileSync(path.join(__dirname, 'server.pid'), process.pid.toString());
});

// 終了処理
process.on('SIGTERM', () => {
  console.log('サーバーをシャットダウンしています...');
  server.close(() => {
    console.log('サーバーが正常に終了しました');
    process.exit(0);
  });
});

module.exports = server;