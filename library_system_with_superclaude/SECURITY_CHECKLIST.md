# 図書貸出システム セキュリティチェックリスト

**作成日**: 2025-01-11
**バージョン**: 1.0
**対象**: 本番環境デプロイ前・定期セキュリティレビュー
**関連文書**: SECURITY.md, DEPLOYMENT.md

---

## 目次

1. [デプロイ前セキュリティチェック](#1-デプロイ前セキュリティチェック)
2. [インフラセキュリティ](#2-インフラセキュリティ)
3. [アプリケーションセキュリティ](#3-アプリケーションセキュリティ)
4. [データベースセキュリティ](#4-データベースセキュリティ)
5. [ネットワークセキュリティ](#5-ネットワークセキュリティ)
6. [アクセス制御](#6-アクセス制御)
7. [監査とロギング](#7-監査とロギング)
8. [定期セキュリティレビュー](#8-定期セキュリティレビュー)

---

## 1. デプロイ前セキュリティチェック

### 1.1 環境変数と機密情報

- [ ] `.env.production`ファイルにハードコードされた機密情報がない
- [ ] `SESSION_SECRET`が強力なランダム文字列に設定されている (最低32文字)
- [ ] `.env.production`が`.gitignore`に含まれている
- [ ] 環境変数ファイルの権限が`600` (所有者のみ読み書き可能)
- [ ] デフォルトパスワードが全て変更されている

#### 確認コマンド

```bash
# SESSION_SECRET確認 (最低32文字あるか)
grep SESSION_SECRET /opt/library/app/server/.env.production | wc -c

# ファイル権限確認
ls -l /opt/library/app/server/.env.production

# .gitignoreに含まれているか確認
cat .gitignore | grep ".env"
```

### 1.2 依存関係の脆弱性

- [ ] `npm audit`で高リスク脆弱性が0件
- [ ] `npm outdated`で重大な古いパッケージがない
- [ ] サードパーティライブラリが信頼できるソースから取得されている
- [ ] `package-lock.json`がコミットされている (依存関係固定)

#### 確認コマンド

```bash
# 脆弱性スキャン (backend)
cd /opt/library/app/server
npm audit

# 脆弱性スキャン (frontend)
cd /opt/library/app/client
npm audit

# 古いパッケージ確認
npm outdated
```

### 1.3 コード品質とセキュリティ

- [ ] ESLintセキュリティルールが有効化されている
- [ ] ハードコードされた認証情報がコード内にない
- [ ] デバッグコードやconsole.logが本番コードに残っていない
- [ ] SQLインジェクション対策 (Prepared Statements使用)
- [ ] XSS対策 (入力エスケープ、Content Security Policy)
- [ ] CSRF対策 (トークン検証)

#### 確認コマンド

```bash
# ハードコードされた機密情報検索
grep -r "password\s*=\s*['\"]" /opt/library/app/server/src/ || echo "Not found (OK)"
grep -r "api_key\s*=\s*['\"]" /opt/library/app/server/src/ || echo "Not found (OK)"

# console.log残存確認
grep -r "console.log" /opt/library/app/server/src/ || echo "Not found (OK)"
```

---

## 2. インフラセキュリティ

### 2.1 OSセキュリティ

- [ ] OSが最新の安定版にアップデート済み
- [ ] セキュリティパッチが全て適用済み
- [ ] 不要なサービスが無効化されている
- [ ] SELinuxがEnforcingモード (またはAppArmorが有効)
- [ ] 自動セキュリティアップデートが有効化されている

#### 確認コマンド

```bash
# OS更新確認
sudo dnf check-update  # RHEL/CentOS
sudo apt update && apt list --upgradable  # Ubuntu

# SELinux状態確認
getenforce

# 実行中のサービス一覧
systemctl list-units --type=service --state=running

# 自動更新設定確認 (RHEL/CentOS)
sudo dnf install dnf-automatic -y
sudo systemctl status dnf-automatic.timer

# 自動更新設定確認 (Ubuntu)
sudo apt install unattended-upgrades -y
sudo systemctl status unattended-upgrades
```

### 2.2 サーバーハードニング

- [ ] rootログインが無効化されている
- [ ] SSH公開鍵認証のみ許可 (パスワード認証無効)
- [ ] SSHポートがデフォルト(22)から変更されている (推奨)
- [ ] 不要なユーザーアカウントが削除されている
- [ ] sudoアクセスが必要最小限のユーザーのみ許可
- [ ] パスワードポリシーが強化されている (最低8文字、複雑性要求)

#### 確認コマンド

```bash
# SSH設定確認
sudo grep "^PermitRootLogin" /etc/ssh/sshd_config
sudo grep "^PasswordAuthentication" /etc/ssh/sshd_config
sudo grep "^Port" /etc/ssh/sshd_config

# ユーザー一覧確認
cat /etc/passwd | grep -v nologin | grep -v false

# sudoアクセス確認
sudo grep -r "sudo" /etc/sudoers /etc/sudoers.d/

# パスワードポリシー確認
sudo grep "^PASS" /etc/login.defs
```

### 2.3 ファイアウォール設定

- [ ] ファイアウォールが有効化されている
- [ ] 必要最小限のポートのみ開放 (80, 443)
- [ ] 内部ポート (3000) が外部に公開されていない
- [ ] 不要なサービスポートが閉じられている
- [ ] ファイアウォールログが有効化されている

#### 確認コマンド

```bash
# firewalld設定確認 (RHEL/CentOS)
sudo firewall-cmd --list-all

# ufw設定確認 (Ubuntu)
sudo ufw status verbose

# 開放ポート確認
sudo ss -tuln | grep LISTEN

# 外部からのポート確認 (別サーバーから実行)
nmap -p 1-65535 library.company.local
```

---

## 3. アプリケーションセキュリティ

### 3.1 認証・認可

- [ ] パスワードハッシュ化 (bcrypt, scrypt, argon2使用)
- [ ] セッションタイムアウトが適切に設定されている (30-60分)
- [ ] セッションIDが推測困難なランダム値
- [ ] ログアウト時にセッションが完全に破棄される
- [ ] 多要素認証 (MFA) の検討 (将来実装)
- [ ] アカウントロックアウトポリシー (5回失敗で30分ロック)

#### 確認方法

```javascript
// server/src/utils/passwordHash.js 確認
// bcryptのsaltRoundsが10以上であること

// server/src/config/session.js 確認
// cookie: { maxAge: 1800000 } // 30分
// cookie: { httpOnly: true, secure: true, sameSite: 'strict' }
```

### 3.2 入力検証

- [ ] すべての入力データが検証されている
- [ ] 入力長制限が設定されている
- [ ] 特殊文字がエスケープされている
- [ ] ファイルアップロードの拡張子・サイズ制限
- [ ] SQLインジェクション対策 (Prepared Statements)
- [ ] XSS対策 (入力サニタイズ、出力エスケープ)

#### 確認コマンド

```bash
# バリデーションミドルウェア確認
grep -r "express-validator" /opt/library/app/server/src/

# Prepared Statements使用確認
grep -r "db.prepare" /opt/library/app/server/src/repositories/
```

### 3.3 セッション管理

- [ ] Cookie設定: `httpOnly: true`
- [ ] Cookie設定: `secure: true` (HTTPS環境)
- [ ] Cookie設定: `sameSite: 'strict'`
- [ ] セッションストレージが安全に管理されている
- [ ] セッション固定攻撃対策 (ログイン時にセッションID再生成)

#### 確認コマンド

```bash
# セッション設定確認
cat /opt/library/app/server/src/config/session.js | grep -E "httpOnly|secure|sameSite"
```

### 3.4 エラーハンドリング

- [ ] エラーメッセージに機密情報が含まれていない
- [ ] スタックトレースが本番環境で非表示
- [ ] 統一されたエラーレスポンス形式
- [ ] エラーログが適切に記録されている
- [ ] ユーザーフレンドリーなエラーメッセージ

#### 確認方法

```bash
# 本番環境でのエラーハンドリング確認
# NODE_ENV=production でスタックトレースが非表示になっているか
grep "NODE_ENV" /opt/library/app/server/.env.production
```

---

## 4. データベースセキュリティ

### 4.1 データベースアクセス制御

- [ ] データベースファイルの権限が`640` (所有者読み書き、グループ読み取りのみ)
- [ ] データベースファイルが`library`ユーザー所有
- [ ] データベースディレクトリの権限が`750`
- [ ] データベース接続文字列に機密情報が含まれていない

#### 確認コマンド

```bash
# データベースファイル権限確認
ls -l /opt/library/data/library.db

# 所有者確認
stat -c "%U:%G" /opt/library/data/library.db

# ディレクトリ権限確認
ls -ld /opt/library/data/
```

### 4.2 データ保護

- [ ] パスワードがハッシュ化されてDB保存されている
- [ ] 機密データが暗号化されている (必要に応じて)
- [ ] データベースバックアップが暗号化されている (推奨)
- [ ] 定期的なデータベース整合性チェック
- [ ] SQLインジェクション対策 (Prepared Statements)

#### 確認コマンド

```bash
# パスワードがハッシュ化されているか確認
sqlite3 /opt/library/data/library.db "SELECT password_hash FROM users LIMIT 1;"

# データベース整合性チェック
sqlite3 /opt/library/data/library.db "PRAGMA integrity_check;"
```

### 4.3 バックアップセキュリティ

- [ ] バックアップファイルの権限が`640`
- [ ] バックアップディレクトリの権限が`750`
- [ ] バックアップファイルが定期的にローテーションされている (30日保持)
- [ ] 外部バックアップストレージへの転送 (推奨)
- [ ] バックアップの復元テストが定期的に実施されている

#### 確認コマンド

```bash
# バックアップファイル権限確認
ls -l /opt/library/data/backups/

# バックアップディレクトリ権限確認
ls -ld /opt/library/data/backups/
```

---

## 5. ネットワークセキュリティ

### 5.1 SSL/TLS設定

- [ ] SSL証明書が有効期限内
- [ ] TLS 1.2以上のみ許可 (TLS 1.0/1.1無効化)
- [ ] 強力な暗号スイートのみ使用
- [ ] HSTS (Strict-Transport-Security) ヘッダー設定
- [ ] SSL証明書チェーン検証
- [ ] 自己署名証明書は開発環境のみ使用

#### 確認コマンド

```bash
# SSL証明書有効期限確認
openssl x509 -in /opt/library/config/ssl/library.crt -text -noout | grep "Not After"

# TLS設定確認
sudo grep "ssl_protocols" /opt/library/config/nginx/library.conf

# 暗号スイート確認
sudo grep "ssl_ciphers" /opt/library/config/nginx/library.conf

# HSTS確認
sudo grep "Strict-Transport-Security" /opt/library/config/nginx/library.conf

# 外部ツールでSSL確認
openssl s_client -connect library.company.local:443 -tls1_2
```

### 5.2 HTTPSリダイレクト

- [ ] HTTPからHTTPSへの強制リダイレクト
- [ ] HSTSヘッダーによるHTTPS強制
- [ ] 平文通信の禁止

#### 確認コマンド

```bash
# HTTPリダイレクト確認
curl -I http://library.company.local

# HSTSヘッダー確認
curl -I https://library.company.local | grep "Strict-Transport-Security"
```

### 5.3 セキュリティヘッダー

- [ ] `X-Frame-Options: SAMEORIGIN`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: no-referrer-when-downgrade`
- [ ] `Content-Security-Policy` (CSP) 設定 (推奨)

#### 確認コマンド

```bash
# セキュリティヘッダー一括確認
curl -I -k https://library.company.local | grep -E "X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Referrer-Policy|Content-Security-Policy"
```

---

## 6. アクセス制御

### 6.1 ユーザー権限管理

- [ ] 最小権限の原則が適用されている
- [ ] 管理者権限が必要最小限のユーザーのみ付与
- [ ] ゲストアカウントが無効化されている
- [ ] デフォルトアカウントが削除または無効化されている
- [ ] 定期的な権限レビュー実施

#### 確認コマンド

```bash
# libraryユーザーの権限確認
sudo -l -U library

# システムユーザー一覧
cat /etc/passwd | grep -v nologin | grep -v false
```

### 6.2 ファイルアクセス制御

- [ ] アプリケーションディレクトリが`library`ユーザー所有
- [ ] 設定ファイルが適切な権限 (640以下)
- [ ] ログディレクトリが`750`権限
- [ ] SSLキーファイルが`600`権限
- [ ] スクリプトファイルが適切な実行権限

#### 確認コマンド

```bash
# ディレクトリ所有者確認
ls -ld /opt/library/

# 設定ファイル権限確認
ls -l /opt/library/app/server/.env.production
ls -l /opt/library/config/ssl/library.key

# ログディレクトリ権限確認
ls -ld /opt/library/logs/
```

### 6.3 ネットワークアクセス制御

- [ ] 社内ネットワークからのみアクセス可能
- [ ] 外部ネットワークからのアクセス禁止
- [ ] IP制限 (必要に応じて)
- [ ] VPN経由アクセス (リモートワーク対応)

---

## 7. 監査とロギング

### 7.1 ログ記録

- [ ] アクセスログが記録されている
- [ ] エラーログが記録されている
- [ ] 認証ログ (成功/失敗) が記録されている
- [ ] 重要操作ログ (貸出/返却/管理者操作) が記録されている
- [ ] ログに機密情報 (パスワード、トークン) が含まれていない

#### 確認コマンド

```bash
# ログファイル一覧確認
ls -lh /opt/library/logs/app/
ls -lh /opt/library/logs/nginx/

# ログ内容確認 (機密情報漏洩チェック)
grep -i "password" /opt/library/logs/app/combined.log | head -10
grep -i "token" /opt/library/logs/app/combined.log | head -10
```

### 7.2 ログ保護

- [ ] ログファイルの権限が`640`以下
- [ ] ログローテーションが設定されている
- [ ] ログファイルが定期的にバックアップされている
- [ ] 古いログが自動削除されている (30日保持)
- [ ] ログ改ざん防止策 (権限設定、外部転送)

#### 確認コマンド

```bash
# ログファイル権限確認
ls -l /opt/library/logs/app/*.log

# ログローテーション設定確認
cat /etc/logrotate.d/library

# ログファイルサイズ確認
du -sh /opt/library/logs/
```

### 7.3 監査ログ

- [ ] 管理者操作が監査ログに記録されている
- [ ] ログインイベントが記録されている
- [ ] セキュリティイベント (認証失敗、権限エラー) が記録されている
- [ ] 監査ログが定期的にレビューされている

---

## 8. 定期セキュリティレビュー

### 8.1 月次セキュリティチェック

- [ ] システムパッケージ更新確認
- [ ] npm脆弱性スキャン実行
- [ ] SSL証明書有効期限確認 (90日前にアラート)
- [ ] ログファイル分析 (異常アクセス検出)
- [ ] ファイアウォールルール確認
- [ ] バックアップ実行確認

#### 確認コマンド

```bash
# システム更新確認
sudo dnf check-update

# npm脆弱性スキャン
cd /opt/library/app/server && npm audit
cd /opt/library/app/client && npm audit

# SSL証明書確認
openssl x509 -in /opt/library/config/ssl/library.crt -text -noout | grep "Not After"

# 異常アクセス検出
grep -i "401\|403\|500" /opt/library/logs/nginx/access.log | tail -50
```

### 8.2 四半期セキュリティレビュー

- [ ] 全ユーザーアカウントレビュー
- [ ] 管理者権限レビュー
- [ ] 不要なユーザーアカウント削除
- [ ] パスワードポリシーレビュー
- [ ] ファイアウォールルールレビュー
- [ ] セキュリティインシデント対応計画レビュー
- [ ] バックアップ復元テスト実施

### 8.3 年次セキュリティ監査

- [ ] 外部セキュリティ監査実施 (推奨)
- [ ] ペネトレーションテスト実施 (推奨)
- [ ] セキュリティポリシーレビュー
- [ ] インシデント対応訓練実施
- [ ] 災害復旧計画レビュー

---

## 9. セキュリティインシデント対応

### 9.1 インシデント検知

- [ ] 異常アクセスパターン検知
- [ ] 大量ログイン失敗検知
- [ ] データベース異常アクセス検知
- [ ] リソース異常使用検知

### 9.2 インシデント対応フロー

```
インシデント検知
    ↓
初動対応 (15分以内)
    ├─ サービス隔離・停止
    ├─ 影響範囲特定
    └─ 関係者通知
    ↓
調査・分析 (1時間以内)
    ├─ ログ分析
    ├─ 侵入経路特定
    └─ 影響範囲確定
    ↓
復旧対応 (状況に応じて)
    ├─ 脆弱性修正
    ├─ システム復旧
    └─ 動作確認
    ↓
事後対応 (24時間以内)
    ├─ インシデント報告書作成
    ├─ 再発防止策策定
    └─ セキュリティポリシー更新
```

---

## 10. コンプライアンス

### 10.1 個人情報保護

- [ ] 個人情報が適切に管理されている
- [ ] 不要な個人情報が収集されていない
- [ ] 個人情報へのアクセスが記録されている
- [ ] 個人情報が安全に削除される手順がある

### 10.2 情報セキュリティポリシー準拠

- [ ] 組織のセキュリティポリシーに準拠
- [ ] データ保持ポリシーに準拠
- [ ] アクセス制御ポリシーに準拠
- [ ] バックアップポリシーに準拠

---

## チェックリスト記録

### デプロイ前チェック記録

| チェック日 | 担当者 | 結果 | 備考 |
|-----------|-------|------|------|
| 2025-01-11 | (名前) | ✅ | 全項目クリア |
| | | | |

### 定期レビュー記録

| レビュー日 | レビュー種別 | 担当者 | 結果 | 備考 |
|-----------|------------|-------|------|------|
| 2025-01-11 | デプロイ前 | (名前) | ✅ | 全項目クリア |
| | | | | |

---

**作成者**: DevOps Architect
**最終更新**: 2025-01-11
**次回レビュー**: 2025-04-11
