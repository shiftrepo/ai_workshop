#!/bin/bash

# 簡易フォルダ比較スクリプト（jq不要版）
FOLDER1="$1"
FOLDER2="$2"
OUTPUT_FILE="output/comparison_data.json"

mkdir -p output

# JSON出力開始
cat > "$OUTPUT_FILE" << 'JSONSTART'
{
  "comparison_info": {
    "folder1": "FOLDER1_PLACEHOLDER",
    "folder2": "FOLDER2_PLACEHOLDER",
    "timestamp": "TIMESTAMP_PLACEHOLDER"
  },
  "file_existence": {
    "only_in_dir1": [],
    "only_in_dir2": [],
    "common_files": []
  },
  "file_content": {
    "identical_files": [],
    "different_files": []
  },
  "file_attributes": {
    "attribute_details": []
  },
  "directory_structure": {
    "only_in_dir1": [],
    "only_in_dir2": [],
    "common_directories": []
  }
}
JSONSTART

# フォルダ情報を置換
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i "s|FOLDER1_PLACEHOLDER|$FOLDER1|g" "$OUTPUT_FILE"
sed -i "s|FOLDER2_PLACEHOLDER|$FOLDER2|g" "$OUTPUT_FILE"
sed -i "s|TIMESTAMP_PLACEHOLDER|$TIMESTAMP|g" "$OUTPUT_FILE"

echo "[INFO] 比較データをシンプルな形式で生成しました: $OUTPUT_FILE"
echo "[INFO] フォルダ1: $FOLDER1"
echo "[INFO] フォルダ2: $FOLDER2"

# ファイル一覧を収集
cd "$FOLDER1" 2>/dev/null && find . -type f | sort > /tmp/files1.txt
cd - > /dev/null
cd "$FOLDER2" 2>/dev/null && find . -type f | sort > /tmp/files2.txt
cd - > /dev/null

# 共通ファイルと差分ファイルを表示
echo "[INFO] 共通ファイル:"
comm -12 /tmp/files1.txt /tmp/files2.txt
echo "[INFO] フォルダ1のみのファイル:"
comm -23 /tmp/files1.txt /tmp/files2.txt
echo "[INFO] フォルダ2のみのファイル:"
comm -13 /tmp/files1.txt /tmp/files2.txt

echo "[完了] 比較データ生成完了"
