#!/bin/bash
# 図書貸出システム リストアスクリプト
# 用途: バックアップからデータベースを復元
# 実行環境: libraryユーザー
# 使用方法: ./restore.sh <backup_file>

set -euo pipefail

# 設定
readonly DB_PATH="${DATABASE_PATH:-/opt/library/data/library.db}"
readonly BACKUP_DIR="${BACKUP_DIR:-/opt/library/data/backups}"
readonly LOG_FILE="/opt/library/logs/app/restore.log"

# 色定義
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# エラーハンドリング
error_exit() {
    log_error "$1"
    exit 1
}

# 使用方法表示
show_usage() {
    cat <<EOF
使用方法: $0 <backup_file>

引数:
  backup_file    リストアするバックアップファイル名 (例: library_20250111_030000.db)

例:
  $0 library_20250111_030000.db

利用可能なバックアップファイル:
EOF

    if compgen -G "$BACKUP_DIR/library_*.db" > /dev/null; then
        ls -lh "$BACKUP_DIR"/library_*.db | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}'
    else
        echo "  (バックアップファイルが存在しません)"
    fi
}

# 引数チェック
check_arguments() {
    if [ $# -ne 1 ]; then
        show_usage
        exit 1
    fi

    BACKUP_FILE="$1"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
}

# バックアップファイル存在確認
check_backup_file() {
    if [ ! -f "$BACKUP_PATH" ]; then
        log_error "バックアップファイルが見つかりません: $BACKUP_PATH"
        echo ""
        show_usage
        exit 1
    fi

    if [ ! -r "$BACKUP_PATH" ]; then
        error_exit "バックアップファイルの読み取り権限がありません: $BACKUP_PATH"
    fi

    # バックアップファイル整合性確認
    log_step "バックアップファイル整合性確認中..."
    if sqlite3 "$BACKUP_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
        log_info "バックアップファイル整合性: OK"
    else
        error_exit "バックアップファイルが破損しています: $BACKUP_PATH"
    fi
}

# PM2ステータス確認
check_pm2_status() {
    if command -v pm2 &>/dev/null; then
        if pm2 list | grep -q "library-api"; then
            log_info "PM2でアプリケーションが管理されています"
            return 0
        fi
    fi
    log_warn "PM2が見つからないか、アプリケーションが登録されていません"
    return 1
}

# アプリケーション停止
stop_application() {
    log_step "アプリケーション停止中..."

    if check_pm2_status; then
        if pm2 stop library-api; then
            log_info "アプリケーション停止成功"
            sleep 2
        else
            log_warn "アプリケーション停止に失敗しました (続行します)"
        fi
    else
        log_warn "PM2経由でアプリケーションを停止できません"
        log_warn "手動でアプリケーションを停止してください"
        read -p "アプリケーションは停止していますか? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error_exit "リストアをキャンセルしました"
        fi
    fi
}

# 現在のDB バックアップ
backup_current_db() {
    log_step "現在のデータベースをバックアップ中..."

    if [ ! -f "$DB_PATH" ]; then
        log_warn "現在のデータベースファイルが存在しません: $DB_PATH"
        return 0
    fi

    local CURRENT_BACKUP="${DB_PATH}.before_restore_$(date +%Y%m%d_%H%M%S)"

    if cp "$DB_PATH" "$CURRENT_BACKUP"; then
        log_info "現在のDBをバックアップ: $CURRENT_BACKUP"
        chmod 640 "$CURRENT_BACKUP"

        # バックアップファイルサイズ確認
        local BACKUP_SIZE=$(du -h "$CURRENT_BACKUP" | awk '{print $1}')
        log_info "バックアップサイズ: $BACKUP_SIZE"

        # グローバル変数として保存 (ロールバック用)
        CURRENT_DB_BACKUP="$CURRENT_BACKUP"
    else
        error_exit "現在のDBのバックアップに失敗しました"
    fi
}

# リストア実行
perform_restore() {
    log_step "リストア実行中..."

    if cp "$BACKUP_PATH" "$DB_PATH"; then
        log_info "リストア成功: $BACKUP_FILE → $DB_PATH"

        # 権限設定
        chmod 640 "$DB_PATH"

        # 整合性確認
        if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
            log_info "リストア後のDB整合性: OK"
            return 0
        else
            log_error "リストア後のDB整合性: NG"
            return 1
        fi
    else
        log_error "リストア失敗"
        return 1
    fi
}

# アプリケーション起動
start_application() {
    log_step "アプリケーション起動中..."

    if check_pm2_status; then
        if pm2 start library-api; then
            log_info "アプリケーション起動成功"
            sleep 3

            # ヘルスチェック
            if pm2 list | grep -q "online.*library-api"; then
                log_info "アプリケーション状態: Online"
            else
                log_warn "アプリケーション状態: Offline (手動で確認してください)"
            fi
        else
            log_error "アプリケーション起動に失敗しました"
            return 1
        fi
    else
        log_warn "PM2経由でアプリケーションを起動できません"
        log_warn "手動でアプリケーションを起動してください"
    fi
}

# ロールバック
rollback() {
    log_error "リストアに失敗しました。ロールバック実行中..."

    if [ -n "${CURRENT_DB_BACKUP:-}" ] && [ -f "$CURRENT_DB_BACKUP" ]; then
        if cp "$CURRENT_DB_BACKUP" "$DB_PATH"; then
            log_info "元のDBに復元しました: $CURRENT_DB_BACKUP"
            chmod 640 "$DB_PATH"
        else
            log_error "ロールバックに失敗しました"
            log_error "手動で復元してください: $CURRENT_DB_BACKUP"
        fi
    fi

    # アプリケーション起動試行
    start_application || true

    error_exit "リストア失敗"
}

# リストア確認
confirm_restore() {
    echo ""
    echo "========================================"
    echo "リストア実行確認"
    echo "========================================"
    echo "リストア元: $BACKUP_FILE"
    echo "リストア先: $DB_PATH"
    echo ""
    log_warn "この操作は現在のデータベースを上書きします"
    log_warn "現在のデータベースは自動的にバックアップされます"
    echo ""
    read -p "リストアを実行しますか? (yes/NO): " -r
    echo

    if [ "$REPLY" != "yes" ]; then
        log_info "リストアをキャンセルしました"
        exit 0
    fi
}

# メイン処理
main() {
    log_info "========================================"
    log_info "図書貸出システム データベースリストア"
    log_info "========================================"

    # 引数チェック
    check_arguments "$@"

    # バックアップファイル確認
    check_backup_file

    # リストア確認
    confirm_restore

    # アプリケーション停止
    stop_application

    # 現在のDB バックアップ
    backup_current_db

    # リストア実行
    if perform_restore; then
        # アプリケーション起動
        if start_application; then
            log_info "========================================"
            log_info "リストア完了"
            log_info "========================================"
            log_info "リストア元: $BACKUP_FILE"
            log_info "現在のDBバックアップ: ${CURRENT_DB_BACKUP:-N/A}"
            echo ""
            log_info "アプリケーションログを確認してください:"
            log_info "  pm2 logs library-api"
            log_info "  tail -f /opt/library/logs/app/combined.log"

            exit 0
        else
            rollback
        fi
    else
        rollback
    fi
}

# スクリプト実行
main "$@"
