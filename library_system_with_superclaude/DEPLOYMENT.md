# 図書貸出システム 本番デプロイメントガイド

**作成日**: 2025-01-11
**バージョン**: 1.0
**対象環境**: 社内Linuxサーバー（RHEL/CentOS/Ubuntu）
**関連文書**: ARCHITECTURE.md, CI_CD_GUIDE.md, SECURITY.md

---

## 目次

1. [本番環境アーキテクチャ](#1-本番環境アーキテクチャ)
2. [事前準備](#2-事前準備)
3. [サーバーセットアップ](#3-サーバーセットアップ)
4. [アプリケーションデプロイ](#4-アプリケーションデプロイ)
5. [モニタリング設定](#5-モニタリング設定)
6. [バックアップ設定](#6-バックアップ設定)
7. [運用手順](#7-運用手順)
8. [トラブルシューティング](#8-トラブルシューティング)

---

## 1. 本番環境アーキテクチャ

### 1.1 システム構成図

```
┌───────────────────────────────────────────────────────────────┐
│                      社内ネットワーク                            │
│                                                                 │
│  ┌─────────────────┐         ┌──────────────────┐            │
│  │  社内ユーザー      │ ───────▶│  ファイアウォール  │            │
│  │  (ブラウザ)        │         │  Port: 80, 443   │            │
│  └─────────────────┘         └──────────────────┘            │
│                                       │                         │
│                                       ▼                         │
│              ┌─────────────────────────────────────┐           │
│              │    Nginx Reverse Proxy              │           │
│              │    Port: 80 (HTTP) / 443 (HTTPS)    │           │
│              │    - SSL/TLS Termination            │           │
│              │    - Static File Serving            │           │
│              │    - Gzip Compression               │           │
│              │    - Request Logging                │           │
│              └─────────────────────────────────────┘           │
│                              │                                  │
│                              ▼                                  │
│              ┌─────────────────────────────────────┐           │
│              │    Node.js API Server (PM2)         │           │
│              │    Port: 3000 (Internal)            │           │
│              │    - Express.js Application         │           │
│              │    - Cluster Mode (2 instances)     │           │
│              │    - Auto-restart on failure        │           │
│              │    - Memory/CPU Monitoring          │           │
│              └─────────────────────────────────────┘           │
│                              │                                  │
│                              ▼                                  │
│              ┌─────────────────────────────────────┐           │
│              │    SQLite Database                  │           │
│              │    Path: /opt/library/data/library.db│          │
│              │    - WAL Mode (Write-Ahead Logging) │           │
│              │    - Daily Backup (Cron)            │           │
│              │    - Transaction Support            │           │
│              └─────────────────────────────────────┘           │
│                                                                 │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                      外部サービス (Optional)                     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Log Viewer   │  │ Backup Server │  │ Monitoring   │        │
│  │  (Graylog)    │  │  (NAS/CIFS)   │  │ (Prometheus) │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└───────────────────────────────────────────────────────────────┘
```

### 1.2 ディレクトリ構造

```
/opt/library/                       # アプリケーションルート
├── app/                            # アプリケーションコード
│   ├── server/                     # バックエンド (Node.js)
│   │   ├── node_modules/
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env.production
│   └── client/                     # フロントエンド (ビルド済み静的ファイル)
│       └── dist/
│           ├── index.html
│           ├── assets/
│           └── favicon.ico
├── data/                           # データベース
│   ├── library.db                  # 本番DB
│   └── backups/                    # バックアップ保存先
│       ├── library_20250111_0300.db
│       └── library_20250110_0300.db
├── logs/                           # ログファイル
│   ├── nginx/                      # Nginxログ
│   │   ├── access.log
│   │   └── error.log
│   ├── app/                        # アプリケーションログ
│   │   ├── combined.log
│   │   ├── error.log
│   │   └── access.log
│   └── pm2/                        # PM2ログ
│       ├── library-api-out.log
│       └── library-api-error.log
├── scripts/                        # 運用スクリプト
│   ├── backup.sh                   # バックアップスクリプト
│   ├── restore.sh                  # リストアスクリプト
│   ├── health-check.sh             # ヘルスチェック
│   └── deploy.sh                   # デプロイスクリプト
└── config/                         # 設定ファイル
    ├── nginx/                      # Nginx設定
    │   └── library.conf
    ├── pm2/                        # PM2設定
    │   └── ecosystem.config.js
    └── ssl/                        # SSL証明書 (自己署名または社内CA)
        ├── library.crt
        └── library.key
```

### 1.3 システム要件

#### ハードウェア要件（最小/推奨）

| リソース | 最小 | 推奨 | 備考 |
|---------|-----|------|------|
| CPU | 2 Core | 4 Core | PM2クラスタ2インスタンス想定 |
| メモリ | 2 GB | 4 GB | OS + Nginx + Node.js + SQLite |
| ディスク | 20 GB | 50 GB | ログ・バックアップ保存領域含む |
| ネットワーク | 100 Mbps | 1 Gbps | 社内LAN |

#### ソフトウェア要件

| ソフトウェア | バージョン | 用途 |
|------------|-----------|------|
| OS | RHEL 8+, CentOS 8+, Ubuntu 20.04+ | 本番サーバー |
| Node.js | 18.x LTS または 20.x LTS | バックエンド実行環境 |
| npm | 9.x+ | パッケージ管理 |
| Nginx | 1.20+ | リバースプロキシ・静的ファイル配信 |
| PM2 | 5.x+ | Node.jsプロセス管理 |
| SQLite | 3.35+ | データベース |
| Git | 2.x+ | デプロイメント |

---

## 2. 事前準備

### 2.1 サーバー準備チェックリスト

- [ ] サーバーOSインストール完了
- [ ] root/sudo権限を持つユーザーアカウント作成
- [ ] SSH公開鍵認証設定完了
- [ ] ファイアウォール設定 (80/443ポート開放)
- [ ] SELinux設定確認 (Enforcing/Permissive)
- [ ] タイムゾーン設定 (Asia/Tokyo)
- [ ] NTPによる時刻同期設定

### 2.2 ネットワーク設定

#### 固定IPアドレス設定

```bash
# /etc/sysconfig/network-scripts/ifcfg-eth0 (RHEL/CentOS)
BOOTPROTO=static
IPADDR=192.168.1.100
NETMASK=255.255.255.0
GATEWAY=192.168.1.1
DNS1=192.168.1.10
```

#### ホスト名設定

```bash
# ホスト名設定
sudo hostnamectl set-hostname library-server

# /etc/hosts 編集
echo "192.168.1.100  library.company.local library-server" | sudo tee -a /etc/hosts
```

#### ファイアウォール設定

```bash
# RHEL/CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2.3 システムユーザー作成

```bash
# libraryユーザー作成 (アプリケーション実行用)
sudo useradd -r -m -s /bin/bash library

# ディレクトリ作成
sudo mkdir -p /opt/library/{app,data,logs,scripts,config}
sudo chown -R library:library /opt/library
```

### 2.4 必要なパッケージインストール

#### RHEL/CentOS Stream

```bash
# EPEL有効化
sudo dnf install -y epel-release

# 基本パッケージ
sudo dnf install -y git wget curl vim htop

# Node.js (NodeSource)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Nginx
sudo dnf install -y nginx

# SQLite
sudo dnf install -y sqlite

# PM2 (グローバル)
sudo npm install -g pm2

# PM2起動設定
sudo pm2 startup systemd -u library --hp /home/library
```

#### Ubuntu

```bash
# パッケージ更新
sudo apt update && sudo apt upgrade -y

# 基本パッケージ
sudo apt install -y git wget curl vim htop

# Node.js (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx
sudo apt install -y nginx

# SQLite
sudo apt install -y sqlite3

# PM2 (グローバル)
sudo npm install -g pm2

# PM2起動設定
sudo pm2 startup systemd -u library --hp /home/library
```

---

## 3. サーバーセットアップ

### 3.1 自動セットアップスクリプト

`/opt/library/scripts/setup.sh`を作成します。

```bash
#!/bin/bash
set -euo pipefail

# 色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 実行ユーザーチェック
if [ "$EUID" -ne 0 ]; then
    log_error "このスクリプトはroot権限で実行してください"
    exit 1
fi

log_info "図書貸出システム サーバーセットアップ開始"

# 1. ディレクトリ作成
log_info "ディレクトリ構造作成中..."
mkdir -p /opt/library/{app,data,logs,scripts,config}
mkdir -p /opt/library/logs/{nginx,app,pm2}
mkdir -p /opt/library/data/backups
mkdir -p /opt/library/config/{nginx,pm2,ssl}

# 2. libraryユーザー作成
if ! id -u library &>/dev/null; then
    log_info "libraryユーザー作成中..."
    useradd -r -m -s /bin/bash library
else
    log_warn "libraryユーザーは既に存在します"
fi

# 3. 権限設定
log_info "権限設定中..."
chown -R library:library /opt/library
chmod -R 750 /opt/library/{data,logs}

# 4. Node.js確認
if ! command -v node &>/dev/null; then
    log_error "Node.jsがインストールされていません"
    log_info "NodeSource公式スクリプトでインストールしてください:"
    log_info "curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -"
    exit 1
else
    NODE_VERSION=$(node -v)
    log_info "Node.js バージョン: $NODE_VERSION"
fi

# 5. Nginx確認
if ! command -v nginx &>/dev/null; then
    log_error "Nginxがインストールされていません"
    log_info "以下のコマンドでインストールしてください:"
    log_info "dnf install -y nginx  (RHEL/CentOS)"
    log_info "apt install -y nginx  (Ubuntu)"
    exit 1
else
    NGINX_VERSION=$(nginx -v 2>&1 | awk -F'/' '{print $2}')
    log_info "Nginx バージョン: $NGINX_VERSION"
fi

# 6. PM2確認
if ! command -v pm2 &>/dev/null; then
    log_info "PM2インストール中..."
    npm install -g pm2
else
    PM2_VERSION=$(pm2 -v)
    log_info "PM2 バージョン: $PM2_VERSION"
fi

# 7. ファイアウォール設定
if command -v firewall-cmd &>/dev/null; then
    log_info "ファイアウォール設定中 (firewalld)..."
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
elif command -v ufw &>/dev/null; then
    log_info "ファイアウォール設定中 (ufw)..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
fi

# 8. SELinux設定 (RHEL/CentOS)
if command -v getenforce &>/dev/null; then
    SELINUX_STATUS=$(getenforce)
    log_info "SELinux ステータス: $SELINUX_STATUS"

    if [ "$SELINUX_STATUS" = "Enforcing" ]; then
        log_warn "SELinuxがEnforcingモードです。必要に応じてポリシー設定を行ってください。"
        log_info "一時的にPermissiveモードにする場合: setenforce 0"
    fi
fi

log_info "セットアップ完了!"
log_info "次のステップ: アプリケーションデプロイ"
log_info "手順はDEPLOYMENT.mdの「4. アプリケーションデプロイ」を参照してください"
```

#### セットアップスクリプト実行

```bash
# スクリプトに実行権限付与
sudo chmod +x /opt/library/scripts/setup.sh

# スクリプト実行
sudo /opt/library/scripts/setup.sh
```

### 3.2 Nginx設定

`/opt/library/config/nginx/library.conf`を作成します。

```nginx
# Upstream定義 (PM2クラスタバックエンド)
upstream library_backend {
    least_conn;  # 最小接続数ベースのロードバランシング
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTPサーバー (HTTPSへリダイレクト)
server {
    listen 80;
    server_name library.company.local;

    # HTTPからHTTPSへリダイレクト
    return 301 https://$server_name$request_uri;
}

# HTTPSサーバー
server {
    listen 443 ssl http2;
    server_name library.company.local;

    # SSL証明書設定
    ssl_certificate /opt/library/config/ssl/library.crt;
    ssl_certificate_key /opt/library/config/ssl/library.key;

    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # ログ設定
    access_log /opt/library/logs/nginx/access.log combined;
    error_log /opt/library/logs/nginx/error.log warn;

    # Gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/json application/javascript;

    # 静的ファイル配信 (Vue.js SPA)
    location / {
        root /opt/library/app/client/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # APIリクエストをバックエンドへプロキシ
    location /api/ {
        proxy_pass http://library_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # ヘルスチェックエンドポイント
    location /health {
        proxy_pass http://library_backend;
        access_log off;
    }

    # 静的アセット (長期キャッシュ)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        root /opt/library/app/client/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Nginx設定有効化

```bash
# 設定ファイルをNginx設定ディレクトリにシンボリックリンク
sudo ln -s /opt/library/config/nginx/library.conf /etc/nginx/conf.d/library.conf

# 設定ファイル文法チェック
sudo nginx -t

# Nginx起動・有効化
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

### 3.3 自己署名SSL証明書作成

```bash
# 自己署名証明書作成 (開発・社内環境用)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/library/config/ssl/library.key \
  -out /opt/library/config/ssl/library.crt \
  -subj "/C=JP/ST=Tokyo/L=Chiyoda/O=Company/OU=IT/CN=library.company.local"

# 権限設定
sudo chmod 600 /opt/library/config/ssl/library.key
sudo chmod 644 /opt/library/config/ssl/library.crt
```

**注意**: 本番環境では社内CAから正式な証明書を取得することを推奨します。

### 3.4 PM2設定

`/opt/library/config/pm2/ecosystem.config.js`を作成します。

```javascript
module.exports = {
  apps: [
    {
      name: 'library-api',
      script: '/opt/library/app/server/src/server.js',
      instances: 2,  // CPUコア数に応じて調整
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/opt/library/logs/pm2/library-api-error.log',
      out_file: '/opt/library/logs/pm2/library-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000
    }
  ]
};
```

---

## 4. アプリケーションデプロイ

### 4.1 方法1: GitHub経由デプロイ（推奨）

```bash
# libraryユーザーに切り替え
sudo su - library

# アプリケーションクローン
cd /opt/library/app
git clone https://github.com/your-org/library-system.git .

# バックエンド依存関係インストール
cd /opt/library/app/server
npm ci --production

# データベース初期化
npm run db:init
npm run db:seed

# フロントエンドビルド
cd /opt/library/app/client
npm ci
npm run build

# ビルド済みファイルを配置
# (npm run buildで生成されたdist/ディレクトリが既に存在)
```

### 4.2 方法2: ビルド済みアーカイブデプロイ

```bash
# CI/CDでビルド済みアーカイブをサーバーにアップロード
scp library-system-v1.0.0.tar.gz library@library-server:/tmp/

# libraryユーザーに切り替え
sudo su - library

# アーカイブ展開
cd /opt/library/app
tar -xzf /tmp/library-system-v1.0.0.tar.gz

# バックエンド依存関係インストール
cd /opt/library/app/server
npm ci --production

# データベース初期化
npm run db:init
npm run db:seed
```

### 4.3 環境変数設定

`/opt/library/app/server/.env.production`を作成します。

```bash
# Node.js環境
NODE_ENV=production

# サーバー設定
PORT=3000
HOST=127.0.0.1

# データベース
DATABASE_PATH=/opt/library/data/library.db

# セッション
SESSION_SECRET=YOUR_STRONG_RANDOM_SECRET_KEY_HERE_CHANGE_THIS_IN_PRODUCTION

# セキュリティ
COOKIE_SECURE=true
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=strict

# ログ
LOG_LEVEL=info
LOG_FILE=/opt/library/logs/app/combined.log
ERROR_LOG_FILE=/opt/library/logs/app/error.log
```

**重要**: `SESSION_SECRET`は以下のコマンドで生成してください:

```bash
openssl rand -base64 32
```

### 4.4 PM2起動

```bash
# libraryユーザーで実行
cd /opt/library/app/server

# PM2でアプリケーション起動
pm2 start /opt/library/config/pm2/ecosystem.config.js --env production

# 起動確認
pm2 status
pm2 logs library-api --lines 50

# PM2起動設定保存
pm2 save
```

### 4.5 デプロイ確認

```bash
# ヘルスチェック
curl -k https://library.company.local/health

# 期待される出力: {"status":"ok","timestamp":"2025-01-11T12:00:00.000Z"}

# ログ確認
tail -f /opt/library/logs/app/combined.log
```

---

## 5. モニタリング設定

### 5.1 PM2モニタリング

```bash
# PM2ダッシュボード表示
pm2 monit

# プロセス詳細
pm2 show library-api

# リソース使用状況
pm2 list
```

### 5.2 ヘルスチェックスクリプト

`/opt/library/scripts/health-check.sh`を作成します。

```bash
#!/bin/bash
set -euo pipefail

HEALTH_URL="https://library.company.local/health"
LOG_FILE="/opt/library/logs/app/health-check.log"

timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

# ヘルスチェック実行
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --max-time 10)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "[$(timestamp)] OK - HTTP $HTTP_CODE" >> "$LOG_FILE"
    exit 0
else
    echo "[$(timestamp)] ERROR - HTTP $HTTP_CODE" >> "$LOG_FILE"

    # PM2再起動試行
    echo "[$(timestamp)] Attempting PM2 restart..." >> "$LOG_FILE"
    pm2 restart library-api

    exit 1
fi
```

#### Cronジョブ設定

```bash
# libraryユーザーのcrontab編集
sudo su - library
crontab -e

# 5分ごとにヘルスチェック
*/5 * * * * /opt/library/scripts/health-check.sh
```

### 5.3 ログローテーション設定

`/etc/logrotate.d/library`を作成します。

```
/opt/library/logs/app/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 library library
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/opt/library/logs/nginx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 nginx nginx
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
```

---

## 6. バックアップ設定

### 6.1 バックアップスクリプト

`/opt/library/scripts/backup.sh`を作成します。

```bash
#!/bin/bash
set -euo pipefail

# 設定
DB_PATH="/opt/library/data/library.db"
BACKUP_DIR="/opt/library/data/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="library_${TIMESTAMP}.db"
LOG_FILE="/opt/library/logs/app/backup.log"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# バックアップディレクトリ作成
mkdir -p "$BACKUP_DIR"

log "バックアップ開始: $BACKUP_FILE"

# SQLiteバックアップ (オンラインバックアップ)
if sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/$BACKUP_FILE'"; then
    log "バックアップ成功: $BACKUP_FILE"

    # バックアップファイルサイズ確認
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | awk '{print $1}')
    log "バックアップサイズ: $BACKUP_SIZE"

    # 古いバックアップ削除 (30日以上前)
    find "$BACKUP_DIR" -name "library_*.db" -mtime +$RETENTION_DAYS -delete
    log "古いバックアップ削除完了 (${RETENTION_DAYS}日以上前)"

    exit 0
else
    log "エラー: バックアップ失敗"
    exit 1
fi
```

#### バックアップスクリプト実行権限付与

```bash
sudo chmod +x /opt/library/scripts/backup.sh
```

#### Cronジョブ設定（日次バックアップ）

```bash
# libraryユーザーのcrontab編集
sudo su - library
crontab -e

# 毎日午前3時にバックアップ実行
0 3 * * * /opt/library/scripts/backup.sh
```

### 6.2 リストアスクリプト

`/opt/library/scripts/restore.sh`を作成します。

```bash
#!/bin/bash
set -euo pipefail

# 設定
DB_PATH="/opt/library/data/library.db"
BACKUP_DIR="/opt/library/data/backups"
LOG_FILE="/opt/library/logs/app/restore.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 引数チェック
if [ $# -ne 1 ]; then
    echo "使用方法: $0 <backup_file>"
    echo "例: $0 library_20250111_030000.db"
    echo ""
    echo "利用可能なバックアップファイル:"
    ls -lh "$BACKUP_DIR"/library_*.db
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# バックアップファイル存在確認
if [ ! -f "$BACKUP_PATH" ]; then
    log "エラー: バックアップファイルが見つかりません: $BACKUP_PATH"
    exit 1
fi

log "リストア開始: $BACKUP_FILE"

# PM2停止
log "アプリケーション停止中..."
pm2 stop library-api

# 現在のDBをバックアップ
CURRENT_BACKUP="${DB_PATH}.before_restore_$(date +%Y%m%d_%H%M%S)"
cp "$DB_PATH" "$CURRENT_BACKUP"
log "現在のDBをバックアップ: $CURRENT_BACKUP"

# リストア実行
if cp "$BACKUP_PATH" "$DB_PATH"; then
    log "リストア成功: $BACKUP_FILE → $DB_PATH"

    # PM2再起動
    log "アプリケーション起動中..."
    pm2 start library-api

    log "リストア完了"
    exit 0
else
    log "エラー: リストア失敗"

    # 元のDBに戻す
    log "元のDBに復元中..."
    cp "$CURRENT_BACKUP" "$DB_PATH"
    pm2 start library-api

    exit 1
fi
```

#### リストアスクリプト実行権限付与

```bash
sudo chmod +x /opt/library/scripts/restore.sh
```

---

## 7. 運用手順

### 7.1 日常運用

#### アプリケーション起動・停止

```bash
# 起動
sudo su - library
pm2 start library-api

# 停止
pm2 stop library-api

# 再起動
pm2 restart library-api

# リロード (ダウンタイムなし)
pm2 reload library-api

# 状態確認
pm2 status
pm2 logs library-api --lines 100
```

#### Nginx起動・停止

```bash
# 起動
sudo systemctl start nginx

# 停止
sudo systemctl stop nginx

# 再起動
sudo systemctl restart nginx

# リロード (設定再読み込み)
sudo systemctl reload nginx

# 状態確認
sudo systemctl status nginx
```

### 7.2 アプリケーション更新デプロイ

#### 手動デプロイ手順

```bash
# 1. libraryユーザーに切り替え
sudo su - library

# 2. アプリケーション停止
cd /opt/library/app/server
pm2 stop library-api

# 3. 最新コード取得
cd /opt/library/app
git fetch origin
git checkout v1.1.0  # タグまたはブランチ指定

# 4. バックエンド依存関係更新
cd /opt/library/app/server
npm ci --production

# 5. データベースマイグレーション (必要な場合)
npm run db:migrate

# 6. フロントエンドビルド
cd /opt/library/app/client
npm ci
npm run build

# 7. アプリケーション起動
cd /opt/library/app/server
pm2 start library-api

# 8. 動作確認
pm2 logs library-api --lines 50
curl -k https://library.company.local/health
```

#### ゼロダウンタイムデプロイ

```bash
# PM2リロード (ダウンタイムなし)
pm2 reload library-api

# または Nginx Graceful Reload
sudo systemctl reload nginx
```

### 7.3 障害対応

#### アプリケーションクラッシュ

```bash
# 1. ログ確認
pm2 logs library-api --lines 200
tail -f /opt/library/logs/app/error.log

# 2. PM2再起動
pm2 restart library-api

# 3. データベース整合性確認
sqlite3 /opt/library/data/library.db "PRAGMA integrity_check;"

# 4. 問題が解決しない場合はバックアップからリストア
/opt/library/scripts/restore.sh library_20250111_030000.db
```

#### データベース破損

```bash
# 1. アプリケーション停止
pm2 stop library-api

# 2. データベース整合性確認
sqlite3 /opt/library/data/library.db "PRAGMA integrity_check;"

# 3. バックアップからリストア
/opt/library/scripts/restore.sh library_20250111_030000.db

# 4. アプリケーション起動
pm2 start library-api
```

#### ディスク容量不足

```bash
# 1. ディスク使用状況確認
df -h
du -sh /opt/library/logs/*

# 2. 古いログ削除
find /opt/library/logs -name "*.log.*" -mtime +30 -delete

# 3. 古いバックアップ削除
find /opt/library/data/backups -name "library_*.db" -mtime +30 -delete

# 4. PM2ログクリア
pm2 flush
```

### 7.4 モニタリング確認

#### リソース使用状況

```bash
# CPU・メモリ使用状況
htop

# PM2リソース監視
pm2 monit

# ディスク使用状況
df -h
du -sh /opt/library/*

# ネットワーク接続状況
ss -tuln | grep -E ':(80|443|3000)'
```

#### ログ確認

```bash
# アプリケーションログ
tail -f /opt/library/logs/app/combined.log

# エラーログ
tail -f /opt/library/logs/app/error.log

# Nginxアクセスログ
tail -f /opt/library/logs/nginx/access.log

# Nginxエラーログ
tail -f /opt/library/logs/nginx/error.log

# PM2ログ
pm2 logs library-api
```

---

## 8. トラブルシューティング

### 8.1 よくある問題

#### 問題1: Nginxが起動しない

**症状**: `systemctl start nginx`が失敗する

**原因と対策**:

```bash
# 設定ファイル文法チェック
sudo nginx -t

# ポート競合確認
sudo ss -tuln | grep -E ':(80|443)'

# SELinux確認 (RHEL/CentOS)
sudo getenforce
sudo setenforce 0  # 一時的にPermissiveモード

# ファイアウォール確認
sudo firewall-cmd --list-all
```

#### 問題2: PM2がアプリケーションを起動できない

**症状**: `pm2 start`がエラーで失敗する

**原因と対策**:

```bash
# ログ確認
pm2 logs library-api --err --lines 100

# 環境変数確認
cat /opt/library/app/server/.env.production

# データベースパス確認
ls -l /opt/library/data/library.db

# 権限確認
ls -la /opt/library/data/

# 手動起動テスト
cd /opt/library/app/server
NODE_ENV=production node src/server.js
```

#### 問題3: データベース接続エラー

**症状**: アプリケーションログに「Cannot open database」エラー

**原因と対策**:

```bash
# データベースファイル確認
ls -l /opt/library/data/library.db

# 権限確認
sudo chown library:library /opt/library/data/library.db
sudo chmod 644 /opt/library/data/library.db

# ディレクトリ権限確認
sudo chown library:library /opt/library/data
sudo chmod 755 /opt/library/data

# データベース初期化 (データが消えるので注意)
cd /opt/library/app/server
npm run db:init
npm run db:seed
```

#### 問題4: SSL証明書エラー

**症状**: ブラウザで「証明書が無効」エラー

**原因と対策**:

```bash
# 証明書確認
openssl x509 -in /opt/library/config/ssl/library.crt -text -noout

# 証明書再生成
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/library/config/ssl/library.key \
  -out /opt/library/config/ssl/library.crt \
  -subj "/C=JP/ST=Tokyo/L=Chiyoda/O=Company/OU=IT/CN=library.company.local"

# Nginx再起動
sudo systemctl restart nginx
```

#### 問題5: セッションタイムアウト頻発

**症状**: ユーザーがすぐにログアウトされる

**原因と対策**:

```bash
# .env.productionでセッションタイムアウト延長
SESSION_MAX_AGE=3600000  # 1時間 (ミリ秒)

# PM2再起動
pm2 restart library-api
```

### 8.2 緊急時の対応フロー

#### 完全システムダウン時

```
1. 状態確認
   ├─ サーバー稼働確認: ping, ssh接続
   ├─ Nginx確認: systemctl status nginx
   └─ PM2確認: pm2 status

2. サービス再起動
   ├─ Nginx: sudo systemctl restart nginx
   └─ PM2: pm2 restart library-api

3. データ整合性確認
   └─ sqlite3 /opt/library/data/library.db "PRAGMA integrity_check;"

4. バックアップからリストア (必要な場合)
   └─ /opt/library/scripts/restore.sh <backup_file>

5. 動作確認
   └─ curl -k https://library.company.local/health
```

#### ロールバック手順

```bash
# 1. アプリケーション停止
pm2 stop library-api

# 2. 旧バージョンに切り替え
cd /opt/library/app
git checkout v1.0.0  # 前バージョンタグ

# 3. 依存関係再インストール
cd /opt/library/app/server
npm ci --production

# 4. フロントエンド再ビルド
cd /opt/library/app/client
npm ci
npm run build

# 5. アプリケーション起動
pm2 start library-api

# 6. 動作確認
curl -k https://library.company.local/health
```

---

## 9. セキュリティチェックリスト

### デプロイ前確認事項

- [ ] `SESSION_SECRET`をランダムな強力な値に変更
- [ ] `.env.production`に機密情報が含まれていないか確認
- [ ] SQLiteデータベースファイルの権限が適切（640以下）
- [ ] SSL証明書が有効期限内
- [ ] ファイアウォールで必要なポート（80, 443）のみ開放
- [ ] SELinuxがEnforcingモード（または適切なポリシー設定）
- [ ] 不要なポート（3000など）が外部に公開されていないか確認
- [ ] rootユーザーでのSSHログイン無効化
- [ ] SSH公開鍵認証のみ許可
- [ ] `library`ユーザーの権限が最小限
- [ ] バックアップが正常に実行されているか確認
- [ ] ログローテーションが設定されているか確認

### 定期セキュリティ確認

```bash
# npm脆弱性スキャン
cd /opt/library/app/server
npm audit

# 高リスク脆弱性修正
npm audit fix

# システムパッケージ更新
sudo dnf update -y  # RHEL/CentOS
sudo apt update && sudo apt upgrade -y  # Ubuntu
```

---

## 10. パフォーマンスチューニング

### Node.js最適化

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'library-api',
    script: '/opt/library/app/server/src/server.js',
    instances: 'max',  // CPUコア数に合わせて自動調整
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'  // ヒープメモリ制限
  }]
};
```

### SQLite最適化

```sql
-- WALモード有効化 (Write-Ahead Logging)
PRAGMA journal_mode=WAL;

-- キャッシュサイズ設定 (10MB)
PRAGMA cache_size=-10000;

-- 同期モード設定 (パフォーマンス優先)
PRAGMA synchronous=NORMAL;
```

### Nginx最適化

```nginx
# Worker設定
worker_processes auto;
worker_connections 1024;

# Keepalive設定
keepalive_timeout 65;
keepalive_requests 100;

# Buffer設定
client_body_buffer_size 16K;
client_header_buffer_size 1k;
client_max_body_size 8m;
```

---

## 11. 運用ベストプラクティス

### 定期メンテナンス (月次)

```bash
# システムパッケージ更新
sudo dnf update -y

# npmパッケージ更新確認
cd /opt/library/app/server
npm outdated

# ログファイルサイズ確認
du -sh /opt/library/logs/*

# バックアップファイル確認
ls -lh /opt/library/data/backups/

# ディスク使用状況確認
df -h

# PM2リソース使用状況確認
pm2 monit
```

### 監視項目

| 項目 | 確認方法 | しきい値 |
|-----|---------|---------|
| CPU使用率 | `htop`, `pm2 monit` | < 70% |
| メモリ使用率 | `htop`, `free -h` | < 80% |
| ディスク使用率 | `df -h` | < 80% |
| API応答時間 | ヘルスチェック | < 500ms |
| PM2プロセス状態 | `pm2 status` | online |
| Nginx状態 | `systemctl status nginx` | active |

---

## 付録

### A. 自動デプロイスクリプト

`/opt/library/scripts/deploy.sh`

```bash
#!/bin/bash
set -euo pipefail

VERSION="${1:-main}"
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

log "図書貸出システム デプロイ開始 (バージョン: $VERSION)"

# 1. アプリケーション停止
log "アプリケーション停止中..."
pm2 stop library-api || true

# 2. 最新コード取得
log "最新コード取得中..."
cd /opt/library/app
git fetch origin
git checkout "$VERSION"

# 3. バックエンド依存関係インストール
log "バックエンド依存関係インストール中..."
cd /opt/library/app/server
npm ci --production

# 4. データベースマイグレーション
log "データベースマイグレーション実行中..."
npm run db:migrate || true

# 5. フロントエンドビルド
log "フロントエンドビルド中..."
cd /opt/library/app/client
npm ci
npm run build

# 6. アプリケーション起動
log "アプリケーション起動中..."
cd /opt/library/app/server
pm2 start library-api

# 7. 動作確認
log "動作確認中..."
sleep 5
if curl -k -f https://library.company.local/health > /dev/null 2>&1; then
    log "デプロイ成功!"
else
    log "エラー: ヘルスチェック失敗"
    exit 1
fi
```

### B. 参考資料

- **Node.js公式ドキュメント**: https://nodejs.org/docs/
- **PM2公式ドキュメント**: https://pm2.keymetrics.io/docs/
- **Nginx公式ドキュメント**: https://nginx.org/en/docs/
- **SQLite公式ドキュメント**: https://www.sqlite.org/docs.html

---

**作成者**: DevOps Architect
**最終更新**: 2025-01-11
**次回レビュー**: 2025-04-11
