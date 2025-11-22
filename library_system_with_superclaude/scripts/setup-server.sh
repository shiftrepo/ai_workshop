#!/bin/bash
# 図書貸出システム サーバーセットアップスクリプト
# 用途: 本番サーバーの初期構築とミドルウェア設定
# 実行環境: RHEL 8+, CentOS Stream 8+, Ubuntu 20.04+
# 実行権限: root

set -euo pipefail

# 色定義
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# 設定
readonly APP_ROOT="/opt/library"
readonly APP_USER="library"
readonly NODE_VERSION="20.x"

# ログ関数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# エラーハンドリング
error_exit() {
    log_error "$1"
    exit 1
}

# 実行ユーザーチェック
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error_exit "このスクリプトはroot権限で実行してください: sudo $0"
    fi
}

# OS検出
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
        log_info "OS検出: $PRETTY_NAME"
    else
        error_exit "サポートされていないOSです"
    fi
}

# パッケージマネージャー検出
detect_package_manager() {
    if command -v dnf &>/dev/null; then
        PKG_MGR="dnf"
    elif command -v yum &>/dev/null; then
        PKG_MGR="yum"
    elif command -v apt &>/dev/null; then
        PKG_MGR="apt"
    else
        error_exit "サポートされているパッケージマネージャーが見つかりません"
    fi
    log_info "パッケージマネージャー: $PKG_MGR"
}

# ディレクトリ構造作成
create_directories() {
    log_step "ディレクトリ構造作成中..."

    mkdir -p ${APP_ROOT}/{app,data,logs,scripts,config}
    mkdir -p ${APP_ROOT}/logs/{nginx,app,pm2}
    mkdir -p ${APP_ROOT}/data/backups
    mkdir -p ${APP_ROOT}/config/{nginx,pm2,ssl}

    log_info "ディレクトリ構造作成完了"
}

# アプリケーションユーザー作成
create_app_user() {
    log_step "アプリケーションユーザー作成中..."

    if id -u $APP_USER &>/dev/null; then
        log_warn "${APP_USER}ユーザーは既に存在します"
    else
        useradd -r -m -s /bin/bash $APP_USER
        log_info "${APP_USER}ユーザー作成完了"
    fi

    # 権限設定
    chown -R ${APP_USER}:${APP_USER} ${APP_ROOT}
    chmod -R 750 ${APP_ROOT}/{data,logs}

    log_info "権限設定完了"
}

# 基本パッケージインストール
install_base_packages() {
    log_step "基本パッケージインストール中..."

    if [ "$PKG_MGR" = "dnf" ] || [ "$PKG_MGR" = "yum" ]; then
        # RHEL/CentOS
        $PKG_MGR install -y epel-release || true
        $PKG_MGR install -y git wget curl vim htop openssl sqlite

    elif [ "$PKG_MGR" = "apt" ]; then
        # Ubuntu/Debian
        apt update
        apt install -y git wget curl vim htop openssl sqlite3
    fi

    log_info "基本パッケージインストール完了"
}

# Node.jsインストール
install_nodejs() {
    log_step "Node.jsインストール中..."

    if command -v node &>/dev/null; then
        NODE_VER=$(node -v)
        log_warn "Node.jsは既にインストールされています: $NODE_VER"
        read -p "再インストールしますか? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    if [ "$PKG_MGR" = "dnf" ] || [ "$PKG_MGR" = "yum" ]; then
        # RHEL/CentOS - NodeSource
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION} | bash -
        $PKG_MGR install -y nodejs

    elif [ "$PKG_MGR" = "apt" ]; then
        # Ubuntu/Debian - NodeSource
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash -
        apt install -y nodejs
    fi

    # バージョン確認
    NODE_INSTALLED=$(node -v)
    NPM_INSTALLED=$(npm -v)
    log_info "Node.js インストール完了: $NODE_INSTALLED"
    log_info "npm インストール完了: $NPM_INSTALLED"
}

# Nginxインストール
install_nginx() {
    log_step "Nginxインストール中..."

    if command -v nginx &>/dev/null; then
        NGINX_VER=$(nginx -v 2>&1 | awk -F'/' '{print $2}')
        log_warn "Nginxは既にインストールされています: $NGINX_VER"
        return
    fi

    if [ "$PKG_MGR" = "dnf" ] || [ "$PKG_MGR" = "yum" ]; then
        $PKG_MGR install -y nginx
    elif [ "$PKG_MGR" = "apt" ]; then
        apt install -y nginx
    fi

    # バージョン確認
    NGINX_INSTALLED=$(nginx -v 2>&1 | awk -F'/' '{print $2}')
    log_info "Nginx インストール完了: $NGINX_INSTALLED"

    # Nginx有効化
    systemctl enable nginx
    log_info "Nginx自動起動設定完了"
}

# PM2インストール
install_pm2() {
    log_step "PM2インストール中..."

    if command -v pm2 &>/dev/null; then
        PM2_VER=$(pm2 -v)
        log_warn "PM2は既にインストールされています: $PM2_VER"
        return
    fi

    npm install -g pm2

    # バージョン確認
    PM2_INSTALLED=$(pm2 -v)
    log_info "PM2 インストール完了: $PM2_INSTALLED"

    # PM2起動設定
    su - $APP_USER -c "pm2 startup systemd -u $APP_USER --hp /home/$APP_USER" | tail -1 | bash
    log_info "PM2自動起動設定完了"
}

# ファイアウォール設定
configure_firewall() {
    log_step "ファイアウォール設定中..."

    if command -v firewall-cmd &>/dev/null; then
        # firewalld (RHEL/CentOS)
        if systemctl is-active --quiet firewalld; then
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https
            firewall-cmd --reload
            log_info "firewalld設定完了 (HTTP/HTTPS許可)"
        else
            log_warn "firewalldが実行されていません"
        fi

    elif command -v ufw &>/dev/null; then
        # ufw (Ubuntu/Debian)
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw --force enable
        log_info "ufw設定完了 (HTTP/HTTPS許可)"

    else
        log_warn "ファイアウォールが見つかりません。手動で設定してください"
    fi
}

# SELinux設定確認
check_selinux() {
    log_step "SELinux設定確認中..."

    if command -v getenforce &>/dev/null; then
        SELINUX_STATUS=$(getenforce)
        log_info "SELinux ステータス: $SELINUX_STATUS"

        if [ "$SELINUX_STATUS" = "Enforcing" ]; then
            log_warn "SELinuxがEnforcingモードです"
            log_warn "本番環境ではEnforcingモードを推奨しますが、適切なポリシー設定が必要です"
            log_warn "開発環境でトラブルシューティング時は以下のコマンドでPermissiveモードに変更できます:"
            log_warn "  setenforce 0  (一時的)"
            log_warn "  /etc/selinux/config編集 (永続的)"
        fi
    else
        log_info "SELinuxは無効化されています"
    fi
}

# タイムゾーン設定
configure_timezone() {
    log_step "タイムゾーン設定中..."

    CURRENT_TZ=$(timedatectl | grep "Time zone" | awk '{print $3}')
    log_info "現在のタイムゾーン: $CURRENT_TZ"

    if [ "$CURRENT_TZ" != "Asia/Tokyo" ]; then
        log_warn "タイムゾーンがAsia/Tokyoではありません"
        read -p "Asia/Tokyoに変更しますか? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            timedatectl set-timezone Asia/Tokyo
            log_info "タイムゾーンをAsia/Tokyoに設定しました"
        fi
    else
        log_info "タイムゾーン設定OK"
    fi
}

# NTP時刻同期設定
configure_ntp() {
    log_step "NTP時刻同期設定中..."

    if command -v timedatectl &>/dev/null; then
        timedatectl set-ntp true
        log_info "NTP時刻同期有効化完了"

        # 同期状態確認
        sleep 2
        if timedatectl | grep -q "NTP enabled: yes"; then
            log_info "NTP同期設定: 有効"
        else
            log_warn "NTP同期設定: 失敗 (手動で確認してください)"
        fi
    else
        log_warn "timedatectlが見つかりません。手動でNTP設定してください"
    fi
}

# 自己署名SSL証明書作成
create_self_signed_cert() {
    log_step "自己署名SSL証明書作成中..."

    CERT_PATH="${APP_ROOT}/config/ssl/library.crt"
    KEY_PATH="${APP_ROOT}/config/ssl/library.key"

    if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
        log_warn "SSL証明書は既に存在します"
        read -p "再作成しますか? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_PATH" \
        -out "$CERT_PATH" \
        -subj "/C=JP/ST=Tokyo/L=Chiyoda/O=Company/OU=IT/CN=library.company.local"

    # 権限設定
    chmod 600 "$KEY_PATH"
    chmod 644 "$CERT_PATH"

    log_info "自己署名SSL証明書作成完了"
    log_warn "本番環境では社内CAから正式な証明書を取得してください"
}

# システム情報表示
show_system_info() {
    log_step "システム情報"

    echo "================================"
    echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "Kernel: $(uname -r)"
    echo "CPU: $(grep -c ^processor /proc/cpuinfo) Core(s)"
    echo "Memory: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "Disk: $(df -h / | awk 'NR==2 {print $2}')"
    echo "================================"
}

# セットアップ完了メッセージ
show_completion_message() {
    echo ""
    echo "================================"
    log_info "サーバーセットアップ完了!"
    echo "================================"
    echo ""
    echo "インストール済みソフトウェア:"
    echo "  - Node.js: $(node -v)"
    echo "  - npm: $(npm -v)"
    echo "  - Nginx: $(nginx -v 2>&1 | awk -F'/' '{print $2}')"
    echo "  - PM2: $(pm2 -v)"
    echo ""
    echo "次のステップ:"
    echo "  1. アプリケーションをデプロイしてください"
    echo "     詳細はDEPLOYMENT.mdの「4. アプリケーションデプロイ」を参照"
    echo ""
    echo "  2. Nginx設定ファイルを配置してください"
    echo "     cp config/nginx/library.conf /etc/nginx/conf.d/"
    echo "     nginx -t && systemctl restart nginx"
    echo ""
    echo "  3. PM2設定ファイルを配置してください"
    echo "     su - library"
    echo "     pm2 start config/pm2/ecosystem.config.js --env production"
    echo ""
    echo "ディレクトリ構造:"
    echo "  ${APP_ROOT}/"
    echo "  ├── app/         (アプリケーションコード)"
    echo "  ├── data/        (データベース)"
    echo "  ├── logs/        (ログファイル)"
    echo "  ├── scripts/     (運用スクリプト)"
    echo "  └── config/      (設定ファイル)"
    echo ""
    echo "================================"
}

# メイン処理
main() {
    echo "================================"
    echo "図書貸出システム サーバーセットアップ"
    echo "================================"
    echo ""

    check_root
    detect_os
    detect_package_manager
    show_system_info

    echo ""
    read -p "セットアップを開始しますか? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "セットアップをキャンセルしました"
        exit 0
    fi

    create_directories
    create_app_user
    install_base_packages
    install_nodejs
    install_nginx
    install_pm2
    configure_firewall
    check_selinux
    configure_timezone
    configure_ntp
    create_self_signed_cert

    show_completion_message
}

# スクリプト実行
main "$@"
