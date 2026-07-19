# ARCHITECTURE — 構成とデモの流れ

Issue #22 AI 自動改修デモを構成するサービスの関係性と、デモの一連の流れを図で示す。
詳細な設計は [SPEC.md](SPEC.md)、時系列の脚本は [DEMO_FLOW.md](DEMO_FLOW.md) を参照。

---

## 1. サービス構成図

デモは 4 つの実行コンポーネント + Excel 台帳 + 既存の SSH ログサーバで構成される。

```mermaid
graph TB
    subgraph browser["🌐 ブラウザ (Office不要)"]
        U1["RoboMart<br/>:3002 (HTTPS :8888)"]
        U2["Incident Console<br/>:4001 (HTTPS :8081)"]
    end

    subgraph host["EC2 ホスト (node プロセス群)"]
        APP["demo-app / server.js<br/>架空ECサイト RoboMart<br/>バグ2種入り"]
        LOG["demo-app/logs/<br/>app.log (client) + service.log<br/>同一TrackIDで両方に記録"]
        WD["watchdog.js<br/>ERROR検知→SSH収集+LLM概要生成<br/>→ 完了内容を持つ行としてExcel起票"]
        WEBUI["orchestrator/web-ui.js<br/>Excel閲覧+編集+状態機械操作"]
        DRIVER["orchestrator/lib/driver-core.js<br/>状態機械の実行エンジン<br/>(ログ収集済み以降を担当)"]
    end

    subgraph excel["📊 Excel 台帳 (唯一の真実)"]
        XLSX["incident_management.xlsx<br/>A〜M列 / ステータスで駆動<br/>起票時点でB,D,H列が記入済み"]
    end

    subgraph agents["🤖 Claude Code サブエージェント (.claude/agents)"]
        LS["log-summarizer<br/>起票前の概要生成 (watchdogから起動)"]
        IA["incident-analyzer<br/>一次解析"]
        RP["repair-planner<br/>改修案作成"]
        PP["pr-publisher<br/>PR発行"]
    end

    LCS["log-collection-skill.js<br/>SSHでログ収集 (watchdogから起動)"]

    subgraph docker["🐳 Docker: SSHログサーバ3台"]
        S1["log-server1 :5001<br/>/tmp/logs/demo-app/ にbind mount"]
        S2["log-server2 :5002"]
        S3["log-server3 :5003"]
    end

    GH["GitHub<br/>shiftrepo/ai_workshop"]

    U1 -->|操作でバグ発火| APP
    APP -->|JSON Lines追記| LOG
    LOG -.->|bind mount| S1
    WD -->|tail| LOG
    WD -->|子プロセス起動| LCS
    LCS -->|SSH grep| S1
    LCS -->|SSH grep| S2
    LCS -->|SSH grep| S3
    WD -->|claude --agent| LS
    WD -->|収集済み内容で新規行append| XLSX
    U2 <-->|閲覧/編集/ボタン| WEBUI
    WEBUI -->|状態遷移| DRIVER
    DRIVER -->|読み書き| XLSX
    DRIVER -->|claude --agent| IA
    DRIVER -->|claude --agent| RP
    DRIVER -->|claude --agent| PP
    PP -->|gh pr create| GH
```

**ポイント**:
- **Excel が唯一の真実**。全コンポーネントは Excel の「ステータス列」を介して協調する。
- **書き手は限定**: watchdog は SSHログ収集(log-collection-skill.js)とLLM概要生成(log-summarizer)を自ら完了させてから唯一の新規行追加を行う。driver (と各エージェント) はその行の以降のステータス遷移を担当。Web UI 経由の人手編集は driver 経由。
- **demo-app のログ**は `demo-app/logs/` (app.log=client, service.log=service の2ファイル) を Docker server1 の `/tmp/logs/demo-app/` に bind mount し、log-collection-skill.js が SSH 越しに grep する。呼び出し元は watchdog.js (driver-core.js からは呼ばれない)。

---

## 2. デモの流れ (状態遷移)

Excel の 1 行 (1 インシデント) が辿る状態遷移。**★ が手動ゲート** (人がボタンを押す/編集するまで進まない)。

```mermaid
stateDiagram-v2
    [*] --> ログ収集済み: watchdogがバグ発火を検知<br/>SSHログ収集+LLM概要生成を終えてから起票
    ログ収集済み --> 解析済み: ▶調査＆改修案①<br/>incident-analyzer 一次解析
    解析済み --> 要承認: repair-planner 改修案作成
    要承認 --> PR作成待ち: 人が承認者記入+ステータス編集②
    PR作成待ち --> 対応完了: pr-publisher PR自動発行
    対応完了 --> [*]

    note right of ログ収集済み
        ★手動ゲート①
        起票時点で既にログ収集(H列)・
        概要(D列)が揃っている。
        内容を見て続行するか判断
    end note
    note right of 要承認
        ★手動ゲート②
        改修案を確認してから承認
    end note
```

- **起票**: バグ発火をwatchdogが検知すると、Excelに書く前にSSHログ収集(log-collection-skill.js)とLLM概要生成(log-summarizer)を完了させ、その結果を持つ行を最初から `ログ収集済み` として追加する。空の行がまず現れてボタンで収集する、という順序ではない。
- **▶ 調査＆改修案 ボタン①**: `ログ収集済み` → `解析済み` → `要承認` を実行し、要承認で停止。
- **手動編集②**: 承認者を記入しステータスを `PR作成待ち` にすると、pr-publisher が自動発火して PR を発行 → `対応完了`。

---

## 3. デモのシーケンス (時系列)

```mermaid
sequenceDiagram
    actor 演者
    participant RM as RoboMart demo-app
    participant Log as app.log/service.log
    participant WD as watchdog
    participant LCS as log-collection-skill
    participant LS as log-summarizer
    participant Docker as SSHログサーバ
    participant XL as Excel台帳
    participant WUI as Incident Console
    participant DR as driver-core
    participant Agents as サブエージェント
    participant GH as GitHub

    演者->>RM: 在庫切れ商品を開く/請求書払いで注文
    RM->>Log: ERROR (TrackID付き) をapp.log/service.log両方に追記
    Log-->>Docker: bind mount で同期
    WD->>Log: tail で ERROR 検知
    WD->>LCS: 起票前にSSH収集を子プロセス起動 (一時ExcelでTrackID指定)
    LCS->>Docker: SSHでTrackID一致ログをgrep (client/service両方)
    WD->>LS: claude --agent でLLM概要生成を起動
    WD->>XL: 収集ログ(H列)+概要(D列)を持つ行を「ログ収集済み」で新規追加 ★停止
    演者->>WUI: 収集ログ・概要を確認し「▶調査＆改修案」クリック
    WUI->>DR: /api/advance
    DR->>Agents: incident-analyzer 起動
    Agents-->>XL: 一次解析 (I列) → 解析済み
    DR->>Agents: repair-planner 起動
    Agents-->>XL: 改修案 (J列) → 要承認 ★停止
    演者->>WUI: 承認者記入 + ステータス=PR作成待ち
    WUI->>DR: 自動発火
    DR->>Agents: pr-publisher 起動
    Agents->>GH: ブランチ作成 → コミット → gh pr create
    Agents-->>XL: PR URL (L列) → 対応完了
    WUI-->>演者: 全列と PR リンクを表示
```

---

## 4. TrackID による一貫トレーサビリティ

システムを貫く一意 ID として **TrackID** を全ログに伝播させている。1つのインシデントを、発火から PR まで同じ TrackID で追える。

```mermaid
graph LR
    A["RoboMart<br/>ERROR TrackID:ABC1234"] --> B1["app.log (client)<br/>TrackID:ABC1234"]
    A --> B2["service.log<br/>TrackID:ABC1234"]
    B1 --> C["watchdog<br/>SSH収集(client+service)+LLM概要生成<br/>→ TrackID:ABC1234 を持つ行としてINC001起票"]
    B2 --> C
    C --> D["Excel B列(TrackID)/D列(概要)/H列(収集ログ)<br/>...TrackID:ABC1234"]
    D --> E["driver/agents ログ<br/>[INC001 TrackID:ABC1234]"]
    E --> F["PRブランチ/コミット<br/>fix/inc001-abc1234<br/>(INC001, TrackID:ABC1234)"]
```

Web UI 下部のコンソールで各ログソース (client / service / watchdog / web-ui / robomart) を切り替えると、同じ TrackID が client(app.log) と service(service.log) の両方に現れるのが確認できる。

---

## 5. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [README.md](README.md) | デモの実行手順・設定 |
| [SPEC.md](SPEC.md) | 全体設計・Excel列定義・状態機械・エージェント責務 |
| [DEMO_FLOW.md](DEMO_FLOW.md) | E2E 時系列シナリオ (演者トーク付き脚本) |
