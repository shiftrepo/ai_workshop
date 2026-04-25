/**
 * 料金算出マトリックスエンジン — プレゼンテーション
 * 全13スライド構成
 */
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Hermes Agent";
pres.title = "複雑な事務処理ロジックの自動化：料金算出マトリックスエンジン";

// ============================================================
// カラーパレット
// ============================================================
const C = {
  bg_dark:  "0F172A",
  bg_mid:   "1E293B",
  bg_card:  "1E3A5F",
  accent1:  "38BDF8",
  accent2:  "F59E0B",
  accent3:  "34D399",
  accent4:  "F87171",
  text_w:   "F8FAFC",
  text_dim: "94A3B8",
  border:   "334155",
};
const FONT_H = "Trebuchet MS";
const FONT_B = "Calibri";
const FONT_M = "Courier New";

// ============================================================
// ユーティリティ
// ============================================================
pres.defineSlideMaster({
  title: "MASTER",
  background: { color: C.bg_dark },
  objects: [
    { line:  { x:0, y:5.38, w:10, h:0, line:{ color: C.border, width:0.8 } } },
    { text:  { text:"複雑な事務処理ロジック自動化  |  Hermes Agent",
               options:{ x:0.3, y:5.4, w:8, h:0.2, fontFace:FONT_B, fontSize:9, color:C.text_dim } } },
  ]
});

function titleBar(slide, text, accentColor, num) {
  slide.addShape(pres.shapes.RECTANGLE, { x:0,y:0, w:10,h:1.05, fill:{color:C.bg_mid}, line:{color:C.bg_mid} });
  slide.addShape(pres.shapes.RECTANGLE, { x:0,y:0, w:0.1,h:1.05, fill:{color:accentColor}, line:{color:accentColor} });
  if (num) {
    slide.addText(num, { x:0.2,y:0.2, w:0.6,h:0.65, fontFace:FONT_H, fontSize:9, bold:true, color:accentColor, align:"center", valign:"middle", margin:0 });
  }
  slide.addText(text, { x:0.3,y:0.27, w:9.4,h:0.52, fontFace:FONT_H, fontSize:20, bold:true, color:C.text_w, valign:"middle", margin:0 });
}

function card(slide, x, y, w, h, borderColor) {
  slide.addShape(pres.shapes.RECTANGLE, { x,y, w,h, fill:{color:C.bg_mid}, line:{color:borderColor||C.border, pt:1.2} });
  slide.addShape(pres.shapes.RECTANGLE, { x,y, w,h:0.07, fill:{color:borderColor||C.border}, line:{color:borderColor||C.border} });
}

function codeBox(slide, x, y, w, h, code) {
  slide.addShape(pres.shapes.RECTANGLE, { x,y, w,h, fill:{color:"0A0F1A"}, line:{color:C.border, pt:1} });
  slide.addText(code, { x:x+0.12, y:y+0.08, w:w-0.2, h:h-0.15, fontFace:FONT_M, fontSize:9, color:"A5F3FC", valign:"top", margin:0 });
}

// ============================================================
// スライド 1: タイトル
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0, w:10,h:1.1, fill:{color:C.bg_mid}, line:{color:C.bg_mid} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0, w:3.2,h:1.1, fill:{color:C.bg_card}, line:{color:C.bg_card} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0, w:0.12,h:1.1, fill:{color:C.accent1}, line:{color:C.accent1} });
  s.addText("BUSINESS PROCESS AUTOMATION", { x:0.25,y:0.3, w:9,h:0.45, fontFace:FONT_H, fontSize:11, bold:true, color:C.accent1, charSpacing:4 });

  s.addText("複雑な事務処理ロジックの\n自動化能力デモ", { x:0.5,y:1.25, w:8.5,h:1.4, fontFace:FONT_H, fontSize:34, bold:true, color:C.text_w });
  s.addText("料金算出マトリックスエンジン — 1.77億通りの条件を58ルールで処理", { x:0.5,y:2.72, w:9,h:0.42, fontFace:FONT_B, fontSize:16, color:C.accent1 });
  s.addText("申請種別・申請者区分・地域・優先度・複雑度・規模・季節など\n10以上のパラメータを組み合わせた段階的料金算出を実装・実証します。", { x:0.5,y:3.22, w:7.5,h:0.65, fontFace:FONT_B, fontSize:12.5, color:C.text_dim });

  const badges = [["Python実装済み","1D6A4A"],["1.77億通りの条件","0369A1"],["58ルールで完全対応","7C2D12"]];
  badges.forEach(([t,c],i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:0.5+i*2.95,y:4.05, w:2.7,h:0.32, fill:{color:c}, line:{color:c}, rectRadius:0.05 });
    s.addText(t, { x:0.5+i*2.95,y:4.05, w:2.7,h:0.32, fontFace:FONT_B, fontSize:10, bold:true, color:C.text_w, align:"center", valign:"middle", margin:0 });
  });

  // 右装飾パネル
  s.addShape(pres.shapes.RECTANGLE, { x:8.5,y:1.1, w:1.5,h:4.3, fill:{color:C.bg_mid}, line:{color:C.bg_mid} });
  ["申請種別","地域区分","事業規模","優先度","季節係数","割引制度"].forEach((t,i) => {
    s.addText(t, { x:8.55,y:1.22+i*0.65, w:1.35,h:0.5, fontFace:FONT_B, fontSize:9.5, color:C.text_dim, align:"center", valign:"middle" });
    if(i<5) s.addShape(pres.shapes.LINE, { x:8.72,y:1.75+i*0.65, w:0.55,h:0, line:{color:C.border, width:0.5} });
  });
}

// ============================================================
// スライド 2: なぜ複雑なのか — 課題定義
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "01  |  なぜ「複雑」なのか — 事務処理ロジックの本質的な難しさ", C.accent2);

  const cols = [
    { title:"多種類の申請", icon:"📋", items:["建設工事許可（国交省系）","営業許可（飲食/風俗/古物）","補助金・助成金申請","輸出入許可（税関系）","宅地建物取引業免許","産業廃棄物処理業許可"], color:C.accent1 },
    { title:"掛け算の組み合わせ爆発", icon:"⚡", items:["申請者区分 × 地域区分","優先度 × 複雑度 × 規模","季節・繁忙期の時間変数","5種のフラグ（ON/OFF）","書類枚数段階・補正回数","リピーター×パッケージ割引"], color:C.accent2 },
    { title:"属人化・現場の課題", icon:"🏛", items:["ルールが文書散在・担当者依存","ヒューマンエラーが頻発する","条件変更のたびに全体影響","説明責任・監査証跡の欠如","Excelでは管理限界にすぐ達する","スケール・自動化が困難"], color:C.accent4 },
  ];

  cols.forEach((col, i) => {
    const x = 0.28 + i * 3.18;
    card(s, x, 1.18, 3.0, 4.08, col.color);
    s.addText(`${col.icon}  ${col.title}`, { x:x+0.1,y:1.25, w:2.85,h:0.45, fontFace:FONT_H, fontSize:12.5, bold:true, color:col.color, valign:"middle", margin:0 });
    s.addShape(pres.shapes.LINE, { x:x+0.12,y:1.73, w:2.78,h:0, line:{color:C.border, width:0.5} });
    const items = col.items.map((t,j)=>({ text:t, options:{ bullet:true, breakLine:j<col.items.length-1, fontSize:11, color:j===0?C.text_w:C.text_dim, paraSpaceAfter:5 } }));
    s.addText(items, { x:x+0.12,y:1.8, w:2.82,h:3.35, fontFace:FONT_B, valign:"top" });
  });
}

// ============================================================
// スライド 3: 組み合わせ爆発の数字 (★新規)
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "02  |  組み合わせ爆発の実態 — 1.77億通りのパターンが存在する", C.accent4);

  // 左: 軸ごとの棒グラフ的説明
  const axes = [
    { name:"申請種別",       n:6,  note:"A〜F の6種",                          c:C.accent1, w:1.2 },
    { name:"申請者区分",     n:3,  note:"個人・法人・行政機関",                 c:C.accent1, w:0.6 },
    { name:"地域区分",       n:4,  note:"特別区〜過疎地域",                     c:C.accent2, w:0.8 },
    { name:"処理優先度",     n:3,  note:"標準・急ぎ・最急",                     c:C.accent2, w:0.6 },
    { name:"申請複雑度",     n:4,  note:"簡易〜超複雑",                         c:C.accent2, w:0.8 },
    { name:"事業規模",       n:4,  note:"零細〜大企業（法人のみ）",             c:C.accent2, w:0.8 },
    { name:"季節・繁忙期",   n:5,  note:"繁忙期×1.20〜閑散期×0.95",           c:C.accent3, w:1.0 },
    { name:"バイナリフラグ", n:32, note:"5フラグのON/OFF = 2⁵",               c:C.accent4, w:2.5 },
    { name:"段階変数",       n:320,note:"書類/補正/リピーター/パッケージ",      c:C.accent4, w:4.5 },
  ];

  axes.forEach((ax, i) => {
    const y = 1.2 + i * 0.44;
    s.addText(ax.name, { x:0.25,y:y+0.02, w:2.1,h:0.36, fontFace:FONT_B, fontSize:10.5, bold:true, color:C.text_w, valign:"middle", margin:0 });
    // バー背景
    s.addShape(pres.shapes.RECTANGLE, { x:2.4,y:y+0.05, w:4.5,h:0.26, fill:{color:C.border}, line:{color:C.border} });
    // バー本体（最大= 320 → 4.5inch）
    const bw = Math.min(ax.w, 4.5);
    s.addShape(pres.shapes.RECTANGLE, { x:2.4,y:y+0.05, w:bw,h:0.26, fill:{color:ax.c}, line:{color:ax.c} });
    // 数値
    s.addText(`×${ax.n}`, { x:6.98,y:y+0.02, w:0.7,h:0.36, fontFace:FONT_B, fontSize:11, bold:true, color:ax.c, align:"right", valign:"middle", margin:0 });
    s.addText(ax.note, { x:7.75,y:y+0.02, w:2.1,h:0.36, fontFace:FONT_B, fontSize:9.5, color:C.text_dim, valign:"middle", margin:0 });
  });

  // 合計強調ボックス
  s.addShape(pres.shapes.RECTANGLE, { x:0.25,y:5.08, w:9.5,h:0.22, fill:{color:"3B0764"}, line:{color:C.accent1, pt:1.5} });
  s.addText("全変数の積 = 6 × 3 × 4 × 3 × 4 × 4 × 5 × 32 × 320", { x:0.35,y:5.08, w:5.8,h:0.22, fontFace:FONT_M, fontSize:10, bold:true, color:C.text_w, valign:"middle", margin:0 });
  s.addText("≈ 1億7,700万 通り", { x:6.2,y:5.08, w:3.4,h:0.22, fontFace:FONT_H, fontSize:12, bold:true, color:C.accent2, align:"right", valign:"middle", margin:0 });
}

// ============================================================
// スライド 4: if-else地獄 vs テーブル駆動 (★新規 詳細)
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "03  |  解決策①：テーブル駆動設計 — if-else地獄からの脱却", C.accent3);

  // 左: BAD（if-else地獄）
  s.addShape(pres.shapes.RECTANGLE, { x:0.25,y:1.12, w:4.55,h:0.32, fill:{color:"7C2D12"}, line:{color:C.accent4} });
  s.addText("❌  BAD: if-else を全パターン書いた場合", { x:0.3,y:1.12, w:4.45,h:0.32, fontFace:FONT_B, fontSize:10.5, bold:true, color:C.text_w, valign:"middle", margin:0 });

  codeBox(s, 0.25,1.46, 4.55,3.78,
`# 建設工事 × 個人 × 通常
if type=="A" and person=="individual" \\
   and priority=="standard":
    fee = 80000
# 建設工事 × 個人 × 急ぎ
elif type=="A" and person=="individual" \\
     and priority=="express":
    fee = 120000
# 建設工事 × 個人 × 最急
elif type=="A" and person=="individual" \\
     and priority=="urgent":
    fee = 176000
# ↓ これを 1.77億パターン分…
# （現実的に書けない・保守不可能）
# 建設工事 × 法人(大) × 特別区 × 急ぎ
# × 複雑 × 繁忙期 × 翻訳ON × ...
elif ...:
    fee = ...`);

  // 右: GOOD（テーブル駆動）
  s.addShape(pres.shapes.RECTANGLE, { x:5.1,y:1.12, w:4.65,h:0.32, fill:{color:"1D6A4A"}, line:{color:C.accent3} });
  s.addText("✅  GOOD: テーブル駆動設計", { x:5.15,y:1.12, w:4.55,h:0.32, fontFace:FONT_B, fontSize:10.5, bold:true, color:C.text_w, valign:"middle", margin:0 });

  codeBox(s, 5.1,1.46, 4.65,3.78,
`# 基本料金テーブル（辞書で定義）
BASE_FEE = {
  ("A","individual"):  80_000,
  ("A","corporation"): 150_000,
  ("A","government"):   60_000,
  ("B","individual"):  50_000,
  # … 18エントリのみ
}

# 係数テーブル（各軸ひとつ）
PRIORITY_MULT = {
  "standard": 1.00,
  "express":  1.50,
  "urgent":   2.20,
}

# 適用はテーブル引きだけ
base = BASE_FEE[(app_type, person)]
fee  = base * PRIORITY_MULT[priority]
# → 全パターンに対応完了`);

  // 下部: まとめ比較
  s.addShape(pres.shapes.RECTANGLE, { x:0.25,y:5.27, w:9.5,h:0.28, fill:{color:C.bg_mid}, line:{color:C.border} });
  s.addText("if-else: 理論上1.77億行が必要", { x:0.4,y:5.28, w:4.3,h:0.25, fontFace:FONT_B, fontSize:10.5, color:C.accent4, valign:"middle", margin:0 });
  s.addShape(pres.shapes.LINE, { x:4.75,y:5.3, w:0,h:0.22, line:{color:C.border, width:1} });
  s.addText("テーブル駆動: 58ルール（600行）で全パターン対応", { x:4.85,y:5.28, w:4.7,h:0.25, fontFace:FONT_B, fontSize:10.5, bold:true, color:C.accent3, valign:"middle", margin:0 });
}

// ============================================================
// スライド 5: テーブル駆動 — 別例（税率計算）(★新規)
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "04  |  テーブル駆動の別例 — 所得税の累進課税計算", C.accent1);

  s.addText("同じ設計パターンは「課税所得 × 控除種別 × 申告区分」など他の複雑計算にも即応用できます。", {
    x:0.3,y:1.12, w:9.4,h:0.35, fontFace:FONT_B, fontSize:12, color:C.text_dim
  });

  // 左: 税率テーブルの説明
  s.addShape(pres.shapes.RECTANGLE, { x:0.25,y:1.55, w:4.55,h:0.3, fill:{color:C.bg_card}, line:{color:C.accent1} });
  s.addText("所得税テーブル（国税庁ベース簡略版）", { x:0.3,y:1.55, w:4.45,h:0.3, fontFace:FONT_H, fontSize:11, bold:true, color:C.accent1, valign:"middle", margin:0 });

  const taxTable = [
    [{ text:"課税所得（万円）", options:{bold:true,color:C.text_w,fill:{color:"0F2A4A"},align:"center"} },
     { text:"税率",            options:{bold:true,color:C.text_w,fill:{color:"0F2A4A"},align:"center"} },
     { text:"控除額",          options:{bold:true,color:C.text_w,fill:{color:"0F2A4A"},align:"center"} }],
    ["〜 195", "5%",  "0円"],
    ["〜 330", "10%", "97,500円"],
    ["〜 695", "20%", "427,500円"],
    ["〜 900", "23%", "636,000円"],
    ["〜1,800", "33%", "1,536,000円"],
    ["〜4,000", "40%", "2,796,000円"],
    ["4,000〜", "45%", "4,796,000円"],
  ];
  const rows = taxTable.map((row, i) => {
    if(i===0) return row;
    return row.map((cell, j) => ({
      text: cell,
      options: { color: j===1?C.accent2:C.text_w, fill:{color: i%2===0?C.bg_mid:"1E3A5F"}, align:"center", fontSize:11 }
    }));
  });
  s.addTable(rows, { x:0.25,y:1.87, w:4.55, colW:[2.1,1.1,1.35], border:{pt:0.5,color:C.border}, fontFace:FONT_B, rowH:0.33 });

  // 右: コード例
  s.addShape(pres.shapes.RECTANGLE, { x:5.05,y:1.55, w:4.7,h:0.3, fill:{color:"1D6A4A"}, line:{color:C.accent3} });
  s.addText("✅  テーブル駆動で実装", { x:5.1,y:1.55, w:4.6,h:0.3, fontFace:FONT_B, fontSize:11, bold:true, color:C.text_w, valign:"middle", margin:0 });

  codeBox(s, 5.05,1.87, 4.7,3.45,
`TAX_TABLE = [
  # (上限万円, 税率, 控除額)
  (195,  0.05,        0),
  (330,  0.10,   97_500),
  (695,  0.20,  427_500),
  (900,  0.23,  636_000),
  (1800, 0.33, 1_536_000),
  (4000, 0.40, 2_796_000),
  (9e9,  0.45, 4_796_000),
]

def calc_income_tax(income_man: int) -> int:
    for limit, rate, deduct in TAX_TABLE:
        if income_man <= limit:
            return int(income_man*10000*rate
                       - deduct)
    return 0

# 例: 課税所得500万円
# → 500 <= 695 → 税率20%
# 5,000,000 × 0.20 − 427,500
# = ¥572,500`);

  // 下部ポイント
  s.addShape(pres.shapes.RECTANGLE, { x:0.25,y:5.27, w:9.5,h:0.28, fill:{color:C.bg_mid}, line:{color:C.border} });
  s.addText("テーブルを変えるだけで税制改正・新控除種別・法人税など全て対応 — コード本体は一切変更不要", {
    x:0.4,y:5.27, w:9.2,h:0.28, fontFace:FONT_B, fontSize:11, color:C.accent3, valign:"middle", margin:0
  });
}

// ============================================================
// スライド 6: 段階パイプライン詳細 (★新規 詳細)
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "05  |  解決策②：段階パイプライン — 順序制御された多段変換", C.accent2);

  s.addText("各計算ステップを「独立した純粋関数」として並べ、順番に適用します。ステップ間の依存は入出力のみ。", {
    x:0.3,y:1.1, w:9.4,h:0.32, fontFace:FONT_B, fontSize:11.5, color:C.text_dim
  });

  // パイプライン図（11ステップを縦2列）
  const steps = [
    { n:"1",  label:"基本料金",        note:"申請種別×申請者区分",     c:C.accent1,  val:"¥220,000" },
    { n:"2",  label:"地域係数",        note:"政令市 ×1.15",           c:C.accent1,  val:"¥252,999" },
    { n:"3",  label:"優先度係数",      note:"標準 ×1.00",             c:C.accent2,  val:"¥252,999" },
    { n:"4",  label:"複雑度係数",      note:"超複雑 ×2.10",           c:C.accent2,  val:"¥531,297" },
    { n:"5",  label:"事業規模係数",    note:"中規模法人 ×1.30",       c:C.accent2,  val:"¥690,686" },
    { n:"6",  label:"季節係数",        note:"2月繁忙期 ×1.20",        c:C.accent3,  val:"¥828,823" },
    { n:"7",  label:"追加料金加算",    note:"+法務+環境+補正 etc.",   c:C.accent4,  val:"¥1,085,823"},
    { n:"8",  label:"小計確定",        note:"係数合計+追加料金",       c:C.text_dim, val:"¥1,085,823"},
    { n:"9",  label:"リピーター割引",  note:"初回 ▲0%",               c:C.accent3,  val:"¥1,085,823"},
    { n:"10", label:"パッケージ割引",  note:"2件同時 ▲8%",            c:C.accent3,  val:"¥  999,000"},
    { n:"11", label:"最終料金確定",    note:"100円切上＋消費税",       c:C.accent2,  val:"¥1,098,900"},
  ];

  const colW = 4.5;
  steps.forEach((st, i) => {
    const col = i < 6 ? 0 : 1;
    const row = i < 6 ? i : i - 6;
    const x = 0.25 + col * 4.88;
    const y = 1.5 + row * 0.64;

    // ステップボックス
    s.addShape(pres.shapes.RECTANGLE, { x,y, w:colW,h:0.52, fill:{color:C.bg_mid}, line:{color:st.c, pt:0.9} });
    s.addShape(pres.shapes.RECTANGLE, { x,y, w:0.06,h:0.52, fill:{color:st.c}, line:{color:st.c} });

    // ステップ番号
    s.addText(`S${st.n}`, { x:x+0.1,y:y+0.02, w:0.42,h:0.48, fontFace:FONT_B, fontSize:9, bold:true, color:st.c, align:"center", valign:"middle", margin:0 });
    // ラベル
    s.addText(st.label, { x:x+0.55,y:y+0.03, w:1.8,h:0.25, fontFace:FONT_H, fontSize:11, bold:true, color:C.text_w, margin:0 });
    // サブノート
    s.addText(st.note, { x:x+0.55,y:y+0.28, w:1.9,h:0.2, fontFace:FONT_B, fontSize:8.8, color:C.text_dim, margin:0 });
    // 結果値
    s.addText(st.val, { x:x+2.52,y:y+0.06, w:1.88,h:0.38, fontFace:FONT_M, fontSize:10.5, bold:true, color:st.c, align:"right", valign:"middle", margin:0 });

    // 矢印
    if(row < (col===0?5:4)) {
      s.addShape(pres.shapes.LINE, { x:x+0.5,y:y+0.52, w:0,h:0.12, line:{color:C.border, width:1} });
    }
  });

  // 下の注記
  s.addText("← APP-003（産廃処理業許可）の実際の計算フロー ¥220,000 → ¥1,098,900（×4.99倍）", {
    x:0.25,y:5.3, w:9.5,h:0.2, fontFace:FONT_B, fontSize:9.5, color:C.text_dim, italic:true
  });
}

// ============================================================
// スライド 7: 段階パイプライン — 別例（物流料金）(★新規)
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "06  |  段階パイプラインの別例 — 物流料金の多段算出", C.accent3);

  s.addText("「距離 × 重量 × 速度 × 季節 × 付帯サービス」など、全く別業務でも同じ設計パターンが使えます。", {
    x:0.3,y:1.12, w:9.4,h:0.32, fontFace:FONT_B, fontSize:12, color:C.text_dim
  });

  // 左: パイプライン概念図
  const logi_steps = [
    { label:"① 基本距離料金",    note:"距離帯 × 便種",       val:"¥2,400",  c:C.accent1 },
    { label:"② 重量係数",        note:"〜10kg:×1.0, 〜30kg:×1.6, 30kg超:×2.5", val:"¥3,840", c:C.accent1 },
    { label:"③ 速度オプション",  note:"翌日:×1.0, 当日:×2.2, 即時:×3.8", val:"¥8,448", c:C.accent2 },
    { label:"④ 季節係数",        note:"お中元期:×1.15, お歳暮期:×1.20", val:"¥9,715", c:C.accent2 },
    { label:"⑤ 付帯サービス加算",note:"+冷凍¥500+時間指定¥300+代引¥200", val:"¥10,715", c:C.accent4 },
    { label:"⑥ 会員割引",        note:"プレミアム会員 ▲10%",  val:"¥9,644", c:C.accent3 },
    { label:"⑦ 最終料金",        note:"10円切り上げ＋税",     val:"¥10,610", c:C.accent2 },
  ];

  logi_steps.forEach((st, i) => {
    const y = 1.52 + i * 0.51;
    s.addShape(pres.shapes.RECTANGLE, { x:0.25,y,w:4.6,h:0.43, fill:{color:C.bg_mid}, line:{color:st.c, pt:0.9} });
    s.addShape(pres.shapes.RECTANGLE, { x:0.25,y,w:0.06,h:0.43, fill:{color:st.c}, line:{color:st.c} });
    s.addText(st.label, { x:0.38,y:y+0.03, w:2.5,h:0.2, fontFace:FONT_H, fontSize:10.5, bold:true, color:C.text_w, margin:0 });
    s.addText(st.note, { x:0.38,y:y+0.22, w:2.6,h:0.18, fontFace:FONT_B, fontSize:8.5, color:C.text_dim, margin:0 });
    s.addText(st.val, { x:3.1,y:y+0.04, w:1.65,h:0.34, fontFace:FONT_M, fontSize:11, bold:true, color:st.c, align:"right", valign:"middle", margin:0 });
    if(i<logi_steps.length-1) s.addShape(pres.shapes.LINE, { x:0.5,y:y+0.43, w:0,h:0.08, line:{color:C.border, width:1} });
  });

  // 右: コード実装例
  s.addShape(pres.shapes.RECTANGLE, { x:5.05,y:1.52, w:4.7,h:0.3, fill:{color:"1D6A4A"}, line:{color:C.accent3} });
  s.addText("✅  Pythonコード（抜粋）", { x:5.1,y:1.52, w:4.6,h:0.3, fontFace:FONT_B, fontSize:11, bold:true, color:C.text_w, valign:"middle", margin:0 });

  codeBox(s, 5.05,1.84, 4.7,3.48,
`WEIGHT_MULT = {
  "light":  1.0,  # 〜10kg
  "medium": 1.6,  # 〜30kg
  "heavy":  2.5,  # 30kg超
}
SPEED_MULT = {
  "standard": 1.0, # 翌日
  "express":  2.2, # 当日
  "instant":  3.8, # 即時
}
SEASON_MULT = {
  "normal":  1.00,
  "ochugen": 1.15, # お中元
  "oseibo":  1.20, # お歳暮
}
def calc_logistics(req):
    fee = BASE_DIST[req.zone]         # S1
    fee *= WEIGHT_MULT[req.weight]    # S2
    fee *= SPEED_MULT[req.speed]      # S3
    fee *= SEASON_MULT[req.season]    # S4
    fee += sum(req.options.values())  # S5
    fee *= (1 - member_discount(req)) # S6
    return round_up(fee * 1.10)       # S7`);

  s.addShape(pres.shapes.RECTANGLE, { x:0.25,y:5.27, w:9.5,h:0.27, fill:{color:C.bg_mid}, line:{color:C.border} });
  s.addText("パイプラインの各ステップを差し替えるだけで運賃改定・新サービス追加・キャンペーン割引に即対応", {
    x:0.4,y:5.27, w:9.2,h:0.27, fontFace:FONT_B, fontSize:11, color:C.accent3, valign:"middle", margin:0
  });
}

// ============================================================
// スライド 8: アーキテクチャ概要
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "07  |  エンジン設計 — 11段階の料金算出パイプライン全体像", C.accent1);

  const steps = [
    { n:"1",  label:"基本料金",      sub:"申請種別×申請者区分\n18パターンのテーブル",  c:C.accent1 },
    { n:"2",  label:"地域係数",      sub:"×0.85〜×1.30\n4段階テーブル",             c:C.accent1 },
    { n:"3",  label:"優先度係数",    sub:"×1.00〜×2.20\n3段階テーブル",             c:C.accent2 },
    { n:"4",  label:"複雑度係数",    sub:"×0.80〜×2.10\n4段階テーブル",             c:C.accent2 },
    { n:"5",  label:"事業規模係数",  sub:"×0.75〜×1.65\n法人のみ適用",              c:C.accent2 },
    { n:"6",  label:"季節係数",      sub:"繁忙期×1.20\n閑散期×0.95",               c:C.accent3 },
    { n:"7",  label:"追加料金加算",  sub:"法務/翻訳/環境etc.\n各フラグ独立加算",     c:C.accent4 },
    { n:"8",  label:"書類超過料金",  sub:"3段階の超過テーブル\n枚数連動",            c:C.accent4 },
    { n:"9",  label:"補正回数加算",  sub:"段階課金\n1回¥15k→+¥10k/回",            c:C.accent4 },
    { n:"10", label:"リピーター割引",sub:"過去件数連動\n▲5〜20%上限",              c:C.accent3 },
    { n:"11", label:"最終確定",      sub:"パッケージ割引▲8〜20%\n100円切上+消費税", c:C.accent2 },
  ];

  const row1 = steps.slice(0,6);
  const row2 = steps.slice(6);

  [row1,row2].forEach((row,ri) => {
    const y = 1.3 + ri * 1.9;
    const bw = ri===0 ? 1.38 : 1.68;
    const gap = ri===0 ? 0.12 : 0.15;
    const sx = 0.3;
    row.forEach((st,i) => {
      const x = sx + i*(bw+gap);
      s.addShape(pres.shapes.RECTANGLE, { x,y,w:bw,h:1.6, fill:{color:C.bg_mid}, line:{color:st.c, pt:1.2} });
      s.addShape(pres.shapes.RECTANGLE, { x,y,w:bw,h:0.07, fill:{color:st.c}, line:{color:st.c} });
      s.addText(`STEP ${st.n}`, { x:x+0.04,y:y+0.1,w:bw-0.08,h:0.28, fontFace:FONT_B, fontSize:8, bold:true, color:st.c, align:"center", margin:0 });
      s.addText(st.label, { x:x+0.04,y:y+0.4,w:bw-0.08,h:0.55, fontFace:FONT_H, fontSize:ri===0?10.5:12, bold:true, color:C.text_w, align:"center", valign:"middle", margin:0 });
      s.addText(st.sub, { x:x+0.04,y:y+0.98,w:bw-0.08,h:0.56, fontFace:FONT_B, fontSize:8.5, color:C.text_dim, align:"center", valign:"middle", margin:0 });
      if(i<row.length-1) s.addShape(pres.shapes.LINE, { x:x+bw,y:y+0.75, w:gap,h:0, line:{color:C.border, width:1.5} });
    });
    s.addText(ri===0?"▶ 係数の多段階乗算（順序が結果に影響）":"▶ 加算・割引・最終確定", {
      x:0.3,y:y+1.67,w:5,h:0.2, fontFace:FONT_B, fontSize:9, color:C.text_dim, italic:true
    });
  });
}

// ============================================================
// スライド 9: 10変数マトリックス全体像
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "08  |  料金算出マトリックス — 10変数の全体像", C.accent1);

  const variables = [
    { axis:"申請種別",       values:"A建設工事 / B営業許可 / C補助金 / D輸出入 / E宅建 / F産廃",            tag:"6種",  c:C.accent1 },
    { axis:"申請者区分",     values:"個人 / 法人 / 行政機関",                                               tag:"3区分", c:C.accent1 },
    { axis:"地域区分",       values:"特別区(×1.30) / 政令市(×1.15) / 都道府県(×1.00) / 過疎(×0.85)",       tag:"4段階", c:C.accent2 },
    { axis:"処理優先度",     values:"標準(×1.00) / 急ぎ(×1.50) / 最急(×2.20)",                             tag:"3段階", c:C.accent2 },
    { axis:"申請複雑度",     values:"簡易(×0.80) / 中程度(×1.00) / 複雑(×1.45) / 超複雑(×2.10)",           tag:"4段階", c:C.accent2 },
    { axis:"事業規模",       values:"零細(×0.75) / 中小(×1.00) / 中規模(×1.30) / 大企業(×1.65)（法人のみ）", tag:"4段階", c:C.accent2 },
    { axis:"季節・繁忙期",   values:"2〜3月(×1.20) / 4月(×1.10) / 12月(×1.05) / 8月(×0.95) / 他(×1.00)",   tag:"動的",  c:C.accent3 },
    { axis:"追加料金フラグ", values:"法務確認+5万 / 翻訳¥3k/枚 / 複数県+4万 / 環境評価+10万 / 共同申請+3万",  tag:"5フラグ",c:C.accent4 },
    { axis:"補正対応",       values:"1回目¥15,000 → 2回目以降+¥10,000/回（段階課金）",                      tag:"段階",  c:C.accent4 },
    { axis:"割引制度",       values:"リピーター▲5〜20% × パッケージ▲8〜20%（複合適用・順序制御）",           tag:"控除",  c:C.accent3 },
  ];

  variables.forEach((v, i) => {
    const col = i%2, row = Math.floor(i/2);
    const x = 0.28+col*4.87, y = 1.18+row*0.78;
    s.addShape(pres.shapes.RECTANGLE, { x,y,w:4.62,h:0.7, fill:{color:C.bg_mid}, line:{color:C.border, pt:0.7} });
    s.addShape(pres.shapes.RECTANGLE, { x,y,w:0.07,h:0.7, fill:{color:v.c}, line:{color:v.c} });
    s.addText(v.axis, { x:x+0.13,y:y+0.04,w:2.3,h:0.3, fontFace:FONT_H, fontSize:11.5, bold:true, color:C.text_w, margin:0 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:x+2.5,y:y+0.07,w:0.7,h:0.2, fill:{color:"1E3A5F"}, line:{color:v.c, pt:0.8}, rectRadius:0.03 });
    s.addText(v.tag, { x:x+2.5,y:y+0.07,w:0.7,h:0.2, fontFace:FONT_B, fontSize:8, bold:true, color:v.c, align:"center", valign:"middle", margin:0 });
    s.addText(v.values, { x:x+0.13,y:y+0.34,w:4.42,h:0.3, fontFace:FONT_B, fontSize:9.5, color:C.text_dim, margin:0, valign:"top" });
  });
}

// ============================================================
// スライド 10: 5種申請の比較表
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "09  |  5種の申請で実際に算出した料金比較", C.accent2);

  const headerRow = [
    { text:"申請ID",         options:{bold:true,color:C.text_w,fill:{color:"0F2A4A"},align:"center"} },
    { text:"申請種別",        options:{bold:true,color:C.text_w,fill:{color:"0F2A4A"}} },
    { text:"区分",            options:{bold:true,color:C.text_w,fill:{color:"0F2A4A"},align:"center"} },
    { text:"地域",            options:{bold:true,color:C.text_w,fill:{color:"0F2A4A"},align:"center"} },
    { text:"優先度",          options:{bold:true,color:C.text_w,fill:{color:"0F2A4A"},align:"center"} },
    { text:"複雑度",          options:{bold:true,color:C.text_w,fill:{color:"0F2A4A"},align:"center"} },
    { text:"最終料金（税込）", options:{bold:true,color:C.accent2,fill:{color:"0F2A4A"},align:"center"} },
  ];

  const dataRows = [
    ["APP-001","B: 営業許可","個人","都道府県","通常","簡易","¥44,000"],
    ["APP-004","D: 輸出入許可","法人(中小)","政令市","最急","中程度","¥439,670"],
    ["APP-002","A: 建設工事許可","法人(大企業)","特別区","急ぎ","複雑","¥890,010"],
    ["APP-005","C: 補助金申請","行政機関","特別区","通常","中程度","¥27,060"],
    ["APP-003","F: 産廃処理業","法人(中規模)","政令市","通常","超複雑","¥1,098,900"],
  ];

  const rows = [headerRow];
  dataRows.forEach((row,i) => {
    const bg = i%2===0 ? C.bg_mid : C.bg_card;
    const fc = i%2===0 ? "1E3A5F" : "142E4D";
    rows.push(row.map((cell,j) => ({
      text: cell,
      options: {
        color: j===6?C.accent2:(j===0?C.accent1:C.text_w),
        fill: {color: j===6?fc:bg},
        bold: j===0||j===6,
        align: j===0||j>=2?"center":"left",
        fontSize: j===6?12:11,
      }
    })));
  });

  s.addTable(rows, {
    x:0.25,y:1.18,w:9.5,
    colW:[0.88,2.02,1.02,0.92,0.82,0.82,1.62],
    border:{pt:0.5,color:C.border}, fontFace:FONT_B, rowH:0.48
  });

  // 最安・最高の倍率強調
  s.addShape(pres.shapes.RECTANGLE, { x:0.25,y:3.75, w:9.5,h:0.55, fill:{color:C.bg_mid}, line:{color:C.border} });
  s.addText("最安値 ¥27,060 vs 最高値 ¥1,098,900 — 同じエンジンで40倍の料金差を正確に算出", {
    x:0.4,y:3.75, w:9.2,h:0.55, fontFace:FONT_H, fontSize:13, bold:true, color:C.accent2, align:"center", valign:"middle"
  });

  s.addText("※ APP-003: パッケージ割引(8%)・法務確認・環境影響評価・補正2回・書類75枚を含む最大複雑ケース", {
    x:0.25,y:4.38,w:9.5,h:0.25, fontFace:FONT_B, fontSize:9.5, color:C.text_dim, italic:true
  });
  s.addText("※ APP-004: APP-003との同時申請によるパッケージ割引(8%)・リピーター割引(10%)・翻訳料(28ページ)を含む", {
    x:0.25,y:4.65,w:9.5,h:0.25, fontFace:FONT_B, fontSize:9.5, color:C.text_dim, italic:true
  });
  s.addText("※ APP-005: 行政機関優遇（規模係数MICRO固定）+ 閑散期係数(×0.95)により最低水準", {
    x:0.25,y:4.92,w:9.5,h:0.25, fontFace:FONT_B, fontSize:9.5, color:C.text_dim, italic:true
  });
}

// ============================================================
// スライド 11: 最大複雑ケース内訳
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "10  |  最大複雑ケース詳細（APP-003：産廃処理業 ¥220,000 → ¥1,098,900）", C.accent4);

  const stages = [
    { label:"① 基本料金",          amount:"¥220,000",    note:"産廃処理業 × 法人 = テーブル参照1回",      c:C.accent1, bar:2.0 },
    { label:"② ×地域係数(1.15)",  amount:"¥252,999",    note:"政令指定都市",                            c:C.accent1, bar:2.3 },
    { label:"③ ×複雑度係数(2.10)", amount:"¥531,297",    note:"超複雑（書類75枚・添付35点）",            c:C.accent2, bar:4.8 },
    { label:"④ ×規模係数(1.30)",  amount:"¥690,686",    note:"中規模企業",                              c:C.accent2, bar:6.3 },
    { label:"⑤ ×季節係数(1.20)",  amount:"¥828,823",    note:"年度末（2月提出）",                       c:C.accent2, bar:7.5 },
    { label:"⑥ +追加料金加算",     amount:"¥1,085,823",  note:"+法務¥5万+環境¥10万+共同¥3万+補正2回¥2.5万+書類超過¥5.2万",  c:C.accent4, bar:9.0 },
    { label:"⑦ −パッケージ割引8%", amount:"¥  999,000",  note:"APP-004と同時申請（▲¥86,865）",          c:C.accent3, bar:8.1 },
  ];

  const maxBar = 9.2;
  stages.forEach((st,i) => {
    const y = 1.2 + i * 0.53;
    s.addText(st.label, { x:0.25,y:y+0.02,w:2.65,h:0.38, fontFace:FONT_B, fontSize:10.5, bold:true, color:C.text_w, valign:"middle", margin:0 });
    s.addShape(pres.shapes.RECTANGLE, { x:2.95,y:y+0.05,w:4.5,h:0.29, fill:{color:C.border}, line:{color:C.border} });
    const bw = (st.bar/maxBar)*4.5;
    s.addShape(pres.shapes.RECTANGLE, { x:2.95,y:y+0.05,w:bw,h:0.29, fill:{color:st.c}, line:{color:st.c} });
    s.addText(st.amount, { x:7.52,y:y+0.02,w:1.55,h:0.38, fontFace:FONT_M, fontSize:10.5, bold:true, color:st.c, align:"right", valign:"middle", margin:0 });
    s.addText(st.note, { x:2.95,y:y+0.34,w:5.5,h:0.17, fontFace:FONT_B, fontSize:8.5, color:C.text_dim, margin:0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x:0.25,y:4.92,w:9.5,h:0.42, fill:{color:C.bg_card}, line:{color:C.accent2, pt:1.5} });
  s.addText("最終料金（税込）: ¥1,098,900　（税別¥999,000 × 1.10）", {
    x:0.4,y:4.92,w:9.2,h:0.42, fontFace:FONT_H, fontSize:17, bold:true, color:C.accent2, valign:"middle", margin:0
  });
}

// ============================================================
// スライド 12: コード品質・設計原則
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  titleBar(s, "11  |  実装品質 — 型安全・DRY・監査証跡・テーブル駆動", C.accent3);

  const principles = [
    { title:"型安全・列挙型", icon:"🔒",
      body:"Enum + dataclassで\n無効値を型レベルで排除。\n文字列ミスでは動かず\nIDEの補完が効く。",            c:C.accent1 },
    { title:"テーブル駆動設計", icon:"📊",
      body:"係数・料金は全て辞書で\n外部定義。if-elseゼロ。\n変更はテーブル編集のみ\nでコード変更不要。",       c:C.accent2 },
    { title:"単一責任関数", icon:"♻️",
      body:"document_surcharge()等\n単機能の純粋関数に分割。\n各Stepを独立テスト・\n個別置き換え可能。",       c:C.accent3 },
    { title:"監査証跡・明細", icon:"📝",
      body:"FeeBreakdown dataclassで\n全ステップの中間値保持。\n「なぜその金額か」を\n完全に追跡・説明可能。",   c:C.accent4 },
  ];

  principles.forEach((p, i) => {
    const x = 0.28 + i * 2.37;
    card(s, x, 1.2, 2.2, 4.0, p.c);
    s.addText(p.icon, { x:x+0.05,y:1.25, w:2.1,h:0.55, fontFace:FONT_B, fontSize:26, align:"center", margin:0 });
    s.addText(p.title, { x:x+0.06,y:1.82, w:2.08,h:0.52, fontFace:FONT_H, fontSize:12, bold:true, color:p.c, align:"center", margin:0 });
    s.addShape(pres.shapes.LINE, { x:x+0.15,y:2.36, w:1.9,h:0, line:{color:C.border, width:0.5} });
    s.addText(p.body, { x:x+0.1,y:2.42, w:2.0,h:2.65, fontFace:FONT_B, fontSize:10.5, color:C.text_dim, align:"center", valign:"top", margin:0 });
  });
}

// ============================================================
// スライド 13: まとめ & 応用可能性
// ============================================================
{
  const s = pres.addSlide({ masterName:"MASTER" });
  s.background = { color: C.bg_dark };

  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.88, fill:{color:C.bg_mid}, line:{color:C.bg_mid} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:0.12,h:0.88, fill:{color:C.accent3}, line:{color:C.accent3} });
  s.addText("SUMMARY  |  まとめと応用可能性", { x:0.25,y:0.17,w:9.4,h:0.52, fontFace:FONT_H, fontSize:18, bold:true, color:C.text_w, charSpacing:2, valign:"middle", margin:0 });

  s.addText("複雑な事務処理ロジックを体系的にプログラム化できます", {
    x:0.4,y:0.98, w:9.2,h:0.65, fontFace:FONT_H, fontSize:26, bold:true, color:C.text_w
  });

  // 3つのキー数字
  const kps = [
    { n:"1.77億", sub:"通りの条件組み合わせ", c:C.accent4 },
    { n:"58",     sub:"ルール（600行）で完全対応", c:C.accent2 },
    { n:"313",    sub:"倍の料金差を正確に算出", c:C.accent3 },
  ];
  kps.forEach((kp,i) => {
    const x = 0.3 + i*3.18;
    s.addShape(pres.shapes.RECTANGLE, { x,y:1.72, w:3.0,h:1.1, fill:{color:C.bg_mid}, line:{color:kp.c, pt:1.5} });
    s.addShape(pres.shapes.RECTANGLE, { x,y:1.72, w:3.0,h:0.07, fill:{color:kp.c}, line:{color:kp.c} });
    s.addText(kp.n, { x:x+0.08,y:1.78, w:1.1,h:0.72, fontFace:FONT_H, fontSize:30, bold:true, color:kp.c, align:"center", valign:"middle", margin:0 });
    s.addText(kp.sub, { x:x+1.22,y:1.82, w:1.68,h:0.7, fontFace:FONT_B, fontSize:10.5, color:C.text_dim, valign:"middle", margin:0 });
  });

  // 横展開リスト（2列）
  s.addText("同じ設計パターンで即対応できる業務例:", { x:0.3,y:2.92, w:9,h:0.3, fontFace:FONT_H, fontSize:12, bold:true, color:C.accent1 });
  const apps1 = ["保険料率算定（年齢×病歴×プラン×年数）", "税務申告の複雑度別受付料金", "建設積算・見積書自動生成", "不動産仲介手数料多条件計算"];
  const apps2 = ["医療費自己負担額算出（高額療養費含む）", "物流料金（距離×重量×速度×季節）", "補助金採択確率スコアリング", "各種許認可の審査期間予測"];
  const listOpts = (j) => ({ bullet:true, breakLine:j<3, fontSize:11, color:C.text_dim, paraSpaceAfter:4 });
  s.addText(apps1.map((t,j)=>({text:t,options:listOpts(j)})), { x:0.3,y:3.24, w:4.6,h:1.8, fontFace:FONT_B });
  s.addText(apps2.map((t,j)=>({text:t,options:listOpts(j)})), { x:5.1,y:3.24, w:4.6,h:1.8, fontFace:FONT_B });

  // CTAバッジ
  const ctas = [["✅  Python実装済み・即デモ可","1D6A4A"],["✅  他業務への横展開可能","0369A1"],["✅  API/DB/ML連携に拡張可能","7C2D12"]];
  ctas.forEach(([t,c],i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:0.3+i*3.2,y:5.08, w:3.0,h:0.32, fill:{color:c}, line:{color:c}, rectRadius:0.05 });
    s.addText(t, { x:0.3+i*3.2,y:5.08, w:3.0,h:0.32, fontFace:FONT_B, fontSize:10, bold:true, color:C.text_w, align:"center", valign:"middle", margin:0 });
  });
}

// ============================================================
// 出力
// ============================================================
pres.writeFile({ fileName: "/tmp/fee_matrix/fee_matrix_presentation.pptx" })
  .then(() => console.log("DONE:/tmp/fee_matrix/fee_matrix_presentation.pptx"))
  .catch(err => { console.error("ERROR:", err); process.exit(1); });
