#!/bin/bash
# 図書貸出システム バックアップスクリプト
# 用途: SQLiteデータベースの日次バックアップ
# 実行環境: libraryユーザー
# Cron設定例: 0 3 * * * /opt/library/scripts/backup.sh

set -euo pipefail

# 設定
readonly DB_PATH="${DATABASE_PATH:-/opt/library/data/library.db}"
readonly BACKUP_DIR="${BACKUP_DIR:-/opt/library/data/backups}"
readonly RETENTION_DAYS="${RETENTION_DAYS:-30}"
readonly LOG_FILE="/opt/library/logs/app/backup.log"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly BACKUP_FILE="library_${TIMESTAMP}.db"

# 色定義
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
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

# エラーハンドリング
error_exit() {
    log_error "$1"
    exit 1
}

# データベースファイル存在確認
check_database() {
    if [ ! -f "$DB_PATH" ]; then
        error_exit "データベースファイルが見つかりません: $DB_PATH"
    fi

    if [ ! -r "$DB_PATH" ]; then
        error_exit "データベースファイルの読み取り権限がありません: $DB_PATH"
    fi
}

# バックアップディレクトリ作成
ensure_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR" || error_exit "バックアップディレクトリの作成に失敗しました: $BACKUP_DIR"
    fi
}

# ディスク空き容量確認
check_disk_space() {
    local DB_SIZE=$(du -b "$DB_PATH" | awk '{print $1}')
    local AVAILABLE_SPACE=$(df -B1 "$BACKUP_DIR" | awk 'NR==2 {print $4}')

    # 必要容量の2倍の空き容量があるか確認
    local REQUIRED_SPACE=$((DB_SIZE * 2))

    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        log_warn "ディスク空き容量が不足しています"
        log_warn "必要: $(numfmt --to=iec $REQUIRED_SPACE), 利用可能: $(numfmt --to=iec $AVAILABLE_SPACE)"
        log_warn "古いバックアップを削除してスペースを確保します"

        # 最も古いバックアップを削除
        local OLDEST_BACKUP=$(ls -t "$BACKUP_DIR"/library_*.db 2>/dev/null | tail -1)
        if [ -n "$OLDEST_BACKUP" ]; then
            rm -f "$OLDEST_BACKUP"
            log_info "古いバックアップを削除しました: $OLDEST_BACKUP"
        fi
    fi
}

# バックアップ実行
perform_backup() {
    log_info "バックアップ開始: $BACKUP_FILE"

    # SQLiteオンラインバックアップ (.backup コマンド)
    if sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/$BACKUP_FILE'"; then
        log_info "バックアップ成功: $BACKUP_FILE"

        # バックアップファイルサイズ確認
        local BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | awk '{print $1}')
        log_info "バックアップサイズ: $BACKUP_SIZE"

        # ファイル整合性検証
        if sqlite3 "$BACKUP_DIR/$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
            log_info "バックアップファイル整合性: OK"
        else
            log_error "バックアップファイル整合性: NG"
            rm -f "$BACKUP_DIR/$BACKUP_FILE"
            error_exit "バックアップファイルが破損しています"
        fi

        # バックアップファイル権限設定
        chmod 640 "$BACKUP_DIR/$BACKUP_FILE"

        return 0
    else
        log_error "バックアップ失敗"
        return 1
    fi
}

# 古いバックアップ削除
cleanup_old_backups() {
    log_info "古いバックアップの削除開始 (保持期間: ${RETENTION_DAYS}日)"

    local DELETED_COUNT=0
    while IFS= read -r OLD_BACKUP; do
        rm -f "$OLD_BACKUP"
        log_info "削除: $(basename $OLD_BACKUP)"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    done < <(find "$BACKUP_DIR" -name "library_*.db" -type f -mtime +$RETENTION_DAYS)

    if [ $DELETED_COUNT -gt 0 ]; then
        log_info "削除完了: ${DELETED_COUNT}個のバックアップファイル"
    else
        log_info "削除対象のバックアップファイルはありません"
    fi
}

# バックアップ一覧表示
show_backup_list() {
    log_info "現在のバックアップファイル一覧:"

    if compgen -G "$BACKUP_DIR/library_*.db" > /dev/null; then
        ls -lh "$BACKUP_DIR"/library_*.db | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}'

        # 合計サイズ表示
        local TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | awk '{print $1}')
        log_info "バックアップ合計サイズ: $TOTAL_SIZE"
    else
        log_warn "バックアップファイルが存在しません"
    fi
}

# バックアップ統計
show_backup_stats() {
    local BACKUP_COUNT=$(find "$BACKUP_DIR" -name "library_*.db" -type f | wc -l)
    local OLDEST_BACKUP=$(ls -t "$BACKUP_DIR"/library_*.db 2>/dev/null | tail -1)
    local NEWEST_BACKUP=$(ls -t "$BACKUP_DIR"/library_*.db 2>/dev/null | head -1)

    log_info "バックアップ統計情報:"
    log_info "  - バックアップ数: $BACKUP_COUNT"

    if [ -n "$OLDEST_BACKUP" ]; then
        local OLDEST_DATE=$(stat -c %y "$OLDEST_BACKUP" | cut -d' ' -f1)
        log_info "  - 最古のバックアップ: $(basename $OLDEST_BACKUP) ($OLDEST_DATE)"
    fi

    if [ -n "$NEWEST_BACKUP" ]; then
        local NEWEST_DATE=$(stat -c %y "$NEWEST_BACKUP" | cut -d' ' -f1)
        log_info "  - 最新のバックアップ: $(basename $NEWEST_BACKUP) ($NEWEST_DATE)"
    fi
}

# メイン処理
main() {
    log_info "========================================"
    log_info "図書貸出システム データベースバックアップ"
    log_info "========================================"

    # 事前チェック
    check_database
    ensure_backup_dir
    check_disk_space

    # バックアップ実行
    if perform_backup; then
        # 古いバックアップ削除
        cleanup_old_backups

        # バックアップ一覧表示
        show_backup_list

        # 統計情報表示
        show_backup_stats

        log_info "========================================"
        log_info "バックアップ完了"
        log_info "========================================"

        exit 0
    else
        error_exit "バックアップに失敗しました"
    fi
}

# スクリプト実行
main "$@"
