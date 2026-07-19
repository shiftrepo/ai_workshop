# DEMO_FLOW.md — Issue #22 E2Eデモ シナリオ

**目的**: SPEC.md で定義した全体設計を、**時系列コマンド列**と**Excel1行の状態変化**として見通せるようにする。運営がリハーサルする時のスクリプトを兼ねる。

**前提**: このドキュメントは実行可能な脚本ではなく、動作イメージ。実装フェーズで確定させる。

---

## 0. 事前準備 (デモ開始10分前)

demo-app は EC2 ホスト上で直接 Node プロセスとして動かす (Docker コンテナ内では動かさない)。
demo-app のログファイル (`demo-app/logs/`) だけを Docker `log-server1` に bind mount し、
既存の SSH 経路 (log-collector-skill) をそのまま使う。

```bash
cd projects/log_collector

# SSH 3サーバ起動 (log-server1にdemo-app/logsがbind mount済み)
(cd dev-environment/docker && ./setup-containers.sh rebuild)

# 一発起動 (Excel/ログのリセット + demo-app/watchdog/web-ui を全て起動)
cd auto-repair-demo/orchestrator
./run-demo.sh
```

**この時点のExcel** (ヘッダのみ、行はまだ無い):

```
| ID  | TrackID | Time | 概要 | 担当 | ステータス | 調査状況 | 収集ログ | 解析 | 改修案 | 承認者 | PR | 更新 |
|-----|---------|------|------|------|-----------|----------|----------|------|--------|--------|----|----- |
| (行なし)                                                                                                     |
```

---

## 1. Step1-2: バグ入りWebアプリを触る (0〜30秒)

**演者操作**: ブラウザで `http://localhost:3002` (外部ポート8888) を開き、在庫切れ商品 "WalkyDog Mk2 (RBT-DOG-02)" の詳細ページを開く。

**内部の動き**:
```
GET /api/robots/RBT-DOG-02
 └─ src/routes/products.js#router.get('/:sku')
    └─ stock===0 かつ bug-switch PRODUCT_STOCK_ZERO_NPE=true の分岐
       └─ robot.out_of_stock_alternatives (未定義フィールド) を .map() で TypeError
```

**demo-app/logs/app.log と logs/service.log に出るログ** (同じTrackIDで両方に記録される):
```
2026-07-19T13:00:00.123Z INFO  TrackID:ABC1234 [/api/robots/RBT-DOG-02] method=GET
2026-07-19T13:00:00.128Z ERROR TrackID:ABC1234 [/api/robots/RBT-DOG-02] method=GET status=500 \
  err=TypeError: Cannot read properties of undefined (reading 'map') \
  at=at /path/to/demo-app/src/routes/products.js:37:33
```
```
2026-07-19T13:00:00.124Z INFO  TrackID:ABC1234 [/api/robots/RBT-DOG-02] method=GET service=inventory-service action=get_related_products sku=RBT-DOG-02
2026-07-19T13:00:00.128Z ERROR TrackID:ABC1234 [/api/robots/RBT-DOG-02] method=GET service=inventory-service status=500 err=TypeError: ...
```

**画面表示**: 500 エラー。演者は「あれ、バグですね」と言う。

---

## 2. Step3: watchdog がログ収集・概要生成をしてからインシデント起票 (数秒〜十数秒)

**watchdog.js** が `app.log` を tail していて `ERROR` を検知。この時点では**まだExcelに何も書かれない**。

内部で以下を順に実行する:
1. インシデントID (`INC001`) を採番し、TrackID `ABC1234` だけを含む一時Excelを作成
2. 既存の `log-collection-skill.js` をSSH収集のためspawn (`INPUT_FOLDER`=一時Excelのディレクトリ)。client(app.log)・service(service.log)両方からTrackID一致行を取得
3. 取得できたログを `log-summarizer` (LLM) に渡し、事象概要を生成
4. 一時Excelを削除

**ここまで完了した内容を持つ行が、初めてExcelに追加される** (この1行が状態機械の入口):
```
| ID     | TrackID | Time                | 概要(LLM要約済み)                  | 担当 | ステータス   | 収集ログ(H列)      |
|--------|---------|---------------------|-------------------------------------|------|-------------|--------------------|
| INC001 | ABC1234 | 2026-07-19 13:00:00 | GET /api/robots/RBT-DOG-02 で...TrackID:ABC1234で両ログが紐づく | AI  | ログ収集済み | [app.log (server1)] ... [service.log (server1)] ... |
```

**演者トーク**: 「監視ツールがログを収集し、AIが概要をまとめた上で自動起票しました。ステータスは"ログ収集済み"、確認待ちです。収集ログと概要を見て、続けて調査するか判断します」

★手動ゲート① — ここで状態機械は停止している (起票そのものが確認待ち)。演者が収集ログ(H列)・概要(D列)を確認してから、次の「▶ 調査＆改修案」ボタンで進める。

---

## 3. Step4-a: incident-analyzer が一次解析 (数十秒)

演者が `ログ収集済み` の行で **▶ 調査＆改修案** ボタンを押すと、Claude Code サブエージェント `incident-analyzer` が起動。

**エージェントが受け取る入力** (stdin JSON):
```json
{
  "id": "INC001",
  "trackId": "ABC1234",
  "summary": "GET /api/robots/RBT-DOG-02 へのリクエストで...TrackID:ABC1234で両ログが紐づく",
  "collected_logs": "[app.log (server1)] ...\n[service.log (server1)] ...",
  "app_source_root": "projects/log_collector/demo-app"
}
```

**エージェントの仕事**:
1. `collected_logs` (H列と同じ生ログ本文) からスタックトレース `src/routes/products.js:37:33` を確認
2. `demo-app/src/routes/products.js` を読む → 該当行のコード確認
3. 症状/原因仮説/影響範囲/再現手順を組み立て

**Excel I列に書き戻される内容** (人可読テキスト):
```
【症状】GET /api/robots/RBT-DOG-02 が HTTP 500 を返し、TypeError (undefined.map) が発生している (TrackID:ABC1234)
【原因仮説】(信頼度:高) src/routes/products.js の GET /:sku ハンドラで、stock===0 かつ
  bug-switch PRODUCT_STOCK_ZERO_NPE が有効な場合に robot.out_of_stock_alternatives
  (data/robots.json 上には存在しないフィールド) を参照し、続く .map() でTypeErrorとなる
【影響範囲】stock=0 の在庫切れ商品詳細ページ全て (現状 RBT-DOG-02)。一覧・カート・注文への波及なし
【再現手順】curl http://localhost:3002/api/robots/RBT-DOG-02
```

**ステータス**: `解析済み` に更新 (続けて repair-planner が自動実行され `要承認` まで進む)。

**演者トーク**: 「AIが一次解析しました。原因、影響範囲、再現手順まで書けています」

---

## 4. Step4-b: repair-planner が改修案作成 (数十秒)

**エージェントの仕事**:
1. I列の解析結果を受け取る
2. `demo-app/src/routes/products.js` を読む
3. 修正diff案 + テスト追加案を作成 (**まだコードは書き換えない**)

**Excel J列に書き戻される内容**:
```
【対象ファイル】demo-app/src/routes/products.js
【変更方針】
stock=0 の場合に存在しないフィールド out_of_stock_alternatives を参照している分岐を撤去し、
常に robot.related (無ければ空配列) を使うよう修正する。
--- a/src/routes/products.js
+++ b/src/routes/products.js
@@ -28,11 +28,7 @@
     logServiceCall(req, 'inventory-service', { action: 'get_related_products', sku: robot.sku });

-    let relatedList;
-    if (robot.stock === 0 && isEnabled('PRODUCT_STOCK_ZERO_NPE')) {
-      relatedList = robot.out_of_stock_alternatives;
-    } else {
-      relatedList = robot.related || [];
-    }
+    const relatedList = robot.related || [];

     const related = relatedList.map(sku => {

【追加テスト】
- test/routes/products.test.js
  - "stock=0 (RBT-DOG-02) でも200を返しrelated_productsが空または関連商品配列になる"
  - "stock>0の通常商品では既存通りrelated_productsが返る"

【ロールバック】
- git revert <commit>
【リスク】
- 既存の500を期待するクライアントがあれば影響
```

**ステータス**: `要承認` に更新。**ここで状態機械は自動遷移を止める**。

**演者トーク**: 「AIから改修案が上がりました。ここは人がレビューします」

---

## 5. Step5-a: 人が承認 (数分)

**演者操作**: Excel を開き、INC001 の行で
- K列 (承認者) に自分の名前を入れる
- F列 (ステータス) を `要承認` → `PR作成待ち` に手動変更

**保存**。excel-driver がポーリングで検知。

**演者トーク**: 「レビューOK。ステータスを"PR作成待ち"にして保存すると、次のエージェントが動きます」

---

## 6. Step5-b: pr-publisher がPR発行 (数分)

**エージェントの仕事** (順序厳守):

```bash
# 1. main から新規ブランチ
git fetch origin main
git checkout -b fix/inc001-abc1234 origin/main

# 2. J列の diff 案に従ってコード編集
#    (Edit ツールで src/routes/products.js を書き換え)

# 3. テスト追加
#    (Write ツールで test/routes/products.test.js を作成)

# 4. ローカル確認
cd demo-app && npm test
#    → 通ればOK、失敗すれば Draft PR で出す

# 5. コミット
git add demo-app/src/routes/products.js demo-app/test/routes/products.test.js
git commit -m "fix(demo-app): fix related_products TypeError for out-of-stock items (INC001, TrackID:ABC1234)"

# 6. プッシュ + PR作成
git push -u origin fix/inc001-abc1234
gh pr create \
  --title "fix(demo-app): fix related_products TypeError (INC001)" \
  --body-file .pr-body-inc001.md
```

**PR本文** (`.pr-body-inc001.md`) には Excelの I,J,K 列がそのまま貼られる:
```markdown
## 概要
Issue #22 デモにて `INC001` として起票された障害の改修。

## 一次解析 (AI: incident-analyzer)
【症状】…
【原因仮説】…

## 改修案 (AI: repair-planner)
【対象ファイル】…
【追加テスト】…

## 承認
- 承認者: (K列の値)
- 承認日時: 2026-07-17 13:07:22

🤖 Generated with Claude Code
```

**Excel L列に PR URL を書き戻し + ステータス `対応完了` に更新**:
```
| ID     | ステータス | PR URL                                             | 更新 |
|--------|-----------|----------------------------------------------------|------|
| INC001 | 対応完了   | https://github.com/shiftrepo/ai_workshop/pull/999 | 2026-07-17 13:07:30 |
```

**演者トーク**: 「PRが自動発行されました。ExcelにURLも書き戻されています。以上でデモ終了です」

---

## 7. 時系列サマリ (Excel 1行の遷移)

```
時刻     ステータス           トリガー                      書き込む列
────────────────────────────────────────────────────────────────────────
13:00:00 (行が存在しない)     バグ発火 (watchdogが検知)       ―
13:00:00〜05 (Excel未書込)    watchdog: log_collector実行 +   ―  (起票前のログ収集・概要生成)
              log-summarizer実行 (数秒〜十数秒)
13:00:05 ログ収集済み         watchdog(収集済み内容で起票)   A,B,C,D,E,F,H  ★手動ゲート①(収集ログ・概要を見て続行判断)
─────  人が「▶調査＆改修案」ボタンを押す  ──────────────────────
13:00:20 解析済み             incident-analyzer              I,F,M
13:00:35 要承認               repair-planner                 J,F,M  ★手動ゲート②
─────  人が承認者記入+PR作成待ちに編集  ──────────────────────
13:02:00 PR作成待ち           人 (Excel編集)                 K,F
13:03:30 対応完了             pr-publisher                   L,F,M
```

**総所要時間**: 数分程度 (人手待ち含む)。デモ映え◯。

---

## 8. デモの復旧・再演

```bash
# Excel をリセット
cp auto-repair-demo/examples/incident_management_template.xlsx \
   auto-repair-demo/examples/incident_management.xlsx

# ログをリセット
: > demo-app/logs/app.log
: > demo-app/logs/service.log

# バグを別のもの (bug-config.json) に切り替え
$EDITOR demo-app/bug-config.json

# ブランチをクリーンアップ (発行済みPRを閉じる)
git branch -D fix/inc001-abc1234
gh pr close <PR番号> --delete-branch
```

---

## 9. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Anthropic API 応答が遅い/落ちる | エージェント段が固まる | 各エージェントに `timeoutMs` (demo-config.json) + Excelに "エラー" 書き戻し |
| AIが妙な改修案を出す | PR発行前で人が止めるので実害なし | 承認ゲート `要承認 → PR作成待ち` は必ず人手 |
| Docker SSH コンテナが落ちる/対象TrackIDのログが0件 | watchdogの起票前収集が失敗し、`collect_summary`にエラー内容、概要はwatchdogの機械生成フォールバックのまま起票される | `setup-containers.sh status` を run-demo.sh 冒頭で必ずcheck。起票後もH列を見れば収集失敗が分かる |
| Excelを演者が上書きロック | driverが書けない | `excel-io.js`/`watchdog.js`はそれぞれ`serialize()`で書き込みを直列化し、一時ファイル書き込み→rename方式で保存 |
| PR発行時にテスト失敗 | 中途半端なPRが出る | Draft で出す + Excelに "テスト失敗" 明記 |
| デモ用ブランチが main を汚染 | 事故 | pr-publisher は `main` に push しない (ブランチのみ) |

---

## 10. 未実装だが望ましい拡張

- **Slack通知**: 各ステータス遷移時に Slack Webhookで演者スマホに通知 → 演者が場をつなぎやすい
- **ダッシュボード**: `http://localhost:3001/dashboard` でExcelの状態遷移をリアルタイム可視化
- **複数インシデント同時処理**: 現状 orchestrator は1行ずつ直列。並列化はデモ後のスコープ

以上。Phase 0 (設計) 完了。
