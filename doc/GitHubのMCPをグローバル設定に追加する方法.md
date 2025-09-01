# GitHub MCPをグローバル設定に追加する方法

このドキュメントでは、GitHub MCPをグローバル設定に追加する方法を解説します。Git Bashを使用して実行します。

## 前提条件

- Claude Codeがインストールされていること
- 環境変数`GH_TOKEN`に有効なGitHubパーソナルアクセストークンが設定されていること

## 手順

1. エクスプローラーでC:\ClaudeCodeフォルダ（または任意の作業ディレクトリ）を開きます

2. フォルダ内で右クリックし、「Open Git bash here」を選択してGit Bashを開きます

3. 以下のコマンドを実行して、環境変数から設定ファイルを生成します:

   ```bash
   envsubst < add_mcp_windows.json > add_token_github_mcp.json
   ```

4. 生成されたJSONファイルを使用して、GitHub MCPを追加します:

   ```bash
   claude mcp add-json github-org -s user "$(cat add_token_github_mcp.json)" --verbose
   ```

   正常に追加されると、以下のメッセージが表示されます:
   ```
   Added stdio MCP server github-org to user config
   ```

5. 設定が正しく行われたか確認するには:

   ```bash
   claude mcp list
   ```

   正常に設定されている場合、以下のような結果が表示されます:
   ```
   Checking MCP server health...

   github-org: cmd /c npx -y @modelcontextprotocol/server-github - ✓ Connected
   ```

これで、環境変数`GH_TOKEN`の値を使用してGitHub MCPがグローバル設定に追加されました。

## トラブルシューティング

- **コマンドが見つからないエラー**: Git BashにenvsubstコマンドがインストールされているかGit for Windowsのバージョンを確認してください
- **認証エラーが発生する場合**: GH_TOKENの有効期限や権限を確認してください
- **接続エラーが発生する場合**: インターネット接続を確認し、npmパッケージがインストールできる環境であることを確認してください