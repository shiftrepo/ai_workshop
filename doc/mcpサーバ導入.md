## Claude AI向けMCP導入手順書

### はじめに：AIとMCPの全体像

この手順書は、AIアシスタントの**Claude**が、ローカルのパソコンにインストールされたツール（ExcelやWebブラウザなど）を操作できるようにするための**MCP (Model Context Protocol)** の導入方法を説明します。

**MCP**とは、ClaudeのようなAIが、PC上の特定のプログラムと通信するためのルールブックです。これにより、AIは単なるチャットボイスアシスタントではなく、ユーザーの代わりに具体的なタスク（例：Excelファイルの編集、Web検索）を実行する**AIエージェント**として機能できるようになります。

ここで重要なのは、今回使用する`uvx`, `npm`, `npx`は、**PythonのMCP機能とは異なる**点です。

  * **PythonのMCP機能**: Pythonで開発されたAIツール用の拡張機能です。
  * **`npm`や`npx`**: **Node.js**という別のプログラミング言語環境で使われる、パッケージを管理・実行するためのツールです。

今回は、Python環境に加えて、Node.jsのツールも利用して、ClaudeにWebブラウザやExcelの操作機能を追加します。

<br>

-----

### 1\. プロジェクト環境の準備

#### コマンド解説：`mkdir` と `cd`

  * `mkdir`：**m**a**k**e **dir**ectory の略で、新しいフォルダ（ディレクトリ）を作成するコマンドです。
  * `cd`：**c**hange **d**irectory の略で、指定したフォルダに移動するコマンドです。

以下のコマンドを**PowerShell**で実行します。

```powershell
mkdir MCPs
cd .\MCPs\
```

  * `mkdir MCPs`：`C:\ClaudeCode` フォルダ内に `MCPs` という新しいフォルダを作成します。
  * `cd .\MCPs\`：作成した `MCPs` フォルダに移動します。以降の作業はこのフォルダ内で行います。

ちょっとイレギュラーですが、pythonをインストールします。powershellにてpythonとタイプして実行してください。インストールされている場合は、pythonが動きますが、インストールされていない場合は、MSのStoreが起動して、Pythonをインストールする画面が立ち上がります。指示に従ってインストールしてください。何か選択肢が出てもデフォルトでいいです。

```powershell
python
```

<br>

-----

### 2\. Python環境の構築と必要なパッケージのインストール

#### コマンド解説：`python -m venv` と `pip install`

  * `python -m venv venv`：`venv` は**v**irtual **env**ironment（仮想環境）の略です。このコマンドは、プロジェクト専用の隔離されたPython環境を作成します。これにより、他のプロジェクトに影響を与えずに、必要なパッケージだけを管理できます。
  * `pip install <パッケージ名>`：`pip` はPythonのパッケージをインストールするためのツールです。

以下のコマンドを**Git Bash**で実行します。

```bash
# 作成した仮想環境を有効化する
.\venv\Scripts\activate

# 必要なパッケージをインストールする
pip install pandas fastapi mcp uv
```

  * `.\venv\Scripts\activate`：作成した仮想環境を有効化します。コマンドラインの表示が `(venv)` から始まるようになります。
  * `pip install ...`：`pandas` (データ操作)、`fastapi` (API構築)、`mcp` (Model Context Protocol関連)、`uv` (高速なパッケージ管理) をインストールします。

<br>

-----

### 3\. MCPサーバーのセットアップとClaudeへの登録

#### コマンド解説：`npm install` と `claude mcp add-json`

  * `npm install -g`：`npm` はNode.jsのパッケージマネージャーです。`-g` は**g**lobal（グローバル）の略で、PC全体で使えるようにインストールします。`excel-mcp-server` は、AIがExcelを操作できるようにするツールです。
  * `claude mcp add-json <名前> <設定>`：Claudeの**mcp**（ツール連携機能）に、新しいツールを追加するためのコマンドです。`add-json` はJSON形式でツールの情報を追加することを意味します。

以下のコマンドを実行します。

```bash
# Excel操作ツールをグローバルにインストール
npm install -g excel-mcp-server

# ClaudeにExcel操作機能を登録する
claude mcp add-json excel-server '{"name":"excel-server","command":"uvx","args":["excel-mcp-server","stdio"]}'

# 登録されたMCPリストを確認する
claude mcp list
```

  * `claude mcp add-json ...`：`excel-server` という名前で、`uvx` コマンドで実行される `excel-mcp-server` をClaudeに認識させます。`stdio` は通信方式を指定しています。
  * `claude mcp list`：`excel-server` がリストに表示されれば成功です。

<br>

-----

### 4\. Webブラウザ操作ツールのセットアップ

#### コマンド解説：`npx playwright install`

  * `npx`：`npm` の実行ツールです。グローバルにインストールしなくても、パッケージを一時的に実行できます。
  * `playwright`：Microsoftが開発した、Webブラウザを自動操作するためのツールです。
  * `install chrome`：Playwrightで使用するWebブラウザとして、**Chrome**をインストールします。

以下のコマンドを実行します。

```bash
# ClaudeにPlaywright（Webブラウザ操作ツール）を登録する
claude mcp add-json playwright '{"name":"playwright","command":"npx","args":["@playwright/mcp@latest"]}'

# Webブラウザ（Chrome）をインストールする
npx playwright install chrome

# 登録されたMCPリストを確認する
claude mcp list
```

  * `claude mcp list`：`excel-server` と `playwright` がリストに表示されれば、すべてのツールの登録が完了です。

<br>

-----

### 5\. Claudeによるタスク実行

最後に、すべてのツールを統合して、Claudeに具体的なタスクを実行させます。

#### コマンド解説：`source` と `--dangerously-skip-permissions`

  * `source`：Git Bashでスクリプトファイルを実行するためのコマンドです。
  * `--dangerously-skip-permissions`：このオプションは、セキュリティ確認をスキップして、AIがローカルPC上のファイルやプログラムにアクセスすることを許可します。**注意して使用してください。**
  * `-p "<プロンプト>"`：AIに実行させたい指示（プロンプト）を指定します。

以下のコマンドを実行します。

```bash
source MCPs/venv/Scripts/activate && claude --dangerously-skip-permissions -p "Chromeブラウザを操作して、2025/9/21週の東京の天気をリサーチしたあとにExcelファイルに結果をまとめて。Excelシートにまとめてください。気温の変化などを簡単なグラフにまとめてください。天気の様子はアイコンなどで装飾して見やすくしてください。"
```

  * `source ... && claude ...`：仮想環境を有効化し、続けてClaudeにプロンプトを実行させます。
  * Claudeが自動的にWebブラウザ（Chrome）を操作して天気情報を調べ、その結果をExcelファイルにまとめ、グラフを作成します。

<br>

-----

### 6\. 作成されたファイルの確認

タスクが完了すると、`C:\ClaudeCode\MCPs` フォルダ内に新しいExcelファイルが作成されます。

#### Officeがインストールされていない場合

お使いのPCにMicrosoft Officeがインストールされていない場合は、以下の手順でGoogleスプレッドシートを使用してファイルを確認できます。

1.  Googleドライブにアクセスします。
2.  「**新規**」ボタンをクリックし、「**ファイルのアップロード**」を選択します。
3.  `C:\ClaudeCode\MCPs` フォルダから、作成されたExcelファイル（例：`.xlsx` ファイル）を選択してアップロードします。
4.  アップロードされたファイルをダブルクリックすると、Googleスプレッドシートで内容を確認できます。