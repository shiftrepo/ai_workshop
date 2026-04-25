# テーブル駆動 vs パイプライン：実装パターン比較

> このドキュメントは `fee_matrix_engine` の設計で採用した2つのパターンの違いをまとめたものです。  
> 詳細な実装例は [SPEC.md](./SPEC.md) を参照してください。

---

## 🔑 本質的な違い

| 観点 | テーブル駆動（Table-Driven） | パイプライン（Pipeline） |
|------|---------------------------|----------------------|
| **データの流れ** | データがテーブルを**参照**する | データがステージを**通過**する |
| **制御の主体** | データ（テーブルの内容）が振る舞いを決定 | 処理ステップの連鎖が変換を定義 |
| **状態** | 基本的に**ステートレス**（テーブルは不変） | ステージ間で**状態を引き継ぐ**ことが多い |
| **変更の単位** | テーブルの行・列を追加／修正 | ステージ（関数）を追加／差し替え |
| **可読性** | 「何をするか」がテーブルで一覧できる | 「どう変換するか」が処理の流れで読める |

---

## 📋 テーブル駆動（Table-Driven）

### 概念
```
入力 ──→ [ルックアップテーブル] ──→ 対応するアクション/値を返す
```

### コード例（Python）
```python
# 条件分岐をif/elif地獄ではなくテーブルで表現
DISCOUNT_TABLE = {
    "GOLD":     {"rate": 0.20, "min_order": 5000},
    "SILVER":   {"rate": 0.10, "min_order": 3000},
    "BRONZE":   {"rate": 0.05, "min_order": 1000},
    "STANDARD": {"rate": 0.00, "min_order": 0},
}

def get_discount(member_rank: str) -> dict:
    return DISCOUNT_TABLE.get(member_rank, DISCOUNT_TABLE["STANDARD"])
```

### ✅ 向いている場面
- **条件分岐が多い・増える**（料金マトリックス、ルーティング、コード変換）
- **ビジネスルールを非エンジニアも管理したい**（テーブルをDBやCSVに外出し）
- **入力→出力のマッピングが明確**で、処理自体はシンプル
- **テスト時に網羅性を確認したい**（テーブルの行がそのままテストケース）

### ❌ 向かない場面
- 変換処理が複数ステップにまたがる（→パイプライン向き）
- 処理内容が動的・文脈依存（テーブルで表現しにくい）
- 入力の組み合わせが爆発的（テーブルが巨大化する）

---

## 🔧 パイプライン（Pipeline）

### 概念
```
入力 ──→ [Stage1] ──→ [Stage2] ──→ [Stage3] ──→ 出力
          正規化       変換         フォーマット
```

### コード例（Python）
```python
from typing import Callable

def normalize(data: dict) -> dict:
    return {k.lower(): v.strip() for k, v in data.items()}

def enrich(data: dict) -> dict:
    return {**data, "full_name": f"{data['first']} {data['last']}"}

def format_output(data: dict) -> dict:
    return {"display": data["full_name"].upper(), "email": data["email"]}

Pipeline = list[Callable[[dict], dict]]

def run_pipeline(data: dict, stages: Pipeline) -> dict:
    result = data
    for stage in stages:
        result = stage(result)
    return result

output = run_pipeline(
    {"First": " Alice ", "Last": " Smith ", "Email": " a@example.com "},
    [normalize, enrich, format_output]
)
```

### ✅ 向いている場面
- **データ変換が複数ステップ**ある（ETL、リクエスト処理、画像処理）
- **ステップの追加・差し替え・順序変更**が頻繁に起こる
- **各ステージを独立してテスト・再利用**したい
- ストリーミング・非同期処理（各ステージを並列化しやすい）

### ❌ 向かない場面
- 処理が1ステップで完結する（オーバーエンジニアリング）
- ステージ間の**依存関係が複雑**（特定ステージが前後の状態に強く依存）
- デバッグ時に中間状態が見えにくくなるケース

---

## 🆚 組み合わせて使う（実践）

実際のシステムでは**両方を組み合わせる**のが最も強力です：

```
入力
 │
 ▼
[パイプライン Stage1: バリデーション]
 │
 ▼
[パイプライン Stage2: ルーティング]
            │
            ▼
     [テーブル駆動で振り分け]
      "order" → 注文処理関数
      "refund" → 返金処理関数
      "query"  → 照会処理関数
            │
            ▼
[パイプライン Stage3: レスポンス整形]
```

> **パイプライン** = *「どの順序で何をするか」の骨格*  
> **テーブル駆動** = *「条件に応じて何を選ぶか」の辞書*

---

## 📌 まとめ：選択の指針

```
「ルールや分岐が増える」  →  テーブル駆動
「変換ステップが増える」  →  パイプライン
「両方増える」           →  組み合わせる
```

---

## 📖 関連ドキュメント

- [fee_matrix_engine README](./README.md) — このプロジェクト概要
- [SPEC.md](./SPEC.md) — テーブル駆動 × パイプラインの詳細実装仕様
- [MATRIX_SPEC.md](./MATRIX_SPEC.md) — 2軸マトリックス設計仕様
