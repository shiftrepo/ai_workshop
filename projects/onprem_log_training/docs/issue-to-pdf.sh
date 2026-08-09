#!/bin/bash
# GitHub Issue (本文 + 全コメント) を1つのPDFに変換する。
#
# 課題の記録を、GitHubにアクセスできない場所へ持ち出したり、
# 会議資料として配布したりするために使う。
#
# 追加の依存パッケージは入れない方針:
#   - Markdown → HTML : npx marked (npm経由、恒久インストール不要)
#   - HTML → PDF      : ヘッドレスChrome の --print-to-pdf (既にあるものを使う)
# 日本語フォントの追加インストールも不要 (OS標準のフォントが使われる)。
#
# 使い方:
#   ./issue-to-pdf.sh 45                      # issue-45.pdf を出力
#   ./issue-to-pdf.sh 45 out.pdf              # 出力先を指定
#   REPO=owner/name ./issue-to-pdf.sh 45      # 別リポジトリを対象にする
#   KEEP_WORK=1 ./issue-to-pdf.sh 45          # 中間ファイル(md/html)を残す (崩れの調査用)
#
# 画像について:
#   コメント中の raw.githubusercontent.com URL のうち、このリポジトリ内の
#   ファイルを指すものはローカルパスへ書き換える。ネットワークやコミットの
#   存在に依存せず、常に手元の内容でPDFを作るため。

set -e

ISSUE="${1:?使い方: ./issue-to-pdf.sh <issue番号> [出力先.pdf]}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT="${2:-$SCRIPT_DIR/issue-${ISSUE}.pdf}"
REPO="${REPO:-shiftrepo/ai_workshop}"

# ---- Chrome/Edge を探す ------------------------------------------------------
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

to_win_path() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else echo "$1"; fi
}

WORK="$SCRIPT_DIR/.issue_pdf_work"
rm -rf "$WORK"; mkdir -p "$WORK"
# レイアウトが崩れた時に中間HTMLを見られるよう、KEEP_WORK=1 で残せるようにする
if [ -z "$KEEP_WORK" ]; then trap 'rm -rf "$WORK"' EXIT; fi

# ---- Issue を取得 -----------------------------------------------------------
echo "▶ Issue #$ISSUE を取得中 ($REPO)"
gh issue view "$ISSUE" --repo "$REPO" \
  --json number,title,state,author,createdAt,updatedAt,url,labels,body,comments \
  > "$WORK/issue.json"

# ---- JSON → Markdown --------------------------------------------------------
# コメントは投稿順に並べ、各コメントの前に投稿者と日時の見出しを入れる。
python - "$WORK/issue.json" "$WORK/issue.md" "$REPO_ROOT" <<'PYEOF'
import json, re, sys, os

src, dst, repo_root = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(src, encoding='utf-8'))

def jst(iso):
    """ISO8601(UTC) を JST の読みやすい表記にする。"""
    from datetime import datetime, timedelta, timezone
    t = datetime.strptime(iso, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    return t.astimezone(timezone(timedelta(hours=9))).strftime('%Y-%m-%d %H:%M JST')

def localize(md):
    """このリポジトリ内を指す raw.githubusercontent URL をローカルパスへ書き換える。

    ネットワークやコミットの存在に依存せず、手元の内容でPDFを作るため。
    リポジトリ内に無いファイルを指している場合は URL のまま残す。
    """
    pat = re.compile(r'https://raw\.githubusercontent\.com/[^/]+/[^/]+/[0-9a-f]{7,40}/(\S+?)(?=[)\s])')
    def rep(m):
        rel = m.group(1)
        if os.path.isfile(os.path.join(repo_root, rel)):
            return 'file:///' + os.path.join(repo_root, rel).replace('\\', '/')
        return m.group(0)
    return pat.sub(rep, md)

def demote(md):
    """見出しを1段下げる。

    Issue本文やコメントは単体で書かれているため h1/h2 から始まることが多く、
    そのままだとPDFの「本文」「コメント」という枠組みと同じ高さになって
    階層が読めなくなる。コードブロック内の # は見出しではないので除外する。
    """
    out, fence = [], None
    for line in md.split('\n'):
        f = re.match(r'^\s*(```+|~~~+)', line)
        if f:
            mark = f.group(1)[0] * 3
            fence = None if fence and mark == fence else (fence or mark)
            out.append(line); continue
        if fence is None:
            h = re.match(r'^(#{1,5})(\s+\S)', line)
            if h:
                line = '#' + line
        out.append(line)
    return '\n'.join(out)

def prep(md):
    return demote(localize(md))

parts = []
parts.append('# #{} {}\n'.format(d['number'], d['title']))

# メタ情報は生HTMLで組む。marked は生HTMLブロックの中の Markdown を
# 解釈しないため、div で囲んだ表記法のテーブルはパイプ文字のまま残ってしまう。
labels = ', '.join(l['name'] for l in d['labels']) or '(なし)'
rows = [
    ('状態',     d['state']),
    ('作成者',   d['author']['login']),
    ('作成',     jst(d['createdAt'])),
    ('最終更新', jst(d['updatedAt'])),
    ('ラベル',   labels),
    ('URL',      d['url']),
]
parts.append('<table class="meta">\n')
for k, v in rows:
    parts.append('<tr><th>{}</th><td>{}</td></tr>\n'.format(k, v))
parts.append('</table>\n')

parts.append('\n## 本文\n\n')
parts.append(prep(d['body'] or '_(本文なし)_') + '\n')

comments = d['comments']
if comments:
    parts.append('\n## コメント ({}件)\n'.format(len(comments)))
    for i, c in enumerate(comments, 1):
        parts.append('\n<div class="cmt-head">コメント {} — {} / {}</div>\n\n'.format(
            i, c['author']['login'], jst(c['createdAt'])))
        parts.append(prep(c['body']) + '\n')

open(dst, 'w', encoding='utf-8').write(''.join(parts))
print('  Markdown: {} chars / コメント {}件'.format(
    sum(len(p) for p in parts), len(comments)))
PYEOF

# ---- Markdown → HTML --------------------------------------------------------
echo "▶ Markdown を HTML に変換中"
npx --yes marked@15 -i "$WORK/issue.md" --gfm > "$WORK/fragment.html" </dev/null

# ---- HTML を印刷用に整える ---------------------------------------------------
# 画像は横幅に合わせて縮め、ページ途中で切れないようにする。
# コードブロックは折り返す (PDFでは横スクロールできないため)。
cat > "$WORK/style.css" <<'CSSEOF'
@page { size: A4; margin: 16mm 14mm; }
body {
  font-family: "Yu Gothic", "Meiryo", "Hiragino Kaku Gothic ProN", sans-serif;
  font-size: 10.5pt; line-height: 1.7; color: #1f2937; margin: 0;
}
h1 {
  font-size: 19pt; color: #0f172a; border-bottom: 3px solid #2563eb;
  padding-bottom: 8px; margin: 0 0 14px;
}
h2 {
  font-size: 14pt; color: #1e3a5f; border-bottom: 1px solid #cbd5e1;
  padding-bottom: 5px; margin: 22px 0 10px; page-break-after: avoid;
}
h3 { font-size: 12pt; color: #2563eb; margin: 16px 0 7px; page-break-after: avoid; }
h4 { font-size: 11pt; color: #1e3a5f; margin: 14px 0 6px; page-break-after: avoid; }
/* 見出しを1段下げるため h5/h6 まで到達する */
h5 { font-size: 10.5pt; color: #334155; margin: 12px 0 5px; page-break-after: avoid; }
h6 { font-size: 10pt; color: #475569; margin: 10px 0 5px; page-break-after: avoid; }
p { margin: 8px 0; }
a { color: #1d4ed8; word-break: break-all; }
strong { color: #b91c1c; }

table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; }
th { background: #1e3a5f; color: #fff; text-align: left; padding: 6px 9px; }
td { border: 1px solid #d7dee8; padding: 5px 9px; vertical-align: top; }
tr:nth-child(even) td { background: #f8fafc; }

/* メタ情報テーブルは縦見出し (左列がラベル) */
table.meta th {
  background: #eef2f7; color: #1e3a5f; width: 88px; white-space: nowrap;
  border: 1px solid #d7dee8; padding: 5px 9px; font-size: 9.5pt;
}
table.meta td { font-size: 9.5pt; }
table.meta tr:nth-child(even) td { background: #fff; }

pre {
  background: #0f172a; color: #e2e8f0; border-radius: 5px; padding: 10px 12px;
  font-family: Consolas, "Courier New", monospace; font-size: 8.5pt; line-height: 1.55;
  white-space: pre-wrap; word-break: break-all; page-break-inside: avoid;
}
code {
  font-family: Consolas, "Courier New", monospace; font-size: 9pt;
  background: #eef2f7; padding: 1px 4px; border-radius: 3px; word-break: break-all;
}
pre code { background: none; padding: 0; color: inherit; font-size: inherit; }

blockquote {
  border-left: 4px solid #93c5fd; background: #f8fafc; margin: 10px 0;
  padding: 6px 14px; color: #334155;
}
ul, ol { margin: 8px 0; padding-left: 24px; }
li { margin: 3px 0; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 18px 0; }

/* 画像はページ幅に収め、途中で切らない */
img { max-width: 100%; height: auto; display: block; margin: 10px auto; page-break-inside: avoid; }

/* コメントの区切り見出し */
.cmt-head {
  background: #eef2f7; border-left: 5px solid #2563eb; border-radius: 4px;
  padding: 6px 12px; margin: 20px 0 10px; font-size: 10pt; font-weight: 700;
  color: #1e3a5f; page-break-after: avoid;
}
CSSEOF

python - "$WORK/fragment.html" "$WORK/style.css" "$WORK/issue.html" \
         "$(python -c "import json,sys;print(json.load(open(sys.argv[1],encoding='utf-8'))['title'])" "$WORK/issue.json")" \
         "$ISSUE" <<'PYEOF'
import sys
frag  = open(sys.argv[1], encoding='utf-8').read()
css   = open(sys.argv[2], encoding='utf-8').read()
title = '#{} {}'.format(sys.argv[5], sys.argv[4])
html = (
    '<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
    '<title>{}</title>\n<style>\n{}</style>\n</head>\n<body>\n{}\n</body>\n</html>\n'
).format(title, css, frag)
open(sys.argv[3], 'w', encoding='utf-8').write(html)
PYEOF

# ---- HTML → PDF -------------------------------------------------------------
echo "▶ PDF を生成中"
# --no-pdf-header-footer: URLと日付の自動ヘッダを消す (配布物として不要)
# --virtual-time-budget : 画像の読み込みを待つ
"$BROWSER" --headless --disable-gpu \
  --print-to-pdf="$(to_win_path "$OUT")" \
  --no-pdf-header-footer \
  --virtual-time-budget=20000 \
  "file:///$(to_win_path "$WORK/issue.html")" 2>/dev/null

if [ ! -f "$OUT" ]; then
  echo "❌ PDF が生成されませんでした。"
  exit 1
fi

echo "✅ $OUT ($(stat -c %s "$OUT" 2>/dev/null || stat -f %z "$OUT") bytes)"
