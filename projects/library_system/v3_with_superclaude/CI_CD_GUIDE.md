# CI/CD Integration Guide

**作成日**: 2025-01-11
**バージョン**: 1.0
**関連文書**: TEST_STRATEGY.md, TEST_CASES.md

---

## 目次

1. [GitHub Actions ワークフロー概要](#1-github-actions-ワークフロー概要)
2. [ワークフロー構成](#2-ワークフロー構成)
3. [環境変数とシークレット](#3-環境変数とシークレット)
4. [テスト実行フロー](#4-テスト実行フロー)
5. [デプロイメントフロー](#5-デプロイメントフロー)
6. [品質ゲート](#6-品質ゲート)
7. [トラブルシューティング](#7-トラブルシューティング)

---

## 1. GitHub Actions ワークフロー概要

### ワークフロー一覧

| ワークフロー | トリガー | 目的 | 実行時間 |
|------------|---------|------|---------|
| **test.yml** | Push/PR (main, develop) | 完全なテストスイート実行 | ~15-20分 |
| **deploy.yml** | Push (main), Tags (v*) | ビルド・デプロイメント | ~10-15分 |
| **pre-commit.yml** | Pull Request | PR前検証チェック | ~5-8分 |

### ワークフロー依存関係

```
Pull Request作成
    ↓
pre-commit.yml (Lint, Format, Coverage)
    ↓
test.yml (Unit, Integration, E2E)
    ↓
Pull Requestマージ
    ↓
deploy.yml (Build, Staging, Production)
```

---

## 2. ワークフロー構成

### test.yml - 完全テストスイート

#### Job構成

**1. backend-tests**
- **目的**: バックエンドの単体テスト・統合テスト実行
- **戦略**: Node.js 18.x, 20.x のマトリックステスト
- **カバレッジ**: 80%以上必須
- **実行時間**: ~5-7分

**手順**:
```yaml
1. リポジトリチェックアウト
2. Node.js環境セットアップ (キャッシュ有効)
3. 依存関係インストール (npm ci)
4. Lint実行 (ESLint)
5. 単体テスト実行 (Jest, カバレッジ付き)
6. カバレッジレポートアップロード (Codecov)
7. 統合テスト実行 (Supertest + SQLite)
```

**2. frontend-tests**
- **目的**: フロントエンドの単体テスト実行
- **環境**: Node.js 20.x
- **カバレッジ**: 80%以上必須
- **実行時間**: ~4-6分

**手順**:
```yaml
1. リポジトリチェックアウト
2. Node.js環境セットアップ (キャッシュ有効)
3. 依存関係インストール (npm ci)
4. Lint実行 (ESLint)
5. 型チェック (TypeScript)
6. 単体テスト実行 (Vitest, カバレッジ付き)
7. カバレッジレポートアップロード (Codecov)
```

**3. e2e-tests**
- **目的**: エンドツーエンドテスト実行
- **依存**: backend-tests, frontend-tests完了後
- **実行時間**: ~8-12分

**手順**:
```yaml
1. リポジトリチェックアウト
2. Node.js環境セットアップ
3. バックエンド依存関係インストール
4. フロントエンド依存関係インストール
5. データベース初期化 (db:init + db:seed)
6. バックエンドサーバ起動 (バックグラウンド)
7. フロントエンドビルド
8. フロントエンドサーバ起動 (preview mode)
9. Playwright ブラウザインストール (Chromium)
10. E2Eテスト実行
11. Playwrightレポートアップロード (成功・失敗問わず)
12. スクリーンショットアップロード (失敗時のみ)
```

**4. performance-tests**
- **目的**: 負荷テストとパフォーマンス検証
- **トリガー**: main ブランチへのプッシュのみ
- **実行時間**: ~5-8分

**手順**:
```yaml
1. リポジトリチェックアウト
2. Artillery インストール
3. 大量テストデータ投入 (db:seed:large)
4. バックエンドサーバ起動 (production mode)
5. 負荷テスト実行 (Artillery)
6. HTMLレポート生成
7. パフォーマンスレポートアップロード
8. しきい値チェック (P95 < 500ms)
```

**5. security-scan**
- **目的**: セキュリティ脆弱性スキャン
- **トリガー**: main/develop ブランチへのプッシュ
- **実行時間**: ~3-5分

**手順**:
```yaml
1. npm audit 実行 (backend + frontend)
2. Snyk セキュリティスキャン (SNYK_TOKEN必須)
3. 高リスク脆弱性検出時は警告
```

**6. quality-gate**
- **目的**: PR品質確認ゲート
- **トリガー**: Pull Request作成時
- **依存**: backend-tests, frontend-tests, e2e-tests完了

**判定基準**:
- ✅ 全テスト成功
- ✅ カバレッジ ≥ 80%
- ✅ E2Eテスト成功率 100%

---

### deploy.yml - デプロイメントパイプライン

#### Job構成

**1. test**
- **目的**: デプロイ前のテスト実行
- **実装**: test.yml ワークフローを再利用

**2. build-and-push**
- **目的**: Dockerイメージビルド・プッシュ
- **レジストリ**: GitHub Container Registry (ghcr.io)
- **実行時間**: ~8-10分

**手順**:
```yaml
1. Container Registryにログイン
2. メタデータ抽出 (タグ, ラベル)
3. バックエンドDockerイメージビルド・プッシュ
4. フロントエンドDockerイメージビルド・プッシュ
5. キャッシュ活用でビルド時間短縮
```

**タグ戦略**:
```yaml
- type=ref,event=branch         # ブランチ名タグ (例: main)
- type=ref,event=pr             # PR番号タグ (例: pr-123)
- type=semver,pattern={{version}}  # セマンティックバージョン (例: 1.2.3)
- type=semver,pattern={{major}}.{{minor}}  # メジャー.マイナー (例: 1.2)
- type=sha                      # コミットSHA (例: sha-abc1234)
```

**3. deploy-staging**
- **目的**: ステージング環境へのデプロイ
- **トリガー**: main ブランチへのプッシュ
- **環境URL**: https://staging.library.example.com
- **実行時間**: ~3-5分

**手順**:
```yaml
1. ステージング環境へデプロイ (kubectl/helm)
2. スモークテスト実行 (ヘルスチェック)
```

**4. deploy-production**
- **目的**: 本番環境へのデプロイ
- **トリガー**: v* タグプッシュのみ
- **依存**: staging デプロイ成功後
- **環境URL**: https://library.example.com
- **実行時間**: ~3-5分

**手順**:
```yaml
1. 本番環境へデプロイ (kubectl/helm)
2. スモークテスト実行 (ヘルスチェック)
3. デプロイメント記録作成 (GitHub API)
4. デプロイ成功通知 (Slack/Discord/Email)
```

---

### pre-commit.yml - Pull Request検証

#### Job構成

**1. lint-and-format**
- **目的**: コード品質チェック
- **実行時間**: ~3-4分

**検証項目**:
```yaml
- ESLint (backend + frontend)
- TypeScript型チェック (frontend)
- Prettier フォーマット検証 (backend + frontend)
```

**2. commit-message-check**
- **目的**: コミットメッセージ規約確認
- **フォーマット**: Conventional Commits

**有効な形式**:
```
feat(auth): add JWT authentication
fix(api): resolve loan limit check bug
docs(readme): update installation steps
style(ui): improve button spacing
refactor(db): optimize query performance
perf(api): add response caching
test(loan): add edge case tests
chore(deps): update dependencies
ci(workflow): improve test parallelization
```

**3. dependency-check**
- **目的**: 依存関係の脆弱性・古さチェック
- **実行時間**: ~2-3分

**検証項目**:
```yaml
- npm audit (高リスク脆弱性検出)
- npm outdated (古い依存関係警告)
```

**4. pr-size-check**
- **目的**: PR規模の確認
- **実行時間**: ~1分

**警告基準**:
```yaml
- ファイル数 > 50個: ⚠️ 警告
- 行数変更 > 1000行: ⚠️ 小さいPRへの分割推奨
```

**5. test-coverage-check**
- **目的**: カバレッジしきい値検証
- **実行時間**: ~5-7分

**基準**:
```yaml
- Backend: ≥ 80%
- Frontend: ≥ 80%
- しきい値未満: ❌ 失敗
```

**6. label-check**
- **目的**: PR分類ラベル確認
- **必須ラベル**: feature, bugfix, enhancement, documentation, breaking-change

---

## 3. 環境変数とシークレット

### GitHub Secrets設定

#### 必須シークレット

| シークレット名 | 用途 | 設定場所 |
|-------------|------|---------|
| `GITHUB_TOKEN` | Container Registry認証 | 自動設定 |
| `CODECOV_TOKEN` | Codecov連携 | Settings → Secrets |
| `SNYK_TOKEN` | Snykセキュリティスキャン | Settings → Secrets |

#### オプショナルシークレット

| シークレット名 | 用途 | 設定場所 |
|-------------|------|---------|
| `SLACK_WEBHOOK_URL` | Slack通知 | Settings → Secrets |
| `DISCORD_WEBHOOK_URL` | Discord通知 | Settings → Secrets |
| `DEPLOY_SSH_KEY` | SSHデプロイ用 | Settings → Secrets |

### 環境変数

#### test.yml

```yaml
NODE_ENV: test
PORT: 3000
DATABASE_URL: :memory:  # SQLite in-memory
SESSION_SECRET: test-secret-key
```

#### deploy.yml

```yaml
REGISTRY: ghcr.io
IMAGE_NAME: ${{ github.repository }}
```

---

## 4. テスト実行フロー

### ローカル環境でのテスト

#### バックエンド

```bash
# 単体テスト
cd server
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage

# 統合テスト
npm run test:integration
```

#### フロントエンド

```bash
# 単体テスト
cd client
npm run test:unit

# E2Eテスト (ヘッドレス)
npm run test:e2e

# E2Eテスト (ブラウザ表示)
npm run test:e2e:ui
```

### CI環境でのテスト実行順序

```
1. Pre-commit checks (PR作成時)
   ├─ Lint & Format
   ├─ Commit Message
   ├─ Dependency Check
   ├─ PR Size Check
   ├─ Coverage Check
   └─ Label Check

2. Test Suite (PR作成時 + マージ後)
   ├─ Backend Tests (並列: Node 18.x, 20.x)
   ├─ Frontend Tests
   ├─ E2E Tests (Backend + Frontend完了後)
   ├─ Performance Tests (main ブランチのみ)
   └─ Security Scan (main/develop ブランチのみ)

3. Quality Gate (PR作成時)
   └─ 全テスト成功確認
```

---

## 5. デプロイメントフロー

### ステージング環境デプロイ

**トリガー**: main ブランチへのマージ

**手順**:
```bash
1. test.yml 実行 (全テストスイート)
   ↓ 成功
2. Docker イメージビルド・プッシュ
   ↓
3. ステージング環境デプロイ
   - Kubernetes: kubectl apply -f k8s/staging/
   - Helm: helm upgrade --install library-system ./charts --namespace staging
   ↓
4. スモークテスト実行
   - ヘルスチェック: curl https://staging.library.example.com/health
   ↓ 成功
5. ステージング環境利用可能
```

### 本番環境デプロイ

**トリガー**: v* タグのプッシュ (例: v1.2.3)

**手順**:
```bash
1. test.yml 実行 (全テストスイート)
   ↓ 成功
2. Docker イメージビルド・プッシュ
   ↓
3. ステージング環境デプロイ・検証
   ↓ 成功
4. 本番環境デプロイ
   - Kubernetes: kubectl apply -f k8s/production/
   - Helm: helm upgrade --install library-system ./charts --namespace production
   ↓
5. スモークテスト実行
   - ヘルスチェック: curl https://library.example.com/health
   ↓ 成功
6. デプロイメント記録作成
7. 通知送信 (Slack/Discord/Email)
```

### タグ作成とリリース

```bash
# バージョンタグ作成
git tag v1.2.3
git push origin v1.2.3

# GitHub Releaseで自動的にデプロイが開始される
```

---

## 6. 品質ゲート

### リリース条件

すべての条件を満たす必要があります:

| 条件 | 基準 | 検証方法 |
|-----|------|---------|
| ✅ 全テスト成功 | 100% | test.yml ワークフロー |
| ✅ カバレッジ | ≥ 80% | Codecov レポート |
| ✅ E2Eテスト成功率 | 100% | Playwright レポート |
| ✅ セキュリティスキャン | 高リスク0件 | Snyk レポート |
| ✅ パフォーマンス | P95 < 500ms | Artillery レポート |
| ✅ コードレビュー | 承認済み | GitHub PR Review |

### 品質メトリクス

#### テストカバレッジ

```yaml
目標:
  backend_unit: ≥ 85%
  backend_integration: ≥ 70%
  frontend_unit: ≥ 80%
  e2e_coverage: 主要シナリオ 100%
```

#### パフォーマンス

```yaml
目標:
  api_response_time_avg: < 200ms
  api_response_time_p95: < 500ms
  page_load_time: < 2s
  lighthouse_score: ≥ 90
```

#### セキュリティ

```yaml
目標:
  critical_vulnerabilities: 0
  high_vulnerabilities: 0
  medium_vulnerabilities: < 5
```

---

## 7. トラブルシューティング

### よくある問題と解決策

#### 1. テストタイムアウト

**問題**: E2Eテストが時間内に完了しない

**解決策**:
```yaml
# playwright.config.ts
timeout: 30000  # 30秒に延長

# または wait-on タイムアウト延長
npx wait-on http://localhost:3000 --timeout 60000
```

#### 2. カバレッジしきい値未達

**問題**: カバレッジが80%未満でCI失敗

**解決策**:
```bash
# テスト追加が必要な箇所を確認
npm run test:coverage

# カバレッジレポート確認
open coverage/lcov-report/index.html

# 未テスト箇所にテスト追加
```

#### 3. Docker イメージビルド失敗

**問題**: Docker ビルドエラー

**解決策**:
```bash
# ローカルでビルド確認
docker build -t library-system-backend ./server
docker build -t library-system-frontend ./client

# ビルドログ確認
docker build --no-cache -t library-system-backend ./server 2>&1 | tee build.log
```

#### 4. デプロイメント失敗

**問題**: ステージング/本番デプロイ失敗

**解決策**:
```bash
# スモークテスト手動実行
curl -f https://staging.library.example.com/health

# ログ確認
kubectl logs -f deployment/library-system -n staging

# ロールバック
kubectl rollout undo deployment/library-system -n staging
```

#### 5. Playwright ブラウザインストール失敗

**問題**: `npx playwright install` エラー

**解決策**:
```yaml
# システム依存関係を含めてインストール
npx playwright install --with-deps chromium

# または特定ブラウザのみ
npx playwright install chromium
```

#### 6. npm audit エラー

**問題**: 高リスク脆弱性検出

**解決策**:
```bash
# 詳細確認
npm audit

# 自動修正試行
npm audit fix

# 強制アップデート (破壊的変更注意)
npm audit fix --force

# 手動アップデート
npm update <package-name>
```

### ワークフロー再実行

#### GitHub UI経由

```
1. Actions タブを開く
2. 失敗したワークフローをクリック
3. "Re-run jobs" ボタンをクリック
4. "Re-run failed jobs" または "Re-run all jobs" を選択
```

#### GitHub CLI経由

```bash
# 最新のワークフロー実行を再実行
gh run rerun <run-id>

# 失敗したジョブのみ再実行
gh run rerun <run-id> --failed
```

### ログとアーティファクト

#### Playwright レポート確認

```
1. Actions タブ → 失敗したワークフロー
2. Artifacts セクションから "playwright-report" ダウンロード
3. 解凍して index.html をブラウザで開く
```

#### パフォーマンスレポート確認

```
1. Actions タブ → performance-tests ワークフロー
2. Artifacts セクションから "performance-report" ダウンロード
3. report.html をブラウザで開く
```

---

## ベストプラクティス

### 1. コミットメッセージ規約

```bash
# 良い例
feat(auth): implement JWT token refresh mechanism
fix(loan): correct 3-book limit validation logic
docs(api): add OpenAPI specification

# 悪い例
update code
fix bug
changes
```

### 2. PR作成前チェックリスト

- [ ] ローカルで全テスト成功
- [ ] カバレッジ 80% 以上
- [ ] Lint エラーなし
- [ ] TypeScript エラーなし
- [ ] コミットメッセージが規約準拠
- [ ] PRに適切なラベル付与
- [ ] PR説明文に変更内容記載

### 3. ブランチ戦略

```
main (本番)
  ↑
develop (開発)
  ↑
feature/* (機能開発)
bugfix/* (バグ修正)
hotfix/* (緊急修正)
```

### 4. タグ戦略

```
v1.0.0   - メジャーリリース (破壊的変更)
v1.1.0   - マイナーリリース (新機能追加)
v1.1.1   - パッチリリース (バグ修正)
```

---

## パフォーマンス最適化

### キャッシュ戦略

```yaml
# Node.js 依存関係キャッシュ
- uses: actions/setup-node@v3
  with:
    cache: 'npm'
    cache-dependency-path: '**/package-lock.json'

# Docker レイヤーキャッシュ
cache-from: type=registry,ref=ghcr.io/repo:buildcache
cache-to: type=registry,ref=ghcr.io/repo:buildcache,mode=max
```

### 並列実行

```yaml
# マトリックス戦略
strategy:
  matrix:
    node-version: [18.x, 20.x]
  max-parallel: 2

# 依存関係のないジョブは並列実行
jobs:
  backend-tests:
  frontend-tests:  # backend-testsと並列実行
```

### リソース制限

```yaml
# Jest 並列ワーカー制限
npm run test -- --maxWorkers=2

# Playwright 並列実行
npm run test:e2e -- --workers=2
```

---

## 次のステップ

1. **GitHub Secrets設定**: Codecov, Snyk トークン登録
2. **環境構築**: Staging/Production 環境準備
3. **通知設定**: Slack/Discord Webhook設定
4. **モニタリング**: デプロイメント監視ダッシュボード構築
5. **継続的改善**: テスト実行時間短縮、カバレッジ向上

---

**作成者**: Quality Engineer
**レビュー日**: 2025-01-11
**関連ドキュメント**: TEST_STRATEGY.md, TEST_CASES.md, BACKEND_IMPLEMENTATION.md
