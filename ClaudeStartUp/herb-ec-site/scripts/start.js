const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// プロジェクトルートディレクトリのパス
const rootDir = path.join(__dirname, '..');

// サーバーを起動する
console.log('ハーブECサイトサーバーを起動しています...');

// サーバープロセスを起動
const serverProcess = spawn('node', ['app.js'], {
  cwd: rootDir,
  detached: true,
  stdio: 'inherit'
});

// プロセスをバックグラウンドで実行し、親プロセスから切り離す
serverProcess.unref();

console.log(`サーバーが起動しました: http://localhost:3000`);
console.log(`サーバーのプロセスID: ${serverProcess.pid}`);
console.log('終了するには stop スクリプトを実行してください');

// プロセスIDをファイルに記録
fs.writeFileSync(path.join(rootDir, 'server.pid'), serverProcess.pid.toString());