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
├── README.md                # このファイル（プロジェクトドキュメント）
├── prompt.txt              # 作業指示書
├── CLAUDE.md               # Claude Code 用の説明ファイル
├── compare_folders.sh      # フォルダ比較シェルスクリプト
├── generate_report.js      # レポート生成Node.jsスクリプト
├── config.json             # 設定ファイル
├── package.json            # Node.js依存関係定義
├── test_folder1/           # テスト用サンプルデータセット1
│   ├── date_file.txt       # 日付ファイル
│   ├── executable.sh       # 実行可能スクリプト
│   ├── only_in_1.txt      # フォルダ1固有ファイル
│   ├── readonly.txt        # 読み取り専用ファイル
│   ├── regular.txt         # 通常テキストファイル
│   ├── same_file.txt       # 共通ファイル
│   ├── subdir/            # サブディレクトリ
│   │   └── subdir_file.txt # サブディレクトリ内ファイル
│   └── test_file1.txt     # テストファイル1
└── test_folder2/           # テスト用サンプルデータセット2
    ├── date_file.txt       # 日付ファイル
    ├── executable.sh       # 実行可能スクリプト
    ├── only_in_2.txt      # フォルダ2固有ファイル
    ├── readonly.txt        # 読み取り専用ファイル（内容が異なる）
    ├── regular.txt         # 通常テキストファイル
    ├── same_file.txt       # 共通ファイル
    ├── subdir/            # サブディレクトリ
    │   └── subdir_file.txt # サブディレクトリ内ファイル
    └── test_file1.txt     # テストファイル1
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

### 基本的な利用方法

1. **依存関係のインストール**
```bash
npm install
```

2. **フォルダ比較データの生成**（2つの方法）

   **方法1: シェルスクリプト（jq必須）**
   ```bash
   bash compare_folders.sh /path/to/folder1 /path/to/folder2
   # 例: bash compare_folders.sh ./test_folder1 ./test_folder2
   ```
   ※ この方法では、jqコマンドが必要です。インストールされていない場合はエラーになります。

   **方法2: Node.jsスクリプト（推奨・外部依存なし）**
   ```bash
   node generate_comparison_data.js /path/to/folder1 /path/to/folder2
   # 例: node generate_comparison_data.js ./test_folder1 ./test_folder2
   ```
   ※ この方法は追加の外部ソフトウェアを必要としないため、推奨されます。

3. **レポート生成**
```bash
node generate_report.js
# 設定ファイル（config.json）の設定に従ってExcel・PDFを生成
```

### 出力ファイル
- **Excel**: output/comparison_result.xlsx（設定ファイルで変更可能）
- **PDF**: output/comparison_report.pdf（設定ファイルで変更可能）
- **ログ**: logs/comparison_YYYYMMDD_HHMMSS.log

### ステップバイステップ実行例

```bash
# 1. 依存関係のインストール
npm install

# 2. 比較データの生成 (Node.jsを使用)
node generate_comparison_data.js ./test_folder1 ./test_folder2

# 3. レポート生成
node generate_report.js

# 4. 出力の確認
ls -la output/
```

### トラブルシューティング

問題が発生した場合は、以下のデバッグツールを使用できます：

```bash
# 比較データの構造を確認
node debug_report.js

# generate_report.jsのエラー調査
node debug_specific.js
```

### シンプル比較スクリプト

高速な比較結果のみが必要な場合は、シンプルな比較スクリプトも利用可能です：

```bash
bash simple_compare.sh ./test_folder1 ./test_folder2
```

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

本プロジェクトには、以下の主要ファイルが含まれています：

### 主要スクリプト
- **generate_report.js** - Excel/PDF レポートの生成を担当する Node.js スクリプト
- **compare_folders.sh** - フォルダ比較を行うシェルスクリプト（jq に依存）
- **generate_comparison_data.js** - jq を必要としない代替 Node.js 比較スクリプト
- **simple_compare.sh** - 高速で単純な比較を行うシェルスクリプト

### サポートファイル
- **debug_report.js** - 比較データの構造を検証するデバッグスクリプト
- **debug_specific.js** - レポート生成のエラーを特定するデバッグスクリプト
- **config.json** - 比較とレポートの設定ファイル

### 依存関係

| ファイル名 | 必要なソフトウェア | 備考 |
|------------|-------------------|------|
| generate_report.js | Node.js, 基本的な Unix コマンド (ls, etc.) | Excel/PDF 生成用 |
| compare_folders.sh | jq, bash, find, diff, md5sum, etc. | 詳細比較用、jq が必須 |
| generate_comparison_data.js | Node.js のみ | 外部コマンド依存なし |
| simple_compare.sh | bash, find, comm | 基本的な比較用 |

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