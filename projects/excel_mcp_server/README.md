# Excel MCP Server — フォルダ比較ツール（3世代）

2つのフォルダを比較し、差分をExcelレポートで出力するNode.jsツール。  
Claude Code と MCPを使った開発の試行錯誤の過程を3世代で記録しています。

---

## 📈 バージョン間の発展経緯

```
v1_basic           v2_spec              v3_few_shot
（初期実装）  ──→  （仕様書駆動）  ──→  （Few-shot最終版）
シングルJS         MCP仕様書を           サーバー/クライアント
ファイル構成       もとに実装            2段構成・sdiff形式
```

---

## 📦 バージョン比較

| 観点 | [v1_basic](v1_basic/) | [v2_spec](v2_spec/) | [v3_few_shot](v3_few_shot/) |
|------|----------------------|---------------------|----------------------------|
| **GitHub Issue** | — | Issue #6 | Issue #7 |
| **アーキテクチャ** | クライアントのみ | クライアントのみ | サーバー + クライアント 2段構成 |
| **実行環境** | Windows/Mac（Node.js） | Windows/Mac（Node.js） | Linux収集 → Win/Mac変換 |
| **比較形式** | 独自カラム設計 | MCP仕様準拠 | sdiff形式（左右並列） |
| **チェックサム** | なし | あり | MD5（Linux md5sum） |
| **シンボリックリンク** | 部分対応 | 対応 | 完全対応 |
| **GitBash統合** | `.bat`スクリプトあり | — | `setup.sh` / `collect.sh` |
| **オンプレ対応** | △ | △ | ✅（2段構成で対応） |

---

## 🚀 推奨バージョン（v3_few_shot）

最新かつ最も完成度の高い **v3_few_shot** の使用を推奨します。

### セットアップ

```bash
cd v3_few_shot
bash setup.sh
```

### 使い方

```bash
# Step 1: サーバー側（Linux）でフォルダ情報収集
cd v3_few_shot/server
./collect.sh /path/to/folder1 folder1.json
./collect.sh /path/to/folder2 folder2.json

# Step 2: クライアント側（Windows/Mac）で比較Excelを生成
cd v3_few_shot/client
node compare.js folder1.json folder2.json output.xlsx
```

---

## 📖 関連ドキュメント

- [MCP サーバー導入](../../doc/mcpサーバ導入.md)
- [GitHub MCP グローバル設定](../../doc/GitHubのMCPをグローバル設定に追加する方法.md)
- [リポジトリ全体の README に戻る](../../README.md)
