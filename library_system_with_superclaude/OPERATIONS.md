# 図書貸出システム 運用手順書

**作成日**: 2025-01-11
**バージョン**: 1.0
**対象者**: システム管理者、運用担当者
**関連文書**: DEPLOYMENT.md, SECURITY.md

---

## 目次

1. [日常運用](#1-日常運用)
2. [定期メンテナンス](#2-定期メンテナンス)
3. [障害対応](#3-障害対応)
4. [変更管理](#4-変更管理)
5. [監視とアラート](#5-監視とアラート)
6. [バックアップとリカバリ](#6-バックアップとリカバリ)
7. [運用チェックリスト](#7-運用チェックリスト)

---

## 1. 日常運用

### 1.1 システム起動手順

#### サーバー起動時の手順

```bash
# 1. Nginx起動
sudo systemctl start nginx
sudo systemctl status nginx

# 2. libraryユーザーに切り替え
sudo su - library

# 3. PM2でアプリケーション起動
pm2 start /opt/library/config/pm2/ecosystem.config.js --env production

# 4. 起動確認
pm2 status
pm2 logs library-api --lines 20

# 5. ヘルスチェック
curl -k https://library.company.local/health
```

#### 正常起動の確認項目

- [ ] Nginxが `active (running)` 状態
- [ ] PM2で `library-api` が `online` 状態
- [ ] PM2インスタンス数が設定値（2インスタンス）
- [ ] ヘルスチェックが `200 OK` を返す
- [ ] エラーログに異常がない

### 1.2 システム停止手順

#### 計画停止の手順

```bash
# 1. ユーザーへの事前通知
# メンテナンス通知を社内ポータルやメールで送信

# 2. libraryユーザーに切り替え
sudo su - library

# 3. PM2でアプリケーション停止 (Graceful shutdown)
pm2 stop library-api

# 4. 停止確認
pm2 status

# 5. Nginx停止
sudo systemctl stop nginx
sudo systemctl status nginx
```

#### 緊急停止の手順

```bash
# 即座にアプリケーション停止
sudo su - library
pm2 kill

# Nginx即座停止
sudo systemctl stop nginx
```

### 1.3 システム再起動手順

#### アプリケーションのみ再起動

```bash
# Graceful reload (ダウンタイムなし)
sudo su - library
pm2 reload library-api

# または強制再起動
pm2 restart library-api
```

#### サーバー全体の再起動

```bash
# 1. PM2自動起動設定確認
pm2 startup
pm2 save

# 2. サーバー再起動
sudo reboot

# 3. 再起動後確認 (5-10分後)
ssh library@library-server
pm2 status
curl -k https://library.company.local/health
```

### 1.4 ログ確認

#### リアルタイムログ監視

```bash
# アプリケーションログ (全体)
tail -f /opt/library/logs/app/combined.log

# エラーログのみ
tail -f /opt/library/logs/app/error.log

# PM2ログ
pm2 logs library-api

# PM2エラーログのみ
pm2 logs library-api --err

# Nginxアクセスログ
sudo tail -f /opt/library/logs/nginx/access.log

# Nginxエラーログ
sudo tail -f /opt/library/logs/nginx/error.log
```

#### ログ検索

```bash
# 特定のエラーメッセージ検索
grep -i "error" /opt/library/logs/app/combined.log | tail -50

# 特定のユーザーアクション検索
grep "user_id: 12345" /opt/library/logs/app/combined.log

# 特定の時間範囲検索
grep "2025-01-11 10:" /opt/library/logs/app/combined.log

# 貸出エラー検索
grep "loan.*error" /opt/library/logs/app/error.log
```

### 1.5 リソース監視

#### システムリソース確認

```bash
# CPU・メモリ使用率 (対話型)
htop

# CPU使用率 (数値)
top -bn1 | grep "Cpu(s)"

# メモリ使用率
free -h

# ディスク使用率
df -h

# ディスクI/O
iostat -x 1 5

# ネットワーク接続
ss -tuln | grep -E ':(80|443|3000)'

# PM2リソース監視
pm2 monit
```

#### アプリケーションメトリクス

```bash
# PM2メトリクス表示
pm2 show library-api

# PM2リソース使用率
pm2 list

# Nginxステータス (内部メトリクス)
curl http://127.0.0.1:8080/nginx_status
```

---

## 2. 定期メンテナンス

### 2.1 日次メンテナンス (自動化推奨)

#### バックアップ実行 (午前3時 - Cron)

```bash
# Cron設定確認
crontab -l

# バックアップスクリプト実行確認
ls -lh /opt/library/data/backups/ | tail -5

# バックアップログ確認
tail -20 /opt/library/logs/app/backup.log
```

#### ヘルスチェック実行 (5分ごと - Cron)

```bash
# ヘルスチェックログ確認
tail -20 /opt/library/logs/app/health-check.log

# アラートログ確認
tail -20 /opt/library/logs/app/alert.log
```

### 2.2 週次メンテナンス (毎週月曜日推奨)

#### ログローテーション確認

```bash
# ログファイルサイズ確認
du -sh /opt/library/logs/*

# ローテーション済みログ確認
ls -lh /opt/library/logs/app/*.log*
```

#### ディスク容量確認

```bash
# ディスク使用状況
df -h

# ディレクトリ別使用量
du -sh /opt/library/*

# 大きいファイル検索 (100MB以上)
find /opt/library -type f -size +100M -exec ls -lh {} \;
```

#### バックアップファイル確認

```bash
# バックアップファイル一覧
ls -lh /opt/library/data/backups/

# 古いバックアップ削除 (30日以上前)
find /opt/library/data/backups -name "library_*.db" -mtime +30 -delete
```

### 2.3 月次メンテナンス (毎月第1月曜日推奨)

#### システムパッケージ更新

```bash
# RHEL/CentOS
sudo dnf update -y
sudo dnf autoremove

# Ubuntu
sudo apt update
sudo apt upgrade -y
sudo apt autoremove
```

#### Node.jsパッケージ更新確認

```bash
cd /opt/library/app/server
npm outdated

# 脆弱性スキャン
npm audit

# 高リスク脆弱性修正
npm audit fix
```

#### データベース最適化

```bash
# SQLiteデータベース最適化
sqlite3 /opt/library/data/library.db "VACUUM;"
sqlite3 /opt/library/data/library.db "ANALYZE;"
sqlite3 /opt/library/data/library.db "PRAGMA integrity_check;"
```

#### SSL証明書有効期限確認

```bash
# 証明書有効期限確認
openssl x509 -in /opt/library/config/ssl/library.crt -text -noout | grep "Not After"

# 有効期限90日前にアラート
# (証明書更新手順はDEPLOYMENT.mdを参照)
```

#### アプリケーション再起動

```bash
# メモリリーク対策の定期再起動
sudo su - library
pm2 reload library-api
```

### 2.4 四半期メンテナンス (3ヶ月ごと)

#### セキュリティレビュー

- [ ] ファイアウォールルール確認
- [ ] SSHアクセスログ確認
- [ ] 不要なユーザーアカウント削除
- [ ] パスワードポリシー確認
- [ ] SSL証明書更新計画確認

#### パフォーマンスレビュー

- [ ] API応答時間分析
- [ ] データベースクエリ最適化
- [ ] ログファイル分析 (エラー傾向)
- [ ] リソース使用トレンド分析

#### バックアップリストア訓練

```bash
# バックアップからのリストアテスト (ステージング環境推奨)
/opt/library/scripts/restore.sh library_20250111_030000.db
```

---

## 3. 障害対応

### 3.1 障害対応フロー

```
障害検知
    ↓
初動対応 (5分以内)
    ├─ 状態確認 (サーバー、Nginx、PM2、DB)
    ├─ ログ確認 (エラーログ、アクセスログ)
    └─ 一時対応 (サービス再起動)
    ↓
原因調査 (15分以内)
    ├─ エラー詳細確認
    ├─ リソース状況確認
    └─ 外部要因確認
    ↓
恒久対応 (状況に応じて)
    ├─ 設定変更
    ├─ コード修正
    └─ インフラ増強
    ↓
事後レビュー (24時間以内)
    ├─ 障害報告書作成
    ├─ 再発防止策検討
    └─ 手順書更新
```

### 3.2 障害分類と対応時間

| 障害レベル | 影響範囲 | 対応時間 | 例 |
|-----------|---------|---------|---|
| **Critical** | システム全体停止 | 即座 (15分以内) | サーバーダウン、DB破損 |
| **High** | 主要機能停止 | 1時間以内 | 貸出機能エラー、認証不可 |
| **Medium** | 一部機能異常 | 4時間以内 | 検索遅延、画面表示崩れ |
| **Low** | 軽微な問題 | 次回メンテナンス | ログ警告、軽微なUI不具合 |

### 3.3 障害シナリオ別対応

#### シナリオ1: アプリケーション応答なし

**症状**: ヘルスチェックが失敗、ユーザーアクセス不可

**対応手順**:

```bash
# 1. PM2ステータス確認
pm2 status

# 2. ログ確認
pm2 logs library-api --err --lines 50
tail -50 /opt/library/logs/app/error.log

# 3. PM2再起動
pm2 restart library-api

# 4. 動作確認
curl -k https://library.company.local/health

# 5. 改善しない場合はサーバー再起動
sudo reboot
```

#### シナリオ2: データベース接続エラー

**症状**: ログに「Cannot open database」エラー

**対応手順**:

```bash
# 1. データベースファイル確認
ls -l /opt/library/data/library.db

# 2. 権限確認・修正
sudo chown library:library /opt/library/data/library.db
sudo chmod 640 /opt/library/data/library.db

# 3. データベース整合性確認
sqlite3 /opt/library/data/library.db "PRAGMA integrity_check;"

# 4. 破損している場合はバックアップからリストア
/opt/library/scripts/restore.sh library_20250111_030000.db

# 5. アプリケーション再起動
pm2 restart library-api
```

#### シナリオ3: ディスク容量不足

**症状**: ログに「No space left on device」エラー

**対応手順**:

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

# 5. ログローテーション強制実行
sudo logrotate -f /etc/logrotate.d/library

# 6. アプリケーション再起動
pm2 restart library-api
```

#### シナリオ4: SSL証明書期限切れ

**症状**: ブラウザで証明書エラー表示

**対応手順**:

```bash
# 1. 証明書有効期限確認
openssl x509 -in /opt/library/config/ssl/library.crt -text -noout | grep "Not After"

# 2. 新しい証明書取得 (社内CA)
# (証明書取得手順は組織のポリシーに従う)

# 3. 証明書ファイル配置
sudo cp new-library.crt /opt/library/config/ssl/library.crt
sudo cp new-library.key /opt/library/config/ssl/library.key
sudo chmod 644 /opt/library/config/ssl/library.crt
sudo chmod 600 /opt/library/config/ssl/library.key

# 4. Nginx設定確認
sudo nginx -t

# 5. Nginx再起動
sudo systemctl reload nginx
```

#### シナリオ5: 高負荷・パフォーマンス低下

**症状**: API応答が遅い、ページロードが遅い

**対応手順**:

```bash
# 1. リソース使用状況確認
htop
pm2 monit

# 2. ボトルネック特定
# CPU高負荷の場合
top -H -p $(pgrep -f library-api | head -1)

# メモリ不足の場合
free -h

# ディスクI/O高負荷の場合
iostat -x 1 5

# 3. 一時対応: PM2インスタンス数増加
pm2 scale library-api +1

# 4. 恒久対応: インフラ増強検討
# - CPUコア数増加
# - メモリ増設
# - PostgreSQL移行検討
```

### 3.4 ロールバック手順

#### アプリケーションロールバック

```bash
# 1. アプリケーション停止
sudo su - library
pm2 stop library-api

# 2. 旧バージョンに切り替え
cd /opt/library/app
git fetch origin
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

#### データベースロールバック

```bash
# バックアップからのリストア
/opt/library/scripts/restore.sh library_20250111_030000.db
```

---

## 4. 変更管理

### 4.1 変更管理プロセス

```
変更要求
    ↓
影響分析
    ├─ 影響範囲の特定
    ├─ リスク評価
    └─ ロールバック計画
    ↓
変更承認
    ├─ システム管理者承認
    └─ 関係者通知
    ↓
変更実施
    ├─ ステージング環境テスト
    ├─ バックアップ取得
    └─ 本番環境適用
    ↓
変更確認
    ├─ 動作確認
    ├─ ログ確認
    └─ ユーザー確認
    ↓
変更記録
    └─ 変更管理台帳更新
```

### 4.2 変更種別と承認レベル

| 変更種別 | 影響範囲 | 承認者 | 事前通知 |
|---------|---------|--------|---------|
| **緊急変更** | Critical障害対応 | 事後報告 | 不要 |
| **通常変更** | アプリケーション更新 | システム管理者 | 3日前 |
| **計画変更** | インフラ増強 | システム管理者 + 部門長 | 1週間前 |
| **軽微変更** | 設定調整 | システム管理者 | 不要 |

### 4.3 メンテナンス時間帯

- **推奨時間**: 平日 23:00-翌1:00、休日 全日
- **避けるべき時間**: 平日 9:00-18:00 (業務時間)
- **緊急メンテナンス**: 随時 (Critical障害対応)

---

## 5. 監視とアラート

### 5.1 監視項目

#### システムレベル監視

| 監視項目 | しきい値 | アラート条件 | 確認方法 |
|---------|---------|-------------|---------|
| CPU使用率 | 70% | 10分間継続 | `htop`, `top` |
| メモリ使用率 | 80% | 5分間継続 | `free -h` |
| ディスク使用率 | 80% | - | `df -h` |
| ディスクI/O | - | 高負荷継続 | `iostat` |

#### アプリケーションレベル監視

| 監視項目 | しきい値 | アラート条件 | 確認方法 |
|---------|---------|-------------|---------|
| PM2プロセス状態 | online | offline検出 | `pm2 status` |
| ヘルスチェック | 200 OK | 3回連続失敗 | `health-check.sh` |
| API応答時間 | 500ms | P95超過 | ログ分析 |
| エラー発生率 | 1% | 継続発生 | エラーログ |

#### ミドルウェアレベル監視

| 監視項目 | しきい値 | アラート条件 | 確認方法 |
|---------|---------|-------------|---------|
| Nginx状態 | active | inactive検出 | `systemctl status nginx` |
| Nginx接続数 | - | 上限到達 | `/nginx_status` |
| データベース整合性 | OK | NG検出 | `PRAGMA integrity_check` |

### 5.2 アラート設定

#### Cronによる定期監視

```bash
# libraryユーザーのcrontab
crontab -e

# ヘルスチェック (5分ごと)
*/5 * * * * /opt/library/scripts/health-check.sh

# ディスク容量チェック (1時間ごと)
0 * * * * df -h / | awk 'NR==2 {if (int($5) > 80) print "Disk usage: " $5}' >> /opt/library/logs/app/alert.log

# データベースバックアップ (毎日午前3時)
0 3 * * * /opt/library/scripts/backup.sh
```

### 5.3 アラート通知 (拡張可能)

#### メール通知設定 (将来実装)

```bash
# mail コマンド使用例
echo "Alert: Service down" | mail -s "Library System Alert" admin@company.local
```

#### Slack通知設定 (将来実装)

```bash
# Slack Webhook使用例
curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Alert: Library System Down"}' \
    https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## 6. バックアップとリカバリ

### 6.1 バックアップ戦略

#### バックアップ種類

| バックアップ種別 | 頻度 | 保持期間 | 用途 |
|---------------|-----|---------|------|
| **日次バックアップ** | 毎日 03:00 | 30日 | 定期バックアップ |
| **週次バックアップ** | 毎週日曜 02:00 | 3ヶ月 | 長期保存 |
| **変更前バックアップ** | 変更前 | 7日 | ロールバック用 |

#### バックアップ対象

- `/opt/library/data/library.db` - データベースファイル
- `/opt/library/config/` - 設定ファイル
- `/opt/library/app/server/.env.production` - 環境変数

### 6.2 バックアップ実行

#### 手動バックアップ

```bash
# データベースバックアップ
/opt/library/scripts/backup.sh

# 設定ファイルバックアップ
tar -czf /opt/library/data/backups/config_$(date +%Y%m%d).tar.gz /opt/library/config/
```

#### 自動バックアップ確認

```bash
# バックアップログ確認
tail -50 /opt/library/logs/app/backup.log

# バックアップファイル一覧
ls -lh /opt/library/data/backups/

# 最新バックアップの整合性確認
LATEST_BACKUP=$(ls -t /opt/library/data/backups/library_*.db | head -1)
sqlite3 "$LATEST_BACKUP" "PRAGMA integrity_check;"
```

### 6.3 リカバリ手順

#### データベースリストア

```bash
# バックアップ一覧表示
ls -lh /opt/library/data/backups/library_*.db

# リストア実行
/opt/library/scripts/restore.sh library_20250111_030000.db
```

#### 災害復旧 (DR)

```bash
# 1. 新サーバーでセットアップスクリプト実行
sudo /opt/library/scripts/setup-server.sh

# 2. バックアップファイルを転送
scp backup-server:/backups/library_20250111_030000.db /opt/library/data/backups/

# 3. アプリケーションデプロイ
# (DEPLOYMENT.mdの手順に従う)

# 4. データベースリストア
/opt/library/scripts/restore.sh library_20250111_030000.db

# 5. 動作確認
curl -k https://library.company.local/health
```

---

## 7. 運用チェックリスト

### 7.1 日次チェックリスト

- [ ] ヘルスチェックログ確認
- [ ] エラーログ確認
- [ ] PM2プロセス状態確認
- [ ] バックアップ実行確認
- [ ] ディスク使用率確認

### 7.2 週次チェックリスト

- [ ] ログローテーション確認
- [ ] バックアップファイル一覧確認
- [ ] 古いバックアップ削除
- [ ] システムリソース使用トレンド確認
- [ ] エラー傾向分析

### 7.3 月次チェックリスト

- [ ] システムパッケージ更新
- [ ] Node.js依存関係更新確認
- [ ] SSL証明書有効期限確認
- [ ] データベース最適化実行
- [ ] アプリケーション定期再起動
- [ ] セキュリティレビュー

### 7.4 四半期チェックリスト

- [ ] バックアップリストア訓練
- [ ] 災害復旧計画レビュー
- [ ] パフォーマンスレビュー
- [ ] インフラ増強計画レビュー
- [ ] 運用手順書更新

---

## 付録

### A. 緊急連絡先

| 役割 | 担当者 | 連絡先 | 対応時間 |
|-----|-------|--------|---------|
| システム管理者 | (名前) | (内線/メール) | 24/7 |
| バックアップ管理者 | (名前) | (内線/メール) | 平日 9-18時 |
| 開発チーム | (名前) | (内線/メール) | 平日 9-18時 |

### B. 関連ドキュメント

- **DEPLOYMENT.md**: デプロイメント手順
- **SECURITY.md**: セキュリティ設定
- **ARCHITECTURE.md**: システムアーキテクチャ
- **API.md**: API仕様書

### C. 運用ツール

| ツール | 用途 | コマンド例 |
|-------|------|-----------|
| **PM2** | プロセス管理 | `pm2 status`, `pm2 logs`, `pm2 monit` |
| **htop** | リソース監視 | `htop` |
| **sqlite3** | データベース操作 | `sqlite3 /opt/library/data/library.db` |
| **curl** | ヘルスチェック | `curl -k https://library.company.local/health` |

---

**作成者**: DevOps Architect
**最終更新**: 2025-01-11
**次回レビュー**: 2025-04-11
