#!/bin/bash

# ディレクトリ比較ツール - サーバ側情報収集スクリプト
# 使用方法: ./collect.sh <対象ディレクトリ> <出力JSONファイル>

set -euo pipefail

# 引数チェック
if [ $# -ne 2 ]; then
    echo "使用方法: $0 <対象ディレクトリ> <出力JSONファイル>" >&2
    echo "例: $0 /path/to/folder output.json" >&2
    exit 1
fi

TARGET_DIR="$1"
OUTPUT_FILE="$2"

# ディレクトリの存在チェック
if [ ! -d "$TARGET_DIR" ]; then
    echo "エラー: ディレクトリが存在しません: $TARGET_DIR" >&2
    exit 1
fi

# 絶対パスに変換
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

echo "情報収集開始: $TARGET_DIR"

# 一時ファイル
TEMP_LS=$(mktemp)
TEMP_JSON=$(mktemp)

# クリーンアップ関数
cleanup() {
    rm -f "$TEMP_LS" "$TEMP_JSON"
}
trap cleanup EXIT

# ls コマンドで情報取得
# -l: 詳細表示
# -A: 隠しファイル含む（. と .. を除く）
# -R: 再帰的に取得
# --time-style=full-iso: 完全な日時フォーマット
cd "$TARGET_DIR"
ls -lAR --time-style=full-iso > "$TEMP_LS"

# JSON生成開始
echo "{" > "$TEMP_JSON"
echo "  \"base_path\": \"$TARGET_DIR\"," >> "$TEMP_JSON"
echo "  \"collected_at\": \"$(date --iso-8601=seconds)\"," >> "$TEMP_JSON"
echo "  \"nodes\": [" >> "$TEMP_JSON"

FIRST_ENTRY=true
CURRENT_DIR=""

# ls の出力をパース
while IFS= read -r line; do
    # ディレクトリヘッダーの処理（例: /path/to/dir:）
    if [[ "$line" =~ ^(.+):$ ]]; then
        CURRENT_DIR="${BASH_REMATCH[1]}"
        # 絶対パスから相対パスに変換
        CURRENT_DIR="${CURRENT_DIR#$TARGET_DIR}"
        CURRENT_DIR="${CURRENT_DIR#/}"
        if [ -z "$CURRENT_DIR" ]; then
            CURRENT_DIR="."
        fi
        continue
    fi

    # 空行をスキップ
    if [ -z "$line" ]; then
        continue
    fi

    # "total" 行をスキップ
    if [[ "$line" =~ ^total ]]; then
        continue
    fi

    # ls -l の出力をパース
    # 例: -rw-r--r-- 1 user group 1234 2025-09-30 12:34:56.789012345 +0900 filename
    if [[ "$line" =~ ^([dlrwxst-]{10})[[:space:]]+([0-9]+)[[:space:]]+([^[:space:]]+)[[:space:]]+([^[:space:]]+)[[:space:]]+([0-9]+)[[:space:]]+([0-9]{4}-[0-9]{2}-[0-9]{2}[[:space:]][0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+[[:space:]][+-][0-9]{4})[[:space:]]+(.+)$ ]]; then
        PERMISSIONS="${BASH_REMATCH[1]}"
        LINKS="${BASH_REMATCH[2]}"
        OWNER="${BASH_REMATCH[3]}"
        GROUP="${BASH_REMATCH[4]}"
        SIZE="${BASH_REMATCH[5]}"
        DATETIME="${BASH_REMATCH[6]}"
        NAME="${BASH_REMATCH[7]}"

        # ファイルタイプ判定
        FILE_TYPE="file"
        if [[ "$PERMISSIONS" =~ ^d ]]; then
            FILE_TYPE="directory"
        elif [[ "$PERMISSIONS" =~ ^l ]]; then
            FILE_TYPE="symlink"
        fi

        # フルパス構築
        if [ "$CURRENT_DIR" = "." ]; then
            FULL_PATH="$NAME"
        else
            FULL_PATH="$CURRENT_DIR/$NAME"
        fi

        # シンボリックリンクの場合、リンク先を抽出
        LINK_TARGET=""
        if [[ "$FILE_TYPE" = "symlink" && "$NAME" =~ ^(.+)[[:space:]]-\>[[:space:]](.+)$ ]]; then
            NAME="${BASH_REMATCH[1]}"
            LINK_TARGET="${BASH_REMATCH[2]}"
            if [ "$CURRENT_DIR" = "." ]; then
                FULL_PATH="$NAME"
            else
                FULL_PATH="$CURRENT_DIR/$NAME"
            fi
        fi

        # チェックサム取得（ファイルのみ）
        CHECKSUM=""
        if [ "$FILE_TYPE" = "file" ]; then
            ACTUAL_PATH="$TARGET_DIR/$FULL_PATH"
            if [ -f "$ACTUAL_PATH" ]; then
                CHECKSUM=$(md5sum "$ACTUAL_PATH" 2>/dev/null | awk '{print $1}' || echo "")
            fi
        fi

        # JSON エントリ追加
        if [ "$FIRST_ENTRY" = true ]; then
            FIRST_ENTRY=false
        else
            echo "," >> "$TEMP_JSON"
        fi

        echo "    {" >> "$TEMP_JSON"
        echo "      \"name\": \"$NAME\"," >> "$TEMP_JSON"
        echo "      \"path\": \"$FULL_PATH\"," >> "$TEMP_JSON"
        echo "      \"parent_dir\": \"$CURRENT_DIR\"," >> "$TEMP_JSON"
        echo "      \"type\": \"$FILE_TYPE\"," >> "$TEMP_JSON"
        echo "      \"permissions\": \"$PERMISSIONS\"," >> "$TEMP_JSON"
        echo "      \"owner\": \"$OWNER\"," >> "$TEMP_JSON"
        echo "      \"group\": \"$GROUP\"," >> "$TEMP_JSON"
        echo "      \"size\": $SIZE," >> "$TEMP_JSON"
        echo "      \"datetime\": \"$DATETIME\"," >> "$TEMP_JSON"

        if [ -n "$LINK_TARGET" ]; then
            echo "      \"link_target\": \"$LINK_TARGET\"," >> "$TEMP_JSON"
        fi

        if [ -n "$CHECKSUM" ]; then
            echo "      \"checksum\": \"$CHECKSUM\"" >> "$TEMP_JSON"
        else
            echo "      \"checksum\": null" >> "$TEMP_JSON"
        fi

        echo -n "    }" >> "$TEMP_JSON"
    fi
done < "$TEMP_LS"

# JSON終了
echo "" >> "$TEMP_JSON"
echo "  ]" >> "$TEMP_JSON"
echo "}" >> "$TEMP_JSON"

# 出力ファイルに書き込み
mv "$TEMP_JSON" "$OUTPUT_FILE"

echo "情報収集完了: $OUTPUT_FILE"
echo "収集されたノード数: $(grep -c '"name"' "$OUTPUT_FILE")"
