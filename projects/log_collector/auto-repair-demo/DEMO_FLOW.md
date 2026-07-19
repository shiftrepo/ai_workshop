# DEMO_FLOW.md — Issue #22 E2Eデモ シナリオ

**目的**: SPEC.md で定義した全体設計を、**時系列コマンド列**と**Excel1行の状態変化**として見通せるようにする。運営がリハーサルする時のスクリプトを兼ねる。

**前提**: このドキュメントは実行可能な脚本ではなく、動作イメージ。実装フェーズで確定させる。

---

## 0. 事前準備 (デモ開始10分前)

```bash
cd projects/log_collector

# SSH 3サーバ起動
(cd dev-environment/docker && ./setup-containers.sh rebuild)

# demo-app を server1 コンテナに配置 + 起動
# (デモ側 orchestrator が自動でやる想定だが、手動確認する時)
docker exec log-server1-issue15 sh -c "cd /opt/demo-app && node server.js &"

# Excel雛形をコピー
cp auto-repair-demo/examples/incident_management_template.xlsx \
   auto-repair-demo/examples/incident_management.xlsx
```

**この時点のExcel** (空):

```
| ID  | TrackID | Time | 概要 | 担当 | ステータス | 調査状況 | ログ | 解析 | 改修案 | 承認者 | PR | 更新 |
|-----|---------|------|------|------|-----------|----------|------|------|--------|--------|----|----- |
| (空)                                                                                                |
```

---

## 1. Step1-2: バグ入りWebアプリを触る (0〜30秒)

**演者操作**: ブラウザで `http://localhost:3000` を開き、"ノート#2 を表示" を押す。

**内部の動き**:
```
GET /api/notes/2
 └─ src/routes/notes.js#getNote
    └─ 偶数IDのため bug-config.GET_NOTE_NPE 分岐
       └─ note.title.toUpperCase() で TypeError
```

**demo-app/logs/app.log に出るログ**:
```
2026-07-17T13:00:00.123Z INFO  TrackID:NOTE00002 [/api/notes/2] method=GET
2026-07-17T13:00:00.128Z ERROR TrackID:NOTE00002 [/api/notes/2] status=500 \
  err=TypeError: Cannot read properties of undefined (reading 'toUpperCase') \
  at getNote (src/routes/notes.js:42:24)
```

**画面表示**: 500 エラー。演者は「あれ、バグですね」と言う。

---

## 2. Step3 前段: watchdog がインシデント起票 (30秒〜1分)

**watchdog.js** が `app.log` を tail していて `ERROR` を検知。

**Excel が書かれる** (この1行が状態機械の入口):
```
| ID     | TrackID   | Time                | 概要                              | 担当 | ステータス | ... |
|--------|-----------|---------------------|-----------------------------------|------|-----------|-----|
| INC001 | NOTE00002 | 2026-07-17 13:00:00 | GET /api/notes/2 で 500 TrackID:NOTE00002 TypeError | AI  | インシデント検出 |     |
```

**演者トーク**: 「監視ツールが自動でインシデント起票しました。ステータスは"インシデント検出"、確認待ちです」

---

## 3. Step3: 演者が「▶調査＆改修案」を押す → log_collector が該当ログを引く (1〜2分)

`インシデント検出` の行で演者が **▶ 調査＆改修案** ボタンを押す → 最初に既存 log_collector が起動。

```bash
# excel-driver が実行するイメージ
node log-collector-skill/scripts/log-collection-skill.js
  # INPUT_FOLDER=auto-repair-demo/examples
  # OUTPUT_FOLDER=auto-repair-demo/output
  # FILTER_STATUS=インシデント検出
```

log_collector が:
- Excel の "インシデント検出" 行を読む
- インシデント概要から `TrackID:NOTE00002` を抽出
- SSHで3サーバをgrep
- 結果Excelを `output/log-collection-result_2026-07-17_13-01-30.xlsx` に出力

**excel-driver が INC001 に書き戻す**:
```
| ID     | ステータス | 調査状況              | 収集ログサマリ                            | 更新           |
|--------|-----------|----------------------|-------------------------------------------|----------------|
| INC001 | ログ収集済み | ログ12件収集   | log-collection-result_..._13-01-30.xlsx  | 2026-07-17 13:01:35 |
```

**演者トーク**: 「既存のlog_collectorスキルがログを引いてExcelに添付、ステータスを"ログ収集済み"に進めました。続けて解析へ」

---

## 4. Step4-a: incident-analyzer が一次解析 (2〜3分)

log_collector 完了後、続けて Claude Code サブエージェント `incident-analyzer` が自動起動 (「▶調査＆改修案」ボタンの連続実行の一部)。

**エージェントが受け取る入力** (row.json):
```json
{
  "id": "INC001",
  "summary": "GET /api/notes/2 で 500 TrackID:NOTE00002 TypeError",
  "collected_logs_file": "auto-repair-demo/output/log-collection-result_2026-07-17_13-01-30.xlsx",
  "app_source_root": "projects/log_collector/demo-app/"
}
```

**エージェントの仕事**:
1. `collected_logs_file` を読む → スタックトレース `src/routes/notes.js:42:24` を抽出
2. `demo-app/src/routes/notes.js` を読む → 42行目のコード確認
3. 症状/原因/影響範囲を組み立て

**Excel I列に書き戻される内容** (人可読 + JSON):
```
【症状】GET /api/notes/:id で id が偶数のとき HTTP 500 (TypeError)
【原因仮説】(信頼度: 高)
  - src/routes/notes.js:42 で note.title.toUpperCase() を呼んでいるが、
    偶数IDの分岐で note が undefined になっている
【影響範囲】
  - エンドポイント: GET /api/notes/:id (id が偶数の全リクエスト)
  - 他エンドポイント(POST/GET一覧)には影響なし
【再現手順】
  curl http://localhost:3000/api/notes/2   # 期待:200, 実際:500
```

**ステータス**: `解析済み` に更新 (続けて repair-planner が自動実行され `要承認` まで進む)。

**演者トーク**: 「AIが一次解析しました。原因、影響範囲、再現手順まで書けています」

---

## 5. Step4-b: repair-planner が改修案作成 (3〜5分)

**エージェントの仕事**:
1. I列の解析結果を受け取る
2. `demo-app/src/routes/notes.js` を読む
3. 修正diff案 + テスト追加案を作成 (**まだコードは書き換えない**)

**Excel J列に書き戻される内容**:
```
【対象ファイル】demo-app/src/routes/notes.js
【変更方針】
--- a/src/routes/notes.js
+++ b/src/routes/notes.js
@@ -38,7 +38,10 @@
   const note = notes.find(n => n.id === Number(req.params.id));
-  return res.json({ ...note, title: note.title.toUpperCase() });
+  if (!note) {
+    return res.status(404).json({ error: 'note not found' });
+  }
+  return res.json({ ...note, title: note.title.toUpperCase() });

【追加テスト】
- test/routes/notes.test.js
  - "returns 404 when note id does not exist" (偶数IDカバー)
  - "returns 200 with uppercased title for existing note"

【ロールバック】
- git revert <commit>
【リスク】
- 既存の 500 を期待するクライアントがあれば影響
```

**ステータス**: `要承認` に更新。**ここで状態機械は自動遷移を止める**。

**演者トーク**: 「AIから改修案が上がりました。ここは人がレビューします」

---

## 6. Step5-a: 人が承認 (5〜7分)

**演者操作**: Excel を開き、INC001 の行で
- K列 (承認者) に自分の名前を入れる
- F列 (ステータス) を `要承認` → `PR作成待ち` に手動変更

**保存**。excel-driver がポーリングで検知。

**演者トーク**: 「レビューOK。ステータスを"PR作成待ち"にして保存すると、次のエージェントが動きます」

---

## 7. Step5-b: pr-publisher がPR発行 (7〜10分)

**エージェントの仕事** (順序厳守):

```bash
# 1. main から新規ブランチ
git fetch origin main
git checkout -b fix/inc001-notes-npe origin/main

# 2. J列の diff 案に従ってコード編集
#    (Edit ツールで src/routes/notes.js を書き換え)

# 3. テスト追加
#    (Write ツールで test/routes/notes.test.js を作成)

# 4. ローカル確認
cd demo-app && npm test
#    → 通ればOK、失敗すれば Draft PR で出す

# 5. コミット
git add demo-app/src/routes/notes.js demo-app/test/routes/notes.test.js
git commit -m "fix(demo-app): return 404 for missing note (INC001, TrackID:NOTE00002)"

# 6. プッシュ + PR作成
git push -u origin fix/inc001-notes-npe
gh pr create \
  --title "fix(demo-app): return 404 for missing note (INC001)" \
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

## 8. 時系列サマリ (Excel 1行の遷移)

```
時刻     ステータス           トリガー             書き込む列
──────────────────────────────────────────────────────────────────
13:00:00 (行が存在しない)     ―                    ―
13:00:05 インシデント検出     watchdog(起票)       A,B,C,D,E,F  ★手動ゲート①(確認待ち)
─────  人が「▶調査＆改修案」ボタンを押す  ──────────────────────
13:01:35 ログ収集済み         log_collector        G,H,M
13:02:50 解析済み             incident-analyzer    I,F,M
13:04:20 要承認               repair-planner       J,F,M  ★手動ゲート②
─────  人が承認者記入+PR作成待ちに編集  ──────────────────────
13:06:00 PR作成待ち           人 (Excel編集)       K,F
13:07:30 対応完了             pr-publisher         L,F,M
```

**総所要時間**: 約7〜8分 (人手待ち含む)。デモ映え◯。

---

## 9. デモの復旧・再演

```bash
# Excel をリセット
cp auto-repair-demo/examples/incident_management_template.xlsx \
   auto-repair-demo/examples/incident_management.xlsx

# バグを別のもの (bug-config.json) に切り替え
$EDITOR demo-app/bug-config.json

# ブランチをクリーンアップ (発行済みPRを閉じる)
git branch -D fix/inc001-notes-npe
gh pr close <PR番号> --delete-branch
```

---

## 10. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Anthropic API 応答が遅い/落ちる | エージェント段が固まる | 各エージェントに `--timeout 120s` + Excelに "エラー" 書き戻し |
| AIが妙な改修案を出す | PR発行前で人が止めるので実害なし | 承認ゲート `要承認 → PR作成待ち` は必ず人手 |
| Docker SSH コンテナが落ちる | log_collector が0件 | `setup-containers.sh status` を run-demo.sh 冒頭で必ずcheck |
| Excelを演者が上書きロック | driverが書けない | driverは書き込み前に `.xlsx` を排他コピーしてから open |
| PR発行時にテスト失敗 | 中途半端なPRが出る | Draft で出す + Excelに "テスト失敗" 明記 |
| デモ用ブランチが main を汚染 | 事故 | pr-publisher は `main` に push しない (ブランチのみ) |

---

## 11. 未実装だが望ましい拡張

- **Slack通知**: 各ステータス遷移時に Slack Webhookで演者スマホに通知 → 演者が場をつなぎやすい
- **ダッシュボード**: `http://localhost:3001/dashboard` でExcelの状態遷移をリアルタイム可視化
- **複数インシデント同時処理**: 現状 orchestrator は1行ずつ直列。並列化はデモ後のスコープ

以上。Phase 0 (設計) 完了。
