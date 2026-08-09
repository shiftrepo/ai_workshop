#!/bin/bash
# 各インフォグラフHTMLが 1376x768 に収まっているかを検査する。
#
# レンダリング結果は固定サイズで切り取られるため、はみ出した内容は
# PNG上で黙って欠落する (画像を目視しないと気づけない)。
# このスクリプトは実測の scrollHeight を比較し、はみ出しを数値で検出する。
#
# 使い方:
#   ./check-fit.sh              # 全部検査
#   ./check-fit.sh 00_overview  # 指定した1枚だけ
#
# 終了コード: 0 = 全て収まっている / 1 = はみ出しあり

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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
  echo "❌ Chrome/Edge が見つかりません。"
  exit 1
fi

WORK="${TEMP:-/tmp}/ig_fit_check"
rm -rf "$WORK"; mkdir -p "$WORK"
cp _base.css "$WORK/"

to_win_path() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else echo "$1"; fi
}

# 実測して document.title に載せる計測スクリプト。
#
# .sheet の scrollHeight だけでは不十分。flex 子要素 (min-height:0) の内側で
# あふれた内容は親を押し広げずに切り取られるため、シート全体は「収まっている」と
# 見えてしまう。そのため全要素を走査し、内部あふれも検出する。
read -r -d '' PROBE <<'EOF' || true
<script>
window.addEventListener('load', function () {
  var sheet = document.querySelector('.sheet');
  var over = sheet.scrollHeight - sheet.clientHeight;
  var wide = sheet.scrollWidth - sheet.clientWidth;

  // 内部あふれの検出 (スクロールバー非表示でも scrollHeight には出る)
  var inner = [];
  document.querySelectorAll('.sheet *').forEach(function (el) {
    var dy = el.scrollHeight - el.clientHeight;
    if (dy > 1 && el.clientHeight > 0) {
      var id = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).join('.')
        : el.tagName.toLowerCase();
      inner.push(id + '(+' + dy + ')');
    }
  });

  // フッタと本文の重なり検出 (切り取られず重なって描画される場合)
  var foot = document.querySelector('.foot');
  var collide = 0;
  if (foot) {
    var ft = foot.getBoundingClientRect().top;
    document.querySelectorAll('.body *').forEach(function (el) {
      if (el.children.length === 0 && el.getBoundingClientRect().height > 0) {
        var b = el.getBoundingClientRect().bottom;
        if (b > ft + 1) collide = Math.max(collide, Math.round(b - ft));
      }
    });
  }

  document.title = 'FIT ' + JSON.stringify({
    over: over, wide: wide, collide: collide, inner: inner.slice(0, 6)
  });
});
</script>
EOF

targets=()
if [ $# -gt 0 ]; then
  for name in "$@"; do targets+=("${name%.html}.html"); done
else
  for f in [0-9]*.html; do targets+=("$f"); done
fi

fail=0
for html in "${targets[@]}"; do
  [ -f "$html" ] || { echo "⚠️  $html が見つかりません"; continue; }

  # </body> の直前に計測スクリプトを挿入したコピーを作る
  probe_file="$WORK/${html}"
  python - "$html" "$probe_file" <<PYEOF
import sys
src = open(sys.argv[1], encoding='utf-8').read()
probe = r'''$PROBE'''
open(sys.argv[2], 'w', encoding='utf-8').write(src.replace('</body>', probe + '\n</body>'))
PYEOF

  result=$("$BROWSER" --headless --disable-gpu --hide-scrollbars \
      --window-size=1376,768 --virtual-time-budget=3000 --dump-dom \
      "file:///$(to_win_path "$probe_file")" 2>/dev/null \
    | grep -o 'FIT {[^}]*}' | head -1)

  over=$(echo "$result" | grep -o '"over":[-0-9]*' | cut -d: -f2)
  wide=$(echo "$result" | grep -o '"wide":[-0-9]*' | cut -d: -f2)
  collide=$(echo "$result" | grep -o '"collide":[-0-9]*' | cut -d: -f2)
  inner=$(echo "$result" | grep -o '"inner":\[[^]]*\]' | sed 's/"inner"://')
  over=${over:-unknown}; wide=${wide:-0}; collide=${collide:-0}

  if [ "$over" = "unknown" ]; then
    echo "❓ $html : 計測できませんでした"
    fail=1
  elif [ "$over" -gt 0 ] || [ "$wide" -gt 0 ]; then
    echo "❌ $html : シートから 縦 ${over}px / 横 ${wide}px はみ出しています"
    fail=1
  elif [ "$collide" -gt 0 ]; then
    echo "❌ $html : 本文がフッタに ${collide}px 食い込んでいます"
    fail=1
  elif [ "$inner" != "[]" ] && [ -n "$inner" ]; then
    echo "❌ $html : 要素内部であふれています $inner"
    fail=1
  else
    echo "✅ $html : 収まっています"
  fi
done

exit $fail
