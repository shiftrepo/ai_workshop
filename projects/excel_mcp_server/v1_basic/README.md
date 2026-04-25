# フォルダ比較ツール (Folder Comparison Tool)

このプロジェクトは、2つのフォルダを比較し、その差分を詳細に分析するためのNode.js製ツールです。
ExcelJS ライブラリを活用して、視覚的にわかりやすい差分レポートをExcel形式で生成します。
GitBash環境と統合することで、Linux形式の正確なファイル権限（rwx形式）やオーナー情報を取得できます。

## 主な機能

### 比較項目
以下の項目について2つのフォルダを詳細に比較します:
- **ファイルの存在有無** - 各フォルダにのみ存在するファイルを検出
- **ファイルサイズ** - バイト単位での正確なサイズ比較
- **更新日時** - ミリ秒精度での時刻比較、時間差を分かりやすく表示
- **ファイルの権限** - rwx形式（例：`-rw-r--r--`、`drwxr-xr-x`）での表示
- **オーナーとグループ** - ユーザー名とグループ名を文字列で表示
- **ファイルの内容** - SHA-256チェックサムによる完全性検証
- **シンボリックリンク** - リンク先パスの比較

### 特徴的な機能
- **GitBash統合** - `ls -l`コマンドを使用した正確なLinux形式の情報取得
- **視覚的な差分表示** - Excelレポートでの色分け表示（緑：一致、オレンジ：相違、赤：片方のみ）
- **日本語対応** - ステータス表示を日本語化（「はい」「いいえ」「適用外」など）
- **フィルタリング機能** - Excelの自動フィルタによる効率的な分析

## 必要条件

- **Node.js** (バージョン12以上推奨)
- **npm** (Node.jsに同梱)
- **Git Bash** (Windows環境でLinux形式の権限情報を取得する場合に推奨)
  - Git for Windowsに含まれています
  - 権限やオーナー情報の正確な取得に使用

## インストール方法

```bash
# 依存パッケージをインストール
npm install
```

## 使用方法

### 基本的なフォルダ比較

コンソールに結果を表示するシンプルな比較です。素早く差分を確認したい場合に便利です:

```bash
node compare_folders.js <フォルダ1のパス> <フォルダ2のパス>
```

**実行例:**
```bash
node compare_folders.js folder1 folder2
```

**出力例:**
```
=== COMPARISON RESULTS ===
IDENTICAL readme.txt
DIFFERENT config.json
  Content differs (different checksums)
  Modification time: Dir1=2024-09-01T10:00:00.000Z | Dir2=2024-09-02T10:00:00.000Z
ONLY IN DIR1 old_file.txt
ONLY IN DIR2 new_file.txt
```

### Excel レポートを生成する詳細比較

詳細なExcelレポートを生成します。大規模なフォルダ比較や、差分の詳細な分析が必要な場合に最適です:

```bash
node mcp_folder_compare.js <フォルダ1のパス> <フォルダ2のパス> <出力Excelファイルパス>
```

**実行例:**
```bash
node mcp_folder_compare.js folder1 folder2 comparison_report.xlsx
```

**コンソール出力例:**
```
Comparing directories:
  1: folder1
  2: folder2

Scanning directories...
Comparing structures...

=== COMPARISON SUMMARY ===
Identical: 10
Different: 5
Only in Dir1: 2
Only in Dir2: 3
Total items: 20

Generating Excel report...
Report saved to: comparison_report.xlsx

Comparison completed successfully.
```

### GitBash 環境での実行（推奨）

GitBash環境での実行により、Linux形式の正確な権限情報やオーナー情報を取得できます:

```bash
# 実行権限を付与（初回のみ）
chmod +x compare_folders.sh

# スクリプトを実行
./compare_folders.sh <フォルダ1のパス> <フォルダ2のパス>
```

**実行例:**
```bash
./compare_folders.sh /c/Project/v1 /c/Project/v2
```

**特徴:**
- タイムスタンプ付きのファイル名で自動保存（例：`comparison_report_20250928_183000.xlsx`）
- Linux形式の権限表示（rwx形式）を正確に取得
- ユーザー名とグループ名を文字列で表示

## 出力例

### コンソール出力
```
=== COMPARISON RESULTS ===
IDENTICAL file with spaces.txt
DIFFERENT config.json
  Content differs (different checksums)
ONLY IN DIR1 only_in_folder1.txt
ONLY IN DIR2 only_in_folder2.txt

=== SUMMARY ===
Identical: 5
Different: 26
Only in Dir1: 4
Only in Dir2: 5
Total items: 40
```

### Excelレポート

Excelレポートには以下のワークシートが含まれます:
1. **Summary** - 比較結果の概要と統計情報（色分け表示）
2. **All Items** - すべてのファイルとその比較結果（フィルタリング機能付き、セルの背景色で状態を視覚化）
3. **Differences** - 相違点の詳細な分析（フィルタリング機能付き、差分の種類ごとに色分け表示）
4. **Only in Dir1** - フォルダ1にのみ存在するファイル（フィルタリング機能付き）
5. **Only in Dir2** - フォルダ2にのみ存在するファイル（フィルタリング機能付き）

#### フィルタリング機能

各ワークシートにはフィルタリング機能が実装されており、以下のような操作が可能です:

- **All Items**シート：「Status」列でフィルタリングし、「一致」「相違あり」「Dir1のみ」「Dir2のみ」の状態ごとに表示/非表示を切り替えられます
- **Differences**シート：ファイルパスやバラバラに表示される差分の種類（サイズ、更新日時、内容など）ごとにフィルタリング可能
- **Only in Dir1/Dir2**シート：パスやファイルタイプでフィルタリング可能

#### 視覚的な改善

レポートの視認性を向上させるため、以下の視覚的な改善が行われています:

- **セルの背景色**: 各行の状態に応じて異なる背景色が適用されます
  - 一致：緑色の背景（#E2EFDA）
  - 相違あり：オレンジ色の背景（#FCE4D6）
  - Dir1/Dir2のみ：赤色の背景（#F8CBAD）

- **差分の強調表示**: 「相違あり」のファイルでは、差分の種類ごとに特定のセルが異なる色で強調表示されます
  - サイズの違い：黄色（#FFEB9C）
  - 更新日時の違い：青色（#DDEBF7）
  - 内容の違い：紫色（#E1D9F0）
  - チェックサムの違い：紫色（#E1D9F0）
  - 権限の違い：薄緑色（#D8E4BC）
  - オーナー・グループの違い：青緑色（#C2D1CC）

#### 時間差分の詳細表示

ファイルの更新日時に違いがある場合、より詳細な情報が表示されます：

- ミリ秒までの正確な時間が表示されます
- 時間差が秒単位・分単位・時間単位・日単位で表示されます
- どちらのファイルが新しいかが表示されます
- 時間差分はDifferencesシートの「Difference」列に詳細が表示されます

#### チェックサム確認機能

ファイルの内容が同一かどうかを確認できるチェックサム表示列が追加されています：

- 「Checksum (Dir1)」と「Checksum (Dir2)」列でSHA-256チェックサムを確認可能
- 内容が異なるファイルはチェックサムが異なり、セルが紫色でハイライトされます

#### Content Matchの明確な表示

ファイル内容の一致/不一致を日本語で明確に表示します：

- **「はい」**：ファイルの内容が完全に一致している場合（同一チェックサム）
- **「いいえ」**：ファイルの内容が異なる場合（異なるチェックサム）
- **「適用外」**：ディレクトリやシンボリックリンクなど、内容の直接比較が適切でない場合

#### 権限表示形式（rwx形式）

権限は以下のような形式で表示されます：

- **ファイルの例**: `-rw-r--r--` （所有者：読み書き、グループ：読み、その他：読み）
- **ディレクトリの例**: `drwxr-xr-x` （所有者：全権限、グループ：読み実行、その他：読み実行）
- **実行可能ファイル**: `-rwxr-xr-x` （実行権限付き）
- **読み取り専用**: `-r--r--r--` （全員読み取りのみ）

各位置の意味：
- 1文字目: ファイルタイプ（`-`=ファイル、`d`=ディレクトリ、`l`=シンボリックリンク）
- 2-4文字目: 所有者の権限（`rwx`）
- 5-7文字目: グループの権限（`rwx`）
- 8-10文字目: その他の権限（`rwx`）

## テスト用サンプルフォルダの作成

テスト用のサンプルフォルダを作成する場合の例:

```bash
# テストフォルダを作成
mkdir -p test_folder1 test_folder2

# 同一内容のファイルを作成
echo "Same content" > test_folder1/same.txt
echo "Same content" > test_folder2/same.txt

# 異なる内容のファイルを作成
echo "Content 1" > test_folder1/diff.txt
echo "Content 2" > test_folder2/diff.txt

# 異なる権限のファイルを作成
touch test_folder1/readonly.txt test_folder2/readonly.txt
chmod 444 test_folder1/readonly.txt
chmod 644 test_folder2/readonly.txt

# ディレクトリを作成（異なる権限）
mkdir test_folder1/subdir test_folder2/subdir
chmod 755 test_folder1/subdir
chmod 775 test_folder2/subdir

# 片方のみに存在するファイル
echo "Only in folder 1" > test_folder1/only1.txt
echo "Only in folder 2" > test_folder2/only2.txt
```

### 検証可能な差分パターン
- **内容の違い** - 同名ファイルで内容が異なる
- **権限の違い** - rwx形式で表示される権限の違い（例：`-rw-r--r--` vs `-rw-rw-r--`）
- **ディレクトリ権限** - ディレクトリの権限表示（例：`drwxr-xr-x` vs `drwxrwxr-x`）
- **更新日時の違い** - ミリ秒単位での時刻比較
- **存在有無** - 片方のフォルダにのみ存在するファイル
- **オーナー/グループ** - 異なるオーナーやグループの検出

## 技術的な詳細

### ファイル権限の取得方法

本ツールは、GitBashの`ls -l`コマンドを使用してLinux形式の正確な権限情報を取得します：

1. **ファイルの場合**: `ls -l "ファイルパス"`を実行
2. **ディレクトリの場合**: `ls -ld "ディレクトリパス"`を実行（-dオプションで内容ではなくディレクトリ自体の情報を取得）

出力形式の例:
```
-rw-r--r-- 1 username groupname 1234 Sep 28 12:34 file.txt
drwxr-xr-x 1 username groupname    0 Sep 28 12:34 directory
```

### フォルバック機能

GitBashが利用できない環境では、Node.jsの標準機能を使用して権限情報を取得します：
- 8進数形式からrwx形式への変換
- UIDとGIDの数値表示（文字列変換ができない場合）

## 注意点

- **シンボリックリンク**: Windows環境では管理者権限が必要な場合があります
- **権限情報**: Windows環境では一部の権限情報が正確に取得できない場合があります
- **GitBash推奨**: 最も正確な情報を取得するには、GitBash環境での実行を推奨します
- **大規模フォルダ**: 大量のファイルを含むフォルダの比較には時間がかかる場合があります