const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// プロジェクトルートディレクトリのパス
const rootDir = path.join(__dirname, '..');
const pidFilePath = path.join(rootDir, 'server.pid');

// PIDファイルが存在するか確認
if (!fs.existsSync(pidFilePath)) {
  console.log('サーバーは実行されていません。');
  process.exit(0);
}

// PIDファイルからプロセスIDを取得
const pid = fs.readFileSync(pidFilePath, 'utf8').trim();

console.log(`サーバープロセス(PID: ${pid})を停止しています...`);

// OSに応じたプロセス終了コマンドを実行
const isWindows = process.platform === 'win32';
const killCommand = isWindows ? `taskkill /PID ${pid} /F` : `kill -15 ${pid}`;

exec(killCommand, (error, stdout, stderr) => {
  if (error) {
    console.log(`サーバーの停止中にエラーが発生しました: ${error.message}`);
    console.log('サーバープロセスがすでに終了している可能性があります。');
  } else {
    console.log('サーバーが正常に停止しました。');
  }

  // PIDファイルを削除
  try {
    fs.unlinkSync(pidFilePath);
  } catch (err) {
    console.log(`PIDファイルの削除中にエラーが発生しました: ${err.message}`);
  }
});