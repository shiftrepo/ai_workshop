# ClaudeCodeのインストールと設定

powershellを使います。

powershellを起動して下記のコマンドを実行してください。

`irm https://claude.ai/install.ps1 | iex`

場所は任意でいいですが、googleクラウドからダウンロードした資材の配下のほうがいいでしょう。

```
PS C:\ClaudeCode> irm https://claude.ai/install.ps1 | iex
Setting up Claude Code...

‼ Setup notes:
  • C:\Users\kappappa\.local\bin is not in your PATH
  • Add it by running: setx PATH "%PATH%;C:\Users\kappappa\.local\bin"
  • Or add it through System Properties > Environment Variables


√ Claude Code successfully installed!

  Version: 1.0.90

  Location: C:\Users\kappappa\.local\bin\claude.exe


  Next: Run claude --help to get started

✅ Installation complete!
```

# pathを通す
インストールだけでは実行ファイルにpathを通してくれないので、手動で下記のフォルダを環境変数のpathに追加してください。node同様にユーザでもシステムでも構いません。

`%USERPROFILE%\.local\bin`

# Claudeの実行

下記で起動します。

`claude`

画面のテーマはご自由に選択してください。

ファイルとフォルダのアクセスを信頼してください。
```
Do you trust the files in this folder?
> 1. Yes, proceed
```

なんでもいいので、LLMと会話してみましょう。答えが返ってきたらOKです。

```
> hello

● Hello! How can I help you today?
```

続いて、GitHubと連携するための設定をします。
いったん`/exit`でclaudeから抜けましょう。

> ローカルリポジトリよりリモートリポジトリを取得し、githubのリポジトリからissueの一覧を取得してください。

● I'll fetch the issues from the GitHub repository. Let me do that for you.

● Bash(git remote -v)
  ⎿  origin     git@github.com:shiftrepo/ai_workshop.git (fetch)
     origin     git@github.com:shiftrepo/ai_workshop.git (push)

● Bash(gh issue list -R shiftrepo/ai_workshop --json number,title,state,createdAt)
  ⎿  [
       {
         "createdAt": "2025-08-25T06:42:52Z",
     … +5 lines (ctrl+r to expand)

● 以下がGitHubリポジトリから取得したissueの一覧です：

  Issue #1: 環境作成用の手順作成
  状態: OPEN
  作成日: 2025-08-25