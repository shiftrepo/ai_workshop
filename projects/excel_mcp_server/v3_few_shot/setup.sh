#!/bin/bash

# ディレクトリ比較ツール - セットアップスクリプト
# このスクリプトは、オンプレミス環境にツールを展開した後に実行します

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "ディレクトリ比較ツール セットアップ"
echo "=========================================="
echo ""

# 環境チェック
echo "[1/4] 環境チェック中..."

# Node.js のチェック
if ! command -v node &> /dev/null; then
    echo "エラー: Node.js がインストールされていません。"
    echo "Node.js をインストールしてから再実行してください。"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "  ✓ Node.js: $NODE_VERSION"

# npm のチェック
if ! command -v npm &> /dev/null; then
    echo "エラー: npm がインストールされていません。"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "  ✓ npm: $NPM_VERSION"

# Linux標準コマンドのチェック（サーバ側で使用）
echo ""
echo "[2/4] Linux標準コマンドの確認..."
MISSING_COMMANDS=()

for cmd in ls md5sum; do
    if command -v $cmd &> /dev/null; then
        echo "  ✓ $cmd"
    else
        echo "  ✗ $cmd (見つかりません)"
        MISSING_COMMANDS+=("$cmd")
    fi
done

if [ ${#MISSING_COMMANDS[@]} -gt 0 ]; then
    echo ""
    echo "警告: 以下のコマンドが見つかりません:"
    for cmd in "${MISSING_COMMANDS[@]}"; do
        echo "  - $cmd"
    done
    echo "サーバ側スクリプトが正常に動作しない可能性があります。"
fi

# クライアント側の依存関係インストール
echo ""
echo "[3/4] クライアント側の依存関係をインストール中..."
cd "$SCRIPT_DIR/client"

if [ -f "package.json" ]; then
    npm install
    echo "  ✓ 依存関係のインストール完了"
else
    echo "エラー: package.json が見つかりません。"
    exit 1
fi

# サーバ側スクリプトに実行権限を付与
echo ""
echo "[4/4] サーバ側スクリプトに実行権限を付与中..."
cd "$SCRIPT_DIR/server"

if [ -f "collect.sh" ]; then
    chmod +x collect.sh
    echo "  ✓ collect.sh に実行権限を付与"
else
    echo "エラー: collect.sh が見つかりません。"
    exit 1
fi

# セットアップ完了
echo ""
echo "=========================================="
echo "セットアップ完了！"
echo "=========================================="
echo ""
echo "使用方法:"
echo ""
echo "【サーバ側（Linux）】"
echo "  1. server/collect.sh を比較対象のサーバにコピー"
echo "  2. 各ディレクトリの情報を収集:"
echo "     ./collect.sh /path/to/folder1 folder1.json"
echo "     ./collect.sh /path/to/folder2 folder2.json"
echo "  3. 生成されたJSONファイルをクライアントに転送"
echo ""
echo "【クライアント側（Windows/Mac）】"
echo "  1. 転送されたJSONファイルを client/ ディレクトリに配置"
echo "  2. 比較実行:"
echo "     cd client"
echo "     node compare.js folder1.json folder2.json output.xlsx"
echo "  3. 生成された output.xlsx を開いて結果を確認"
echo ""
echo "詳細は README.md を参照してください。"
echo ""
