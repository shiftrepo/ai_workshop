# Githubにリポジトリを作成してClaudeCodeでアクセス



```
> ローカルリポジトリよりリモートリポジトリを取得し、githubのリポジトリからissueの一覧を取得してください。

● I'll fetch the issues from the GitHub repository. Let me do that for you.

● Bash(git remote -v)
  ⎿  origin     git@github.com:shiftrepo/ai_workshop.git (fetch
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
  ```