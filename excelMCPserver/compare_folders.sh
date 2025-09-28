#!/bin/bash
echo "Folder Comparison Tool using Excel MCP Server (GitBash version)"
echo "==========================================="
echo ""

if [ $# -ne 2 ]; then
  echo "Usage: ./compare_folders.sh [folder1] [folder2]"
  echo ""
  echo "Example: ./compare_folders.sh /c/Project/v1 /c/Project/v2"
  echo ""
  echo "The comparison report will be saved as comparison_report_[timestamp].xlsx"
  exit 1
fi

DIR1=$1
DIR2=$2
OUTPUT_FILE="comparison_report_$(date +%Y%m%d_%H%M%S).xlsx"

echo "Comparing folders:"
echo "  1: $DIR1"
echo "  2: $DIR2"
echo "Output file: $OUTPUT_FILE"
echo ""

node mcp_folder_compare.js "$DIR1" "$DIR2" "$OUTPUT_FILE"