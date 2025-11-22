# GitHub Issue確認方法

## 利用可能な方法とツール

### 1. MCP GitHub Tool（推奨）
最も効率的で確実な方法

```javascript
// 基本的なissue取得
mcp__github-org__get_issue({
  owner: "shiftrepo",
  repo: "ai_workshop", 
  issue_number: 9
})

// issue一覧取得
mcp__github-org__list_issues({
  owner: "shiftrepo",
  repo: "ai_workshop",
  state: "open" | "closed" | "all"
})

// issueコメント取得
mcp__github-org__add_issue_comment({
  owner: "shiftrepo",
  repo: "ai_workshop",
  issue_number: 9,
  body: "コメント内容"
})
```

### 2. GitHub CLI（gh）- 環境依存
GitHub CLIがインストールされている場合のみ利用可能

```bash
# issue詳細取得
gh issue view 9 --repo shiftrepo/ai_workshop --json number,title,body,state,createdAt,comments

# issue一覧
gh issue list -R shiftrepo/ai_workshop --json number,title,state,createdAt
```

**注意**: 
- `command not found: gh` エラーが発生する場合はGitHub CLIが未インストール
- 環境によっては利用できない

### 3. Git リポジトリ情報の確認
現在のリポジトリ情報を確認する基本コマンド

```bash
# 現在のリポジトリ状態確認
git status && git remote -v

# ブランチ確認  
git branch

# リモートリポジトリ確認
git remote -v
```

## 実際の使用例（Issue #9 分析時）

### Step 1: リポジトリ確認
```bash
git status && git remote -v
# → origin git@github.com:shiftrepo/ai_workshop.git
```

### Step 2: GitHub CLI試行（失敗例）
```bash
gh issue view 9 --repo shiftrepo/ai_workshop --json number,title,body,state,createdAt,comments
# → Exit code 127: command not found: gh
```

### Step 3: MCP GitHub Tool使用（成功）
```javascript
mcp__github-org__get_issue({
  owner: "shiftrepo",
  repo: "ai_workshop", 
  issue_number: 9
})
```

## 得られた情報の構造

### Issue基本情報
- `number`: Issue番号
- `title`: タイトル 
- `body`: 本文（Markdown形式）
- `state`: "open" | "closed"
- `created_at`: 作成日時
- `updated_at`: 更新日時
- `user`: 作成者情報
- `comments`: コメント数

### 重要なフィールド
- `body`: 要件や詳細な情報が含まれるメインコンテンツ
- `comments`: コメント数（追加情報がある場合）
- `sub_issues_summary`: サブIssueの情報
- `labels`: ラベル情報（優先度や分類）

## トラブルシューティング

### GitHub CLI未インストール時
- MCP GitHub Toolを使用する
- 直接WebブラウザでGitHub URLにアクセス

### 権限エラー時  
- リポジトリのアクセス権限を確認
- GitHub tokenの設定を確認

### 大量データ取得時
- ページネーション機能を使用
- 必要な情報のみをフィルタリング

## ベストプラクティス

1. **MCP GitHub Toolを優先使用**
   - 環境に依存しない
   - 構造化されたデータが取得可能
   - エラーハンドリングが確実

2. **段階的な情報取得**
   - 基本情報 → 詳細情報 → コメント の順序
   - 必要に応じて追加の API呼び出し

3. **エラー時のフォールバック**
   - GitHub CLI失敗時はMCP Toolに切り替え
   - 複数の方法を組み合わせて使用

4. **情報の整理**
   - 取得した情報を構造化して記録
   - 要件抽出時は議事録形式で整理