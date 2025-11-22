#!/bin/bash

# 本番環境セットアップ例スクリプト - AWS EC2環境
# Production Environment Setup Example - AWS EC2 Environment

set -e

echo "🌍 Log Collector Tool - 本番環境セットアップ開始"
echo "=============================================================="

# 1. 環境変数設定
echo "📋 1. 環境変数設定中..."

cat > ~/.log-collector-env << 'EOF'
# Log Collector Tool 本番環境設定
export SSH_HOST_1="ec2-203-0-113-12.compute-1.amazonaws.com"
export SSH_HOST_2="ec2-203-0-113-13.compute-1.amazonaws.com"
export SSH_HOST_3="ec2-203-0-113-14.compute-1.amazonaws.com"
export SSH_PORT_1=22
export SSH_PORT_2=22
export SSH_PORT_3=22
export SSH_USER="ec2-user"
export SSH_KEY_PATH="/opt/log-collector/keys/production-keypair.pem"
export INPUT_FOLDER="/opt/log-collector/input"
export OUTPUT_FOLDER="/opt/log-collector/output"
export LOG_PATTERN_FILE="/opt/log-collector/config/log-patterns.json"
EOF

# 環境変数を読み込み
source ~/.log-collector-env
echo "✅ 環境変数設定完了"

# 2. ディレクトリ作成
echo "📁 2. ディレクトリ構造作成中..."
sudo mkdir -p /opt/log-collector/{input,output,config,keys,logs}
sudo chown -R $(whoami):$(whoami) /opt/log-collector
echo "✅ ディレクトリ構造作成完了"

# 3. アプリケーションファイルコピー
echo "📦 3. アプリケーションファイル配置中..."

# 必要ファイルをコピー（この例では現在のディレクトリから）
cp package.json /opt/log-collector/
cp log-collection-skill.js /opt/log-collector/
cp log-collection-csv.js /opt/log-collector/
cp examples/log-patterns.json /opt/log-collector/config/
cp examples/task_management_sample.xlsx /opt/log-collector/input/

echo "✅ アプリケーションファイル配置完了"

# 4. 依存関係インストール
echo "🔧 4. 依存関係インストール中..."
cd /opt/log-collector
npm install --production --silent
echo "✅ 依存関係インストール完了"

# 5. SSH鍵設定（実際の環境では手動で配置）
echo "🔑 5. SSH鍵設定..."
echo "⚠️  注意: 実際のSSH秘密鍵を ${SSH_KEY_PATH} に配置してください"
echo "   例: scp your-key.pem user@server:${SSH_KEY_PATH}"
echo "   権限: chmod 600 ${SSH_KEY_PATH}"

# 6. ログ設定
echo "📝 6. ログ設定..."
cat > /opt/log-collector/config/log4js-config.json << 'EOF'
{
  "appenders": {
    "file": {
      "type": "file",
      "filename": "/opt/log-collector/logs/application.log",
      "maxLogSize": 10485760,
      "backups": 5
    },
    "console": {
      "type": "console"
    }
  },
  "categories": {
    "default": {
      "appenders": ["file", "console"],
      "level": "info"
    }
  }
}
EOF
echo "✅ ログ設定完了"

# 7. 実行スクリプト作成
echo "🚀 7. 実行スクリプト作成..."
cat > /opt/log-collector/run-log-collection.sh << 'EOF'
#!/bin/bash
# Log Collection 実行スクリプト

# 環境変数読み込み
source ~/.log-collector-env

# 実行ディレクトリに移動
cd /opt/log-collector

# ログ収集実行
echo "[$(date)] Log Collection 開始" >> logs/execution.log
node log-collection-skill.js 2>&1 | tee -a logs/execution.log
EXIT_CODE=${PIPESTATUS[0]}

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date)] Log Collection 正常終了" >> logs/execution.log
else
    echo "[$(date)] Log Collection エラー終了 (Exit Code: $EXIT_CODE)" >> logs/execution.log
fi

exit $EXIT_CODE
EOF

chmod +x /opt/log-collector/run-log-collection.sh
echo "✅ 実行スクリプト作成完了"

# 8. Cron設定例
echo "⏰ 8. スケジュール実行設定例..."
cat > /tmp/log-collector-cron << 'EOF'
# Log Collector Tool - 毎日午前9時に実行
0 9 * * * /opt/log-collector/run-log-collection.sh
# エラーログ監視 - 毎時0分にエラーチェック
0 * * * * /opt/log-collector/check-errors.sh
EOF

echo "   Cron設定を追加するには:"
echo "   crontab -l > /tmp/current-cron"
echo "   cat /tmp/log-collector-cron >> /tmp/current-cron"
echo "   crontab /tmp/current-cron"
echo "✅ スケジュール設定例作成完了"

# 9. ヘルスチェックスクリプト
echo "🏥 9. ヘルスチェックスクリプト作成..."
cat > /opt/log-collector/health-check.sh << 'EOF'
#!/bin/bash
# ヘルスチェックスクリプト

echo "🏥 Log Collector Tool ヘルスチェック"
echo "=================================="

# 1. Node.js確認
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js: インストールされていません"
    exit 1
fi

# 2. 依存関係確認
cd /opt/log-collector
if npm ls --depth=0 >/dev/null 2>&1; then
    echo "✅ 依存関係: OK"
else
    echo "❌ 依存関係: 不足またはエラー"
    exit 1
fi

# 3. SSH接続テスト
source ~/.log-collector-env
echo "🔑 SSH接続テスト:"

for i in 1 2 3; do
    HOST_VAR="SSH_HOST_$i"
    PORT_VAR="SSH_PORT_$i"
    HOST=${!HOST_VAR}
    PORT=${!PORT_VAR}

    if ssh -i "${SSH_KEY_PATH}" -p "${PORT}" "${SSH_USER}@${HOST}" -o ConnectTimeout=10 -o BatchMode=yes "echo 'OK'" >/dev/null 2>&1; then
        echo "  ✅ Server $i ($HOST:$PORT): 接続OK"
    else
        echo "  ❌ Server $i ($HOST:$PORT): 接続失敗"
    fi
done

# 4. ディスク容量確認
DISK_USAGE=$(df /opt/log-collector | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    echo "✅ ディスク使用量: ${DISK_USAGE}%"
else
    echo "⚠️  ディスク使用量: ${DISK_USAGE}% (警告: 90%超過)"
fi

echo "=================================="
echo "ヘルスチェック完了"
EOF

chmod +x /opt/log-collector/health-check.sh
echo "✅ ヘルスチェックスクリプト作成完了"

# 10. 動作確認
echo "🧪 10. 動作確認..."
cd /opt/log-collector

# 設定確認
echo "   設定確認:"
echo "     Input Folder: ${INPUT_FOLDER}"
echo "     Output Folder: ${OUTPUT_FOLDER}"
echo "     SSH Key Path: ${SSH_KEY_PATH}"

# ファイル存在確認
if [ -f log-collection-skill.js ] && [ -f package.json ]; then
    echo "   ✅ 必要ファイル: 存在確認"
else
    echo "   ❌ 必要ファイル: 不足"
fi

# 権限確認
if [ -w "${OUTPUT_FOLDER}" ]; then
    echo "   ✅ 出力権限: OK"
else
    echo "   ❌ 出力権限: 不足"
fi

echo ""
echo "=============================================================="
echo "🎉 本番環境セットアップ完了"
echo "=============================================================="
echo ""
echo "📋 次のステップ:"
echo "   1. SSH秘密鍵を ${SSH_KEY_PATH} に配置"
echo "   2. 鍵の権限設定: chmod 600 ${SSH_KEY_PATH}"
echo "   3. SSH接続テスト: ./health-check.sh"
echo "   4. 手動実行テスト: ./run-log-collection.sh"
echo "   5. Cron設定追加"
echo ""
echo "📞 サポート:"
echo "   - 設定ファイル: ~/.log-collector-env"
echo "   - ログファイル: /opt/log-collector/logs/"
echo "   - ヘルスチェック: ./health-check.sh"
echo ""
echo "✅ Log Collector Tool は別環境で動作準備完了"