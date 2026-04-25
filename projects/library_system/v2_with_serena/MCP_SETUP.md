# MCP Server Setup Guide

このドキュメントは、library_system_with_serenaプロジェクトで使用するMCPサーバーの設定手順を説明します。

## 前提条件

- Node.js (v20以上)
- Python (3.8以上)
- Claude Code CLI
- Git Bash (Windows環境の場合)

## 必要なMCPサーバー

このプロジェクトでは以下の3つのMCPサーバーを使用します：

1. **context7** - ライブラリドキュメント検索
2. **serena** - コードベース解析とセマンティック操作
3. **cipher** - AIメモリとセッション管理

---

## 1. uvパッケージマネージャーのインストール

Serena MCPの実行に必要なuvをインストールします。

```bash
pip install uv
```

確認：
```bash
python -m uv --version
# 出力例: uv 0.9.8
```

---

## 2. Context7 MCPの設定

Context7は自動的に設定されている場合が多いですが、手動で追加する場合：

```bash
claude mcp add-json context7 '{"command":"npx","args":["-y","@upstash/context7-mcp"]}'
```

---

## 3. Serena MCPの設定

### 設定コマンド

```bash
claude mcp add-json serena '{"command":"python","args":["-m","uv","tool","run","--from","git+https://github.com/oraios/serena","serena","start-mcp-server","--context","ide-assistant","--project","YOUR_PROJECT_PATH"],"env":{}}'
```

**重要**: `YOUR_PROJECT_PATH` を実際のプロジェクトパスに置き換えてください。

### 例（このプロジェクトの場合）

```bash
claude mcp add-json serena '{"command":"python","args":["-m","uv","tool","run","--from","git+https://github.com/oraios/serena","serena","start-mcp-server","--context","ide-assistant","--project","C:/ClaudeCode/ai_workshop/library_system_with_serena"],"env":{}}'
```

---

## 4. Cipher MCPの設定

Cipherは最も複雑な設定が必要です。

### 4.1 環境変数の設定

Windowsの場合、**システム環境変数**として以下を設定してください：

1. `Win + X` → 「システム」→  「環境変数」
2. 以下の3つの変数を追加：

```
変数名: AWS_ACCESS_KEY_ID
変数値: YOUR_AWS_ACCESS_KEY_ID

変数名: AWS_SECRET_ACCESS_KEY
変数値: YOUR_AWS_SECRET_ACCESS_KEY

変数名: AWS_REGION
変数値: us-east-1
```

**重要**: 環境変数設定後、PCを再起動するか、すべてのターミナルを閉じて新しいターミナルを開いてください。

### 4.2 .envファイルの作成（重要）

Cipherは起動時に少なくとも1つのAPIキーを要求します。AWS Bedrockを使用する場合でも、OPENAIのダミーキーが必要です。

以下の2つの.envファイルを作成してください：

#### ファイル1: `C:\Users\YOUR_USERNAME\AppData\Roaming\npm\node_modules\@byterover\cipher\.env`

```env
OPENAI_API_KEY=sk-dummy-key-for-aws-bedrock-usage
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=us-east-1
```

#### ファイル2: `C:\Users\YOUR_USERNAME\AppData\Roaming\npm\node_modules\@byterover\cipher\dist\.env`

```env
OPENAI_API_KEY=sk-dummy-key-for-aws-bedrock-usage
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=us-east-1
```

**注意**:
- `OPENAI_API_KEY`の値は実際のOpenAIキーでなくても構いません（ダミー値でOK）
- AWS Bedrockを使用する場合、実際に使用されるのはAWS認証情報です
- OPENAIキーの設定は、Cipherの初期化チェックを通過するために必要です

### 4.3 Cipher MCPの登録

```bash
claude mcp add-json cipher '{"command":"npx","args":["@byterover/cipher","--mode","mcp"],"env":{"OPENAI_API_KEY":"sk-dummy-key-for-aws-bedrock-usage","AWS_ACCESS_KEY_ID":"YOUR_AWS_ACCESS_KEY_ID","AWS_SECRET_ACCESS_KEY":"YOUR_AWS_SECRET_ACCESS_KEY","AWS_REGION":"us-east-1"}}'
```

**実際の値に置き換えてください**: `YOUR_AWS_ACCESS_KEY_ID`, `YOUR_AWS_SECRET_ACCESS_KEY`

---

## 5. 設定の確認

すべてのMCPサーバーが正常に接続されているか確認します：

```bash
claude mcp list
```

期待される出力：
```
Checking MCP server health...

context7: npx -y @upstash/context7-mcp - ✓ Connected
serena: python -m uv tool run --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project YOUR_PROJECT_PATH - ✓ Connected
cipher: npx @byterover/cipher --mode mcp - ✓ Connected
```

すべてのサーバーに `✓ Connected` が表示されていればOKです。

---

## トラブルシューティング

### Serena接続失敗

**エラー**: `uvx: command not found`

**解決策**:
```bash
pip install uv
```

### Cipher接続失敗

**エラー**: `No API key or Ollama configuration found`

**解決策**:
1. システム環境変数（AWS_ACCESS_KEY_ID等）が設定されているか確認
2. .envファイルが正しく作成されているか確認
3. OPENAIダミーキーが設定されているか確認
4. PCを再起動

### 環境変数が認識されない

**解決策**:
- Windowsの場合、環境変数設定後に**必ずPCを再起動**してください
- または、すべてのターミナル/コマンドプロンプトを閉じて、新しく開いてください

---

## 異なるPC環境での設定

### Windows環境

上記の手順をそのまま実行してください。

### Linux/Mac環境

1. uvのインストールは同じ
2. 環境変数の設定:
   - `~/.bashrc` または `~/.zshrc` に追加：
     ```bash
     export AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID"
     export AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY"
     export AWS_REGION="us-east-1"
     ```
   - その後: `source ~/.bashrc` または `source ~/.zshrc`

3. .envファイルのパス:
   - グローバルnpmディレクトリを確認: `npm root -g`
   - 通常: `~/.npm-global/lib/node_modules/@byterover/cipher/.env`

4. MCP登録コマンドは同じ

---

## まとめ

**最重要ポイント**:
1. ✅ uvをインストール (`pip install uv`)
2. ✅ AWS環境変数をシステム環境変数として設定
3. ✅ Cipherの.envファイルに**OPENAIダミーキー**を含める
4. ✅ プロジェクトパスを正しく指定
5. ✅ 設定後はPCを再起動

この手順書を他のPCに持っていけば、同じ環境を構築できます。
