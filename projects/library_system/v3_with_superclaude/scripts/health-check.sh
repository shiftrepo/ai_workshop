#!/bin/bash
# 図書貸出システム ヘルスチェックスクリプト
# 用途: アプリケーションの死活監視と自動復旧
# 実行環境: libraryユーザー
# Cron設定例: */5 * * * * /opt/library/scripts/health-check.sh

set -euo pipefail

# 設定
readonly HEALTH_URL="${HEALTH_URL:-https://library.company.local/health}"
readonly MAX_RETRIES="${MAX_RETRIES:-3}"
readonly RETRY_INTERVAL="${RETRY_INTERVAL:-5}"
readonly LOG_FILE="/opt/library/logs/app/health-check.log"
readonly ALERT_LOG="/opt/library/logs/app/alert.log"
readonly TIMEOUT=10

# 色定義
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE" "$ALERT_LOG"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${GREEN}[OK]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# ヘルスチェック実行
check_health() {
    local HTTP_CODE
    local RESPONSE_TIME
    local START_TIME
    local END_TIME

    START_TIME=$(date +%s%3N)

    HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --max-time $TIMEOUT 2>/dev/null || echo "000")

    END_TIME=$(date +%s%3N)
    RESPONSE_TIME=$((END_TIME - START_TIME))

    echo "$HTTP_CODE:$RESPONSE_TIME"
}

# PM2ステータス確認
check_pm2_status() {
    if ! command -v pm2 &>/dev/null; then
        log_error "PM2がインストールされていません"
        return 1
    fi

    if pm2 list | grep -q "online.*library-api"; then
        return 0
    else
        return 1
    fi
}

# PM2再起動
restart_pm2() {
    log_warn "PM2アプリケーション再起動試行中..."

    if pm2 restart library-api; then
        log_info "PM2再起動成功"
        sleep 5
        return 0
    else
        log_error "PM2再起動失敗"
        return 1
    fi
}

# アラート送信 (拡張可能)
send_alert() {
    local MESSAGE="$1"

    # ログファイルに記録
    log_error "$MESSAGE"

    # 将来の拡張: メール送信, Slack通知など
    # if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #         --data "{\"text\":\"$MESSAGE\"}" \
    #         "$SLACK_WEBHOOK_URL"
    # fi
}

# リトライ付きヘルスチェック
health_check_with_retry() {
    local ATTEMPT=1
    local SUCCESS=false

    while [ $ATTEMPT -le $MAX_RETRIES ]; do
        log "ヘルスチェック試行 $ATTEMPT/$MAX_RETRIES"

        local RESULT=$(check_health)
        local HTTP_CODE=$(echo "$RESULT" | cut -d':' -f1)
        local RESPONSE_TIME=$(echo "$RESULT" | cut -d':' -f2)

        if [ "$HTTP_CODE" -eq 200 ]; then
            log_info "OK - HTTP $HTTP_CODE (${RESPONSE_TIME}ms)"

            # レスポンスタイム警告 (500ms超)
            if [ "$RESPONSE_TIME" -gt 500 ]; then
                log_warn "レスポンスタイムが遅延しています: ${RESPONSE_TIME}ms"
            fi

            SUCCESS=true
            break
        else
            log_warn "NG - HTTP $HTTP_CODE (試行 $ATTEMPT/$MAX_RETRIES)"

            if [ $ATTEMPT -lt $MAX_RETRIES ]; then
                log "リトライ待機中 (${RETRY_INTERVAL}秒)..."
                sleep $RETRY_INTERVAL
            fi

            ATTEMPT=$((ATTEMPT + 1))
        fi
    done

    if [ "$SUCCESS" = true ]; then
        return 0
    else
        return 1
    fi
}

# PM2プロセス詳細確認
check_pm2_details() {
    if command -v pm2 &>/dev/null; then
        log "PM2プロセス詳細:"
        pm2 list | grep library-api >> "$LOG_FILE" 2>&1 || log "PM2プロセス情報取得失敗"
    fi
}

# システムリソース確認
check_system_resources() {
    log "システムリソース:"

    # CPU使用率
    local CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    log "  CPU使用率: ${CPU_USAGE}%"

    # メモリ使用率
    local MEM_USAGE=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100}')
    log "  メモリ使用率: ${MEM_USAGE}%"

    # ディスク使用率
    local DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    log "  ディスク使用率: ${DISK_USAGE}%"

    # 高リソース使用時の警告
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        log_warn "CPU使用率が高くなっています: ${CPU_USAGE}%"
    fi

    if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
        log_warn "メモリ使用率が高くなっています: ${MEM_USAGE}%"
    fi

    if [ "$DISK_USAGE" -gt 80 ]; then
        log_warn "ディスク使用率が高くなっています: ${DISK_USAGE}%"
    fi
}

# データベース接続確認
check_database() {
    local DB_PATH="${DATABASE_PATH:-/opt/library/data/library.db}"

    if [ -f "$DB_PATH" ]; then
        if sqlite3 "$DB_PATH" "SELECT 1;" &>/dev/null; then
            log "データベース接続: OK"
        else
            log_error "データベース接続: NG (クエリ実行失敗)"
        fi
    else
        log_error "データベースファイルが存在しません: $DB_PATH"
    fi
}

# メイン処理
main() {
    # ヘルスチェック実行
    if health_check_with_retry; then
        # 正常時の追加チェック (詳細ログは記録のみ)
        check_system_resources
        exit 0
    else
        # 異常検出時
        log_error "ヘルスチェック失敗 ($MAX_RETRIES回試行)"

        # 詳細情報収集
        check_pm2_details
        check_system_resources
        check_database

        # PM2ステータス確認と再起動
        if ! check_pm2_status; then
            log_error "PM2プロセスがオフラインです"
            send_alert "図書貸出システム: アプリケーションがオフラインです (自動復旧試行中)"

            if restart_pm2; then
                # 再起動後のヘルスチェック
                sleep 10
                if health_check_with_retry; then
                    send_alert "図書貸出システム: 自動復旧成功 (PM2再起動)"
                    exit 0
                else
                    send_alert "図書貸出システム: 自動復旧失敗 (手動対応が必要)"
                    exit 1
                fi
            else
                send_alert "図書貸出システム: PM2再起動失敗 (手動対応が必要)"
                exit 1
            fi
        else
            log_error "PM2プロセスはオンラインですが、ヘルスチェックに失敗しています"
            send_alert "図書貸出システム: ヘルスチェック失敗 (プロセスはオンライン - 詳細確認が必要)"

            # 詳細エラーログ確認を促す
            log_error "詳細はアプリケーションログを確認してください:"
            log_error "  tail -f /opt/library/logs/app/error.log"
            log_error "  pm2 logs library-api"

            exit 1
        fi
    fi
}

# スクリプト実行
main "$@"
