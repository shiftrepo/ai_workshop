# 図書貸出システム デプロイメントガイド クイックリファレンス

**作成日**: 2025-01-11
**バージョン**: 1.0

---

## 📋 デプロイメント成果物一覧

本番環境デプロイに必要な全ての成果物が作成されました。

### 📄 ドキュメント

| ドキュメント | 内容 | ページ数 |
|------------|------|---------|
| **DEPLOYMENT.md** | 本番デプロイメント完全ガイド | 38KB |
| **OPERATIONS.md** | 日常運用・障害対応手順書 | 19KB |
| **SECURITY_CHECKLIST.md** | セキュリティチェックリスト | 18KB |
| **CI_CD_GUIDE.md** | CI/CDパイプライン設定ガイド | 18KB |
| **ARCHITECTURE.md** | システムアーキテクチャ設計書 | 17KB |

### 🔧 運用スクリプト

| スクリプト | 用途 | サイズ |
|-----------|------|--------|
| **scripts/setup-server.sh** | サーバー初期セットアップ自動化 | 12KB |
| **scripts/backup.sh** | データベース日次バックアップ | 6.6KB |
| **scripts/restore.sh** | バックアップからのリストア | 8.6KB |
| **scripts/health-check.sh** | 死活監視・自動復旧 | 7.1KB |

### ⚙️ 設定ファイル

| 設定ファイル | 用途 | サイズ |
|------------|------|--------|
| **config/nginx/library.conf** | Nginxリバースプロキシ設定 | 4.5KB |
| **config/pm2/ecosystem.config.js** | PM2プロセス管理設定 | 2.4KB |

---

## 🚀 デプロイメント手順サマリー

### 1️⃣ サーバー準備 (初回のみ)

```bash
# 1. サーバーにSSH接続
ssh root@library-server

# 2. セットアップスクリプト実行 (自動化)
sudo /path/to/setup-server.sh
```

**実行内容**:
- ディレクトリ構造作成 (`/opt/library/`)
- libraryユーザー作成
- Node.js, Nginx, PM2インストール
- ファイアウォール設定 (80/443ポート開放)
- 自己署名SSL証明書作成

**所要時間**: 約15-20分

### 2️⃣ アプリケーションデプロイ

```bash
# 1. libraryユーザーに切り替え
sudo su - library

# 2. アプリケーションクローン
cd /opt/library/app
git clone https://github.com/your-org/library-system.git .

# 3. バックエンド依存関係インストール
cd /opt/library/app/server
npm ci --production

# 4. 環境変数設定
cp .env.example .env.production
vi .env.production  # SESSION_SECRET等を設定

# 5. データベース初期化
npm run db:init
npm run db:seed

# 6. フロントエンドビルド
cd /opt/library/app/client
npm ci
npm run build

# 7. PM2起動
pm2 start /opt/library/config/pm2/ecosystem.config.js --env production
pm2 save
```

**所要時間**: 約10-15分

### 3️⃣ Nginx設定

```bash
# 1. Nginx設定ファイル配置
sudo ln -s /opt/library/config/nginx/library.conf /etc/nginx/conf.d/library.conf

# 2. 設定ファイル文法チェック
sudo nginx -t

# 3. Nginx起動
sudo systemctl enable nginx
sudo systemctl start nginx
```

**所要時間**: 約2-3分

### 4️⃣ 動作確認

```bash
# ヘルスチェック
curl -k https://library.company.local/health

# 期待される出力: {"status":"ok","timestamp":"..."}

# PM2ステータス確認
pm2 status

# ログ確認
pm2 logs library-api --lines 20
tail -f /opt/library/logs/app/combined.log
```

---

## 📊 インフラ構成図

```
┌───────────────────────────────────────────────────────────────┐
│                      社内ネットワーク                            │
│                                                                 │
│  [ユーザー (ブラウザ)]                                            │
│         │                                                       │
│         ↓                                                       │
│  ┌─────────────────────┐                                       │
│  │  Nginx (Port 443)    │  ← SSL/TLS Termination               │
│  │  - Static Files      │  ← Vue.js SPA配信                    │
│  │  - Reverse Proxy     │  ← API転送                           │
│  └─────────────────────┘                                       │
│         │                                                       │
│         ↓                                                       │
│  ┌─────────────────────┐                                       │
│  │  PM2 (Port 3000)     │  ← Cluster Mode (2 instances)        │
│  │  - Node.js + Express │  ← Auto-restart                      │
│  └─────────────────────┘                                       │
│         │                                                       │
│         ↓                                                       │
│  ┌─────────────────────┐                                       │
│  │  SQLite Database     │  ← /opt/library/data/library.db      │
│  │  - WAL Mode          │  ← Daily Backup (03:00 Cron)         │
│  └─────────────────────┘                                       │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔄 日常運用タスク

### 毎日

- [ ] ヘルスチェックログ確認 (自動: Cron 5分ごと)
- [ ] バックアップ実行確認 (自動: Cron 03:00)
- [ ] エラーログ確認

### 毎週 (月曜日)

- [ ] ディスク容量確認
- [ ] ログローテーション確認
- [ ] 古いバックアップ削除確認

### 毎月 (第1月曜日)

- [ ] システムパッケージ更新
- [ ] npm脆弱性スキャン
- [ ] SSL証明書有効期限確認
- [ ] データベース最適化

### 四半期 (3ヶ月ごと)

- [ ] バックアップリストア訓練
- [ ] セキュリティレビュー
- [ ] パフォーマンスレビュー

---

## 🔒 セキュリティチェックリスト (デプロイ前必須)

### Critical (必須項目)

- [ ] `SESSION_SECRET` がランダムな強力な値 (32文字以上)
- [ ] `.env.production` が `.gitignore` に含まれている
- [ ] npm audit で高リスク脆弱性が0件
- [ ] データベースファイル権限が 640
- [ ] SSL証明書が有効期限内
- [ ] ファイアウォールで 80/443 のみ開放
- [ ] rootログイン無効化
- [ ] SSH公開鍵認証のみ許可

### Important (推奨項目)

- [ ] SELinuxがEnforcingモード
- [ ] ログローテーション設定
- [ ] バックアップ自動化 (Cron)
- [ ] ヘルスチェック自動化 (Cron)
- [ ] Nginxセキュリティヘッダー設定
- [ ] PM2自動起動設定

詳細は **SECURITY_CHECKLIST.md** を参照してください。

---

## 📞 トラブルシューティング クイックリファレンス

### アプリケーション起動しない

```bash
# 1. PM2ログ確認
pm2 logs library-api --err --lines 50

# 2. 環境変数確認
cat /opt/library/app/server/.env.production

# 3. データベース確認
ls -l /opt/library/data/library.db

# 4. PM2再起動
pm2 restart library-api
```

### Nginx起動しない

```bash
# 1. 設定ファイル文法チェック
sudo nginx -t

# 2. ポート競合確認
sudo ss -tuln | grep -E ':(80|443)'

# 3. SELinux確認
sudo getenforce
sudo setenforce 0  # 一時的にPermissive
```

### データベース接続エラー

```bash
# 1. ファイル存在確認
ls -l /opt/library/data/library.db

# 2. 権限修正
sudo chown library:library /opt/library/data/library.db
sudo chmod 640 /opt/library/data/library.db

# 3. 整合性確認
sqlite3 /opt/library/data/library.db "PRAGMA integrity_check;"

# 4. リストア (破損時)
/opt/library/scripts/restore.sh library_20250111_030000.db
```

詳細は **OPERATIONS.md** の「3. 障害対応」を参照してください。

---

## 📚 ドキュメント構成

```
library_system_with_superclaude/
├── DEPLOYMENT.md               # 本番デプロイメント完全ガイド (本書)
├── OPERATIONS.md               # 日常運用・障害対応手順書
├── SECURITY_CHECKLIST.md       # セキュリティチェックリスト
├── ARCHITECTURE.md             # システムアーキテクチャ
├── CI_CD_GUIDE.md              # CI/CDパイプライン設定
├── API.md                      # API仕様書
├── DATABASE.md                 # データベース設計書
├── SECURITY.md                 # セキュリティ設計書
├── TEST_STRATEGY.md            # テスト戦略
├── scripts/                    # 運用スクリプト
│   ├── setup-server.sh         # サーバーセットアップ
│   ├── backup.sh               # バックアップ
│   ├── restore.sh              # リストア
│   └── health-check.sh         # ヘルスチェック
└── config/                     # 設定ファイル
    ├── nginx/library.conf      # Nginx設定
    └── pm2/ecosystem.config.js # PM2設定
```

---

## 💡 ベストプラクティス

### デプロイメント

1. **ステージング環境で検証**: 本番デプロイ前に必ずステージング環境でテスト
2. **バックアップ取得**: デプロイ前に必ずデータベースバックアップを取得
3. **ロールバック計画**: 問題発生時のロールバック手順を事前に確認
4. **ダウンタイム最小化**: PM2 reload コマンドでゼロダウンタイムデプロイ
5. **事前通知**: 計画メンテナンスは3日前に社内通知

### セキュリティ

1. **最小権限の原則**: libraryユーザーは必要最小限の権限のみ
2. **機密情報管理**: パスワード・トークンは環境変数で管理
3. **定期的な更新**: システムパッケージ・npm依存関係を月次更新
4. **監査ログ**: 重要操作はすべてログに記録
5. **SSL/TLS強化**: TLS 1.2以上のみ許可、強力な暗号スイート使用

### 運用

1. **自動化優先**: バックアップ・ヘルスチェックは自動化 (Cron)
2. **監視強化**: リソース使用率・エラーログを定期確認
3. **ログ管理**: ログローテーション設定、30日保持
4. **バックアップ検証**: 月次でバックアップからのリストアテスト
5. **ドキュメント更新**: 変更時は運用手順書を即座に更新

---

## 🎯 デプロイメント完了後の確認項目

### システムレベル

- [ ] Nginxがactive (running)状態
- [ ] PM2でlibrary-apiがonline状態
- [ ] PM2インスタンス数が2
- [ ] ファイアウォールで80/443ポートが開放
- [ ] SELinuxがEnforcingまたは適切に設定

### アプリケーションレベル

- [ ] ヘルスチェックが200 OKを返す
- [ ] ログインページにアクセス可能
- [ ] ログイン機能が動作
- [ ] 書籍一覧が表示される
- [ ] エラーログに異常がない

### セキュリティレベル

- [ ] HTTPからHTTPSへリダイレクト
- [ ] セキュリティヘッダーが設定されている
- [ ] データベースファイル権限が適切
- [ ] 環境変数ファイル権限が適切
- [ ] SSLキーファイル権限が600

### 運用レベル

- [ ] バックアップCronが設定されている
- [ ] ヘルスチェックCronが設定されている
- [ ] ログローテーションが設定されている
- [ ] PM2自動起動が設定されている
- [ ] 運用手順書が整備されている

---

## 📞 サポート情報

### 緊急連絡先

- **システム管理者**: (内線/メール)
- **開発チーム**: (内線/メール)
- **インフラチーム**: (内線/メール)

### 参考資料

- **Node.js公式**: https://nodejs.org/docs/
- **PM2公式**: https://pm2.keymetrics.io/docs/
- **Nginx公式**: https://nginx.org/en/docs/
- **SQLite公式**: https://www.sqlite.org/docs.html

---

**作成者**: DevOps Architect
**最終更新**: 2025-01-11

**次のステップ**:
1. DEPLOYMENT.mdの「2. 事前準備」から開始
2. セキュリティチェックリストで全項目確認
3. サーバーセットアップスクリプト実行
4. 運用手順書を熟読し、日常運用フローを理解
