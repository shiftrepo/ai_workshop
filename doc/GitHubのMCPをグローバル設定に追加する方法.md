# GitHub MCPをグローバル設定に追加する方法

このドキュメントでは、GitHub MCPをグローバル設定に追加する方法を解説します。キー情報は環境変数の`GH_TOKEN`から取得します。

## 前提条件

- Claude Codeがインストールされていること
- 環境変数`GH_TOKEN`に有効なGitHubパーソナルアクセストークンが設定されていること

## 手順

1. ターミナル（コマンドプロンプトまたはPowerShell）を開きます

2. 以下のコマンドを実行して、環境変数からGH_TOKENを取得します:

   ```bash
   echo %GH_TOKEN%
   ```

   PowerShellの場合:

   ```powershell
   echo $env:GH_TOKEN
   ```

3. Claude Codeの設定ファイルを開きます:

   ```bash
   claude settings edit
   ```

4. 設定ファイルに以下の内容を追加します:

   ```json
   {
     "mcps": {
       "github": {
         "name": "github",
         "provider": "github",
         "auth": {
           "token": "${GH_TOKEN}"
         }
       }
     }
   }
   ```

5. 設定ファイルを保存して閉じます

6. Claude Codeを再起動して設定を適用します:

   ```bash
   claude restart
   ```

7. 設定が正しく行われたか確認するには:

   ```bash
   claude settings list
   ```

   または

   ```bash
   claude settings get mcps
   ```

これで、環境変数`GH_TOKEN`の値を使用してGitHub MCPがグローバル設定に追加されました。

## トラブルシューティング

- **設定が反映されない場合**: ターミナルを再起動して、環境変数が正しく読み込まれていることを確認してください
- **認証エラーが発生する場合**: GH_TOKENの有効期限や権限を確認してください
- **設定ファイルの構文エラー**: JSON形式が正しいことを確認してください