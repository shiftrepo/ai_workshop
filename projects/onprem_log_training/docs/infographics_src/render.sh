#!/bin/bash
# インフォグラフHTMLをPNG(2752x1536)へ書き出す。
#
# CSSは 1376x768 で組み、--force-device-scale-factor=2 で2倍に出力する。
# 出力サイズは既存 docs/*.png (2752x1536) と揃えている。
#
# 使い方:
#   ./render.sh              # 全部レンダリング
#   ./render.sh 00_overview  # 指定した1枚だけ
#
# 依存: Google Chrome または Microsoft Edge (headless)。
# 追加のnpmパッケージやフォントのインストールは不要 (OS同梱の Yu Gothic / Meiryo を使う)。

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

OUT_DIR="$SCRIPT_DIR/../infographics"
mkdir -p "$OUT_DIR"

# Chrome/Edge を探す (Windows想定。Linux/macOSは PATH 上のコマンドを使う)
BROWSER=""
for cand in \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "/c/Program Files/Microsoft/Edge/Application/msedge.exe"
do
  if [ -f "$cand" ]; then BROWSER="$cand"; break; fi
done
if [ -z "$BROWSER" ]; then
  for cand in google-chrome chromium chromium-browser microsoft-edge; do
    if command -v "$cand" >/dev/null 2>&1; then BROWSER="$cand"; break; fi
  done
fi
if [ -z "$BROWSER" ]; then
  echo "❌ Chrome/Edge が見つかりません。いずれかをインストールしてください。"
  exit 1
fi

# Windows形式の絶対パスへ変換する (Chromeはheadlessでも --screenshot にWindowsパスを要求する)
to_win_path() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else echo "$1"; fi
}

targets=()
if [ $# -gt 0 ]; then
  for name in "$@"; do targets+=("${name%.html}.html"); done
else
  for f in [0-9]*.html; do targets+=("$f"); done
fi

for html in "${targets[@]}"; do
  if [ ! -f "$html" ]; then
    echo "⚠️  $html が見つかりません。スキップします。"
    continue
  fi
  base="${html%.html}"
  out="$OUT_DIR/$base.png"
  echo "🖼️  $html → infographics/$base.png"
  "$BROWSER" \
    --headless \
    --disable-gpu \
    --hide-scrollbars \
    --force-device-scale-factor=2 \
    --window-size=1376,768 \
    --default-background-color=00000000 \
    --screenshot="$(to_win_path "$out")" \
    "file:///$(to_win_path "$SCRIPT_DIR/$html")" 2>/dev/null
done

echo "✅ 完了: $(cd "$OUT_DIR" && pwd)"
