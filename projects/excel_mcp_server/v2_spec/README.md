# Excel MCP Server仕様書プロジェクト

## プロジェクト概要

本プロジェクトは、Excel MCP（Model Context Protocol）サーバーの仕様書を作成することを目的としています。
MCPは、AIアシスタントが外部データソースやツールと安全に連携するための標準化されたプロトコルです。

## プロジェクト背景

- **親プロジェクト**: ai_workshop（AI利用促進ワークショップ）
- **関連Issue**: #6（Excel MCP Server仕様書作成）
- **作業ディレクトリ**: `excelMCPserverSPEC`

## ディレクトリ構造

```
excelMCPserverSPEC/
├── README.md                 # このファイル（プロジェクトドキュメント）
├── prompt.txt                # 作業指示書
├── CLAUDE.md                 # Claude Code 用の説明ファイル
├── config.json               # 設定ファイル
├── generate_comparison_data.js # フォルダ比較データ生成Node.jsスクリプト
├── generate_report.js        # レポート生成Node.jsスクリプト
├── package.json              # Node.js依存関係定義
├── package-lock.json         # Node.js依存関係の正確なバージョン定義
├── utils/                    # ユーティリティスクリプトディレクトリ
│   ├── run_folder_comparison.js # 統合実行スクリプト
│   ├── simple_compare.sh        # シンプル比較用シェルスクリプト
│   └── debug/                # デバッグ用スクリプトディレクトリ
│       ├── debug_report.js   # 比較データ構造検証用デバッグスクリプト
│       └── debug_specific.js # レポート生成エラー調査用デバッグスクリプト
├── logs/                     # ログ出力ディレクトリ
├── output/                   # 出力ファイル格納ディレクトリ
│   ├── comparison_data.json  # 比較結果のJSONデータ
│   ├── comparison_result.xlsx # 生成されるExcelレポート
│   └── comparison_report.pdf # 生成されるPDFレポート
├── test_folder1/             # テスト用サンプルデータセット1
│   ├── binary_data.bin       # バイナリデータファイル
│   ├── date_file.txt         # 日付ファイル
│   ├── executable.sh         # 実行可能スクリプト
│   ├── matched_pattern_1.txt # パターンマッチング用ファイル1
│   ├── matched_pattern_2.txt # パターンマッチング用ファイル2
│   ├── matched_pattern_3.txt # パターンマッチング用ファイル3
│   ├── only_in_1.txt         # フォルダ1固有ファイル
│   ├── readonly.txt          # 読み取り専用ファイル
│   ├── regular.txt           # 通常テキストファイル
│   ├── same_file.txt         # 共通ファイル
│   ├── symlink.txt           # シンボリックリンクファイル
│   ├── unique_to_folder1.txt # フォルダ1固有ファイル2
│   ├── nested/               # 多階層ディレクトリ
│   │   └── deep/
│   │       └── structure/
│   │           └── deep_file.txt # 深い階層のファイル
│   ├── subdir/               # サブディレクトリ
│   │   ├── file.txt          # サブディレクトリ内ファイル
│   │   └── subdir_file.txt   # サブディレクトリ内ファイル2
│   └── test_file1.txt        # テストファイル1
└── test_folder2/             # テスト用サンプルデータセット2
    ├── binary_data.bin       # バイナリデータファイル
    ├── date_file.txt         # 日付ファイル
    ├── executable.sh         # 実行可能スクリプト
    ├── matched_pattern_1.txt # パターンマッチング用ファイル1
    ├── matched_pattern_2.txt # パターンマッチング用ファイル2
    ├── matched_pattern_3.txt # パターンマッチング用ファイル3
    ├── only_in_2.txt         # フォルダ2固有ファイル
    ├── readonly.txt          # 読み取り専用ファイル（内容が異なる）
    ├── regular.txt           # 通常テキストファイル
    ├── same_file.txt         # 共通ファイル
    ├── unique_to_folder2.txt # フォルダ2固有ファイル2
    ├── nested/               # 多階層ディレクトリ
    │   └── deep/
    │       └── structure/
    │           └── deep_file.txt # 深い階層のファイル（内容が異なる）
    ├── subdir/               # サブディレクトリ
    │   ├── file.txt          # サブディレクトリ内ファイル
    │   └── subdir_file.txt   # サブディレクトリ内ファイル2（内容が異なる）
    └── test_file1.txt        # テストファイル1（内容が異なる）
```

## システム構成

### アーキテクチャ
- **サーバサイド**: シェルスクリプトによる情報収集・分析（手動実行）
- **クライアントサイド**: Node.jsによるExcel・PDFファイル生成・操作（手動実行）

### 実行方式
- **比較対象**: 引数でフォルダパスを指定
- **設定管理**: config.json による設定ファイル
- **ログ出力**: 実行カレントディレクトリに自動出力
- **除外機能**: 設定ファイルによるファイル・パターン除外

## 実行方法

### 詳細な使用手順

#### 0. 前提条件
- Node.js がインストールされていること
- Windows環境の場合はGit Bashなどの Unix コマンドが使用できる環境が必要

#### 1. **プロジェクトのセットアップ**
```bash
# プロジェクトディレクトリに移動
cd excelMCPserverSPEC

# 依存関係のインストール (初回のみ)
npm install
```

インストールされるパッケージ:
- exceljs: Excel ファイル生成
- pdfkit-table: PDF ファイル生成
- その他の依存パッケージ

#### 2. **フォルダ比較データの生成**

推奨方法（Node.jsのみで実行）:
```bash
# 構文
node generate_comparison_data.js <フォルダ1のパス> <フォルダ2のパス>

# サンプルデータでの実行例
node generate_comparison_data.js ./test_folder1 ./test_folder2
```

実行結果:
- `output/comparison_data.json` ファイルが生成されます
- このJSONファイルには比較結果の詳細情報が格納されています

#### 3. **レポート生成（Excel・PDF）**

```bash
# レポート生成の実行
node generate_report.js
```

このコマンドは以下を実行します:
1. `output/comparison_data.json` を読み込み
2. 比較結果を分析し整形
3. `output/comparison_result.xlsx` ファイルを生成（複数シート含む詳細レポート）
4. `output/comparison_report.pdf` ファイルを生成（概要レポート）

#### 4. **出力の確認**

```bash
# 出力ファイルの確認
ls -la output/

# Excel ファイルの内容確認（可能であれば）
# Windows: start output/comparison_result.xlsx
# Mac: open output/comparison_result.xlsx
```

### 出力ファイルの詳細

#### Excel レポート (comparison_result.xlsx)
このExcelファイルには複数のシートが含まれています:

1. **統合比較表示** - メインの比較シート
   - フォルダ1とフォルダ2の全ファイル比較を表形式で表示
   - パーミッション、オーナー、サイズ、更新日時を並べて表示
   - 差異がある項目はハイライト表示

2. **フォルダ1のみ** - フォルダ1にのみ存在するファイルのリスト

3. **フォルダ2のみ** - フォルダ2にのみ存在するファイルのリスト

4. **内容差異** - 内容が異なるファイルの詳細

5. **ディレクトリ比較** - フォルダ構造の比較結果

#### PDF レポート (comparison_report.pdf)
- 比較の概要情報
- 統計データとチャート（設定されている場合）

#### ログファイル (logs/comparison_YYYYMMDD_HHMMSS.log)
- 実行時の詳細ログ
- エラーや警告メッセージ
- 処理時間情報

### 実行例（完全版）

以下は、テストフォルダを使った完全な実行例です:

```bash
# 1. プロジェクトディレクトリに移動
cd excelMCPserverSPEC

# 2. 依存関係のインストール (初回のみ)
npm install

# 3. 比較データの生成 (推奨方法)
node generate_comparison_data.js ./test_folder1 ./test_folder2

# 4. レポート生成の実行
node generate_report.js

# 5. 生成されたファイルの確認
ls -la output/
```

### トラブルシューティング

問題が発生した場合は、以下のデバッグツールを使用できます：

```bash
# 比較データの構造を確認
node utils/debug/debug_report.js

# generate_report.jsのエラー調査
node utils/debug/debug_specific.js
```

### シンプル比較スクリプト

高速な比較結果のみが必要な場合は、シンプルな比較スクリプトも利用可能です：

```bash
bash utils/simple_compare.sh ./test_folder1 ./test_folder2
```

### 統合実行スクリプト

フォルダ比較からレポート生成までを一度に実行するための便利なスクリプトを用意しています：

```bash
# 基本的な使用方法
node utils/run_folder_comparison.js <フォルダ1のパス> <フォルダ2のパス>

# 例: テストフォルダでの実行
node utils/run_folder_comparison.js ./test_folder1 ./test_folder2
```

このスクリプトは以下の処理を自動的に行います：
1. フォルダ比較データの生成（generate_comparison_data.js）
2. Excel・PDFレポートの生成（generate_report.js）
3. 出力ファイルのパスを表示

どのディレクトリからでも実行できるよう、相対パス解決機能を備えています。

## 比較項目

1. **ファイル存在比較**: 各フォルダに存在するファイル一覧を比較
2. **ファイル内容比較**: 同名ファイルの内容差分を検出
3. **ファイル属性比較**: ファイルの権限、サイズ、更新日時を比較
4. **ディレクトリ構造比較**: サブディレクトリとその中のファイル構造を比較
5. **ファイル種別比較**: ファイルの種類（テキスト、バイナリ、実行可能等）を比較
6. **アクセス権限比較**: ファイル・ディレクトリのアクセス権限を比較

## 設定ファイル（config.json）

```json
{
  "exclude_patterns": [
    "*.tmp",
    "*.log",
    ".git/*",
    "node_modules/*"
  ],
  "exclude_directories": [
    ".git",
    "node_modules",
    "temp"
  ],
  "comparison_options": {
    "check_file_existence": true,
    "check_file_content": true,
    "check_file_attributes": true,
    "check_directory_structure": true,
    "check_file_types": true,
    "check_permissions": true
  },
  "output_options": {
    "generate_excel": true,
    "generate_pdf": true,
    "excel_filename": "comparison_result.xlsx",
    "pdf_filename": "comparison_report.pdf"
  },
  "log_options": {
    "log_level": "info",
    "log_directory": "./logs"
  }
}
```

## ファイル構成の詳細

本プロジェクトには、以下のファイルが含まれており、それぞれ固有の役割を持っています：

### 主要スクリプト

- **generate_comparison_data.js** - フォルダ間の比較を行い、詳細な差分情報をJSONファイルとして出力するNode.jsスクリプト。外部依存ソフトウェアなしで動作する推奨の比較ツール。
- **generate_report.js** - 比較データ（JSON）を読み込み、Excelワークブックとして整形されたレポートを生成するNode.jsスクリプト。また、概要情報をPDFとしても出力。
- **utils/run_folder_comparison.js** - 比較からレポート生成までを一括で実行するユーティリティスクリプト。異なるディレクトリからの実行をサポート。
- **simple_compare.sh** - 高速で簡易的なフォルダ比較を行うシェルスクリプト。差分の概要だけを確認したい場合に使用。

### デバッグ・サポートツール

- **utils/debug/debug_report.js** - 比較データのJSON構造を検証し、問題点を特定するためのデバッグツール。JSONの構造やプロパティの存在確認に使用。
- **utils/debug/debug_specific.js** - generate_report.jsの実行中に発生する可能性のあるエラーの原因調査用スクリプト。レポート生成のトラブルシューティングに使用。

### 設定・環境ファイル

- **config.json** - プログラムの動作設定を定義するJSON設定ファイル。比較オプション、出力オプション、除外パターンなどを制御。
- **package.json** - Node.jsプロジェクトの依存関係と基本情報を定義するファイル。
- **package-lock.json** - Node.js依存関係の正確なバージョンを固定するロックファイル。

### ドキュメント

- **README.md** - プロジェクトの概要、使用方法、構成などを説明するマークダウン形式のドキュメント（このファイル）。
- **CLAUDE.md** - Claude Code AIアシスタントに対する指示やプロジェクト情報を提供するファイル。
- **prompt.txt** - プロジェクトの作業指示書。

### ディレクトリ

- **logs/** - プログラム実行時のログファイルが出力されるディレクトリ。
- **output/** - 生成されたJSONデータ、Excel、PDFファイルが格納されるディレクトリ。
- **test_folder1/**, **test_folder2/** - テスト用のサンプルデータセット。様々なファイルタイプや属性を含む比較対象フォルダ。

### 依存関係

| ファイル名 | 必要なソフトウェア | 説明 |
|------------|-------------------|------|
| generate_comparison_data.js | Node.js | フォルダの詳細比較を行い、比較データをJSONとして出力。**推奨ツール** |
| generate_report.js | Node.js, 基本的な Unix コマンド (ls) | JSONデータを読み込み、Excel/PDFレポートを生成。パーミッションと所有者情報の取得にlsコマンドを使用。 |
| utils/debug/debug_report.js | Node.js | JSONデータの構造を検証・分析し、問題点を診断。 |
| utils/debug/debug_specific.js | Node.js | レポート生成時のエラーを調査するためのセクション単位のシミュレーション。 |
| utils/simple_compare.sh | bash, find, comm | 基本的な差分確認のみを行うシンプルなスクリプト。高速な概要確認用。 |

## 開発履歴

### 権限とオーナー情報の表示修正

#### 問題点
初期実装では以下の問題がありました：
1. パーミッションが数字形式（644など）で表示されていた
2. Unix形式の文字列表示（-rw-r--r--、drwxr-xr-xなど）が必要
3. オーナー情報がファイルで表示されず、ディレクトリのみ表示されていた
4. 'N/A'値が出力に含まれていた

#### 解決策
1. **パーミッション表示の修正**
   - `getPermissionString()`関数を実装し、`ls -la`コマンドの出力から直接パーミッション文字列を取得
   - 数値変換処理を完全に削除
   - Unix形式の文字列（-rw-r--r--、drwxr-xr-xなど）をそのまま表示

2. **オーナー情報の取得改善**
   - Windowsパス区切り文字（バックスラッシュ）を考慮した柔軟なパターンマッチング
   - 完全一致から`line.includes(filename)`による部分一致に変更
   - `ls -la`コマンド出力の3番目のフィールド（parts[2]）からオーナー名を抽出

3. **N/A値の削除**
   - すべての'N/A'デフォルト値を空文字列（''）に変更
   - `formatDateWithMs()`関数も空文字列を返すように修正
   - `calculateChecksum()`関数も空文字列を返すように修正

#### 実装箇所
以下のすべてのセクションで修正を実施：
- 両フォルダに存在するファイルの比較処理
- フォルダ1のみに存在するファイルの処理
- フォルダ2のみに存在するファイルの処理
- 両フォルダに存在するディレクトリの比較処理
- フォルダ1のみに存在するディレクトリの処理
- フォルダ2のみに存在するディレクトリの処理

#### 修正後の動作確認
```bash
node generate_report.js
```

Excel出力での確認結果：
- パーミッション列（C列、J列）：Unix形式文字列表示（-rw-r--r--、drwxr-xr-xなど）
- オーナー列（D列、K列）：正しくオーナー名（kappappaなど）が表示
- N/A値：完全に削除され、空文字列または適切な値のみ表示

#### 主要な技術的決定事項
1. **lsコマンド出力の直接利用**: JSONデータからの変換を避け、lsコマンド出力を直接使用
2. **柔軟なパターンマッチング**: Windows/Unix環境の違いに対応するため、部分一致を使用
3. **一貫性のある空文字列処理**: すべてのデフォルト値を空文字列に統一
4. **エラーハンドリング**: ファイルアクセスエラー時も空文字列を返し、処理を継続