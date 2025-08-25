## GitHub CLIのインストール
GitHub CLIをインストールしてAIに利用してもらいます。

![](https://github.com/cli/cli/releases)

インストーラーをダウンロードして実行してください。
`gh_2.78.0_windows_386.msi`

環境変数に設定されたパーソナルアクセストークンが利用されます。

認証ログインしましょう。
`gh auth login`

```
? Where do you use GitHub? GitHub.com
The value of the GH_TOKEN environment variable is being used for authentication.
To have GitHub CLI store credentials instead, first clear the value from the environment.
```

認証のステータスを確認します。2つ出ていますが、GH_TOKENの方のActive accountがtureなら問題ないです。

`gh auth status`

```
github.com
  ✓ Logged in to github.com account MITLabo (GH_TOKEN)
  - Active account: true
  - Git operations protocol: ssh
  - Token: github_pat_11ACHBDWY0y2bCumdWw6Ra_***********************************************************

  ✓ Logged in to github.com account MITLabo (keyring)
  - Active account: false
  - Git operations protocol: ssh
  - Token: github_pat_11ACHBDWY0y2bCumdWw6Ra_***********************************************************
```

リポジトリの一覧なども取得できます。作成したのちにやってみましょう。
`gh repo list`

```
Showing 11 of 11 repositories in @MITLabo

NAME                       DESCRIPTION                  INFO          UPDATED
MITLabo/ai                 Learning materials for AI    private       about 9 months ago
MITLabo/k8s-relation-ap    Relational Application       private       about 4 years ago
MITLabo/dockerlabo                                      public        about 5 years ago
MITLabo/shift              shift                        private       about 6 years ago
MITLabo/InterFaceToolProt                               private       about 7 years ago
MITLabo/PrivateLibrary     個人用ライブラリ             private       about 7 years ago
MITLabo/docker             docker image                 private       about 7 years ago
MITLabo/PythonAnalyze                                   private       about 7 years ago
MITLabo/Redmine            Redmine                      private       about 7 years ago
MITLabo/SDT                SystemDevelopmentTechnology  private       about 9 years ago
MITLabo/InterpreterTest    
```
