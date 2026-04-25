#!/usr/bin/env python3.9
"""
2軸マトリックス × セル内複数条件 料金算出エンジン
=======================================================
縦軸: 申請種別 (A〜F)
横軸: 申請者区分 (個人 / 法人 / 行政)
各セル: 地域・優先度・複雑度・追加フラグ・割引 の複数条件を内包

設計パターン:
  - 2D辞書マトリックス: MATRIX[app_type][applicant_type] → CellRule
  - CellRule: セルごとに独自の係数上限・フラグ適用可否・割引ルールを保持
  - 段階パイプライン: セル取得 → 地域 → 優先度 → 複雑度 → フラグ → 季節 → 割引
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import date
import json

# ============================================================
# 1. 型定義
# ============================================================

@dataclass
class CellRule:
    """
    マトリックスの1セルに対応するルール定義。
    各セルは基本料金に加え、適用可能な係数・上限・フラグを個別に持つ。
    """
    base_fee: int                          # セル固有の基本料金（税別）
    label: str                             # 表示ラベル
    # 係数上限（セルによっては一部係数を制限）
    max_priority_multiplier: float = 2.20  # 優先度係数の上限
    max_complexity_multiplier: float = 2.10  # 複雑度係数の上限
    # セル固有フラグ適用可否
    allow_environmental: bool = True       # 環境影響評価フラグ使用可否
    allow_joint: bool = True               # 共同申請フラグ使用可否
    allow_translation: bool = True         # 翻訳フラグ使用可否
    # セル固有割引上限
    max_repeat_discount: float = 0.20      # リピーター割引上限
    max_package_discount: float = 0.20     # パッケージ割引上限
    # セル固有追加料金（この申請種別×申請者区分でのみ発生）
    cell_surcharge: int = 0                # セル固有固定追加料金
    cell_surcharge_label: str = ""         # 追加料金の名称
    # セルコメント（仕様書用）
    note: str = ""


@dataclass
class ApplicationRequest:
    """申請リクエスト（入力パラメータ）"""
    app_type: str           # 申請種別: A〜F
    applicant_type: str     # 申請者区分: 個人/法人/行政
    region: str             # 地域: rural/prefecture/designated_city/special_ward
    priority: str           # 優先度: standard/express/urgent
    complexity: str         # 複雑度: simple/moderate/complex/extreme
    business_scale: str     # 事業規模: MICRO/SMALL/MEDIUM/LARGE (法人のみ)
    submission_date: date   # 提出日
    document_count: int     # 書類枚数
    # バイナリフラグ
    legal_review: bool = False
    translation: bool = False
    cross_prefecture: bool = False
    environmental_impact: bool = False
    joint_application: bool = False
    correction_count: int = 0
    # 割引条件
    past_applications: int = 0   # 過去申請件数（リピーター割引用）
    sibling_count: int = 0        # 同時申請件数（パッケージ割引用）


@dataclass
class FeeBreakdown:
    """料金内訳（監査ログ）"""
    request_id: str
    app_type: str
    applicant_type: str
    cell_label: str
    # 各ステップの値
    base_fee: int = 0
    cell_surcharge: int = 0
    after_region: int = 0
    after_priority: int = 0
    after_complexity: int = 0
    after_business_scale: int = 0
    after_seasonal: int = 0
    additional_fees: Dict[str, int] = field(default_factory=dict)
    subtotal: int = 0
    repeat_discount_amount: int = 0
    after_repeat_discount: int = 0
    package_discount_amount: int = 0
    after_package_discount: int = 0
    final_fee_before_tax: int = 0
    tax_amount: int = 0
    final_fee_with_tax: int = 0
    # 適用した係数
    region_multiplier: float = 1.0
    priority_multiplier: float = 1.0
    complexity_multiplier: float = 1.0
    business_scale_multiplier: float = 1.0
    seasonal_multiplier: float = 1.0
    repeat_discount_rate: float = 0.0
    package_discount_rate: float = 0.0


# ============================================================
# 2. 2軸マトリックス定義
#    MATRIX[申請種別][申請者区分] = CellRule
# ============================================================

MATRIX: Dict[str, Dict[str, CellRule]] = {

    # ─── A: 建設工事許可申請 ───────────────────────────────
    "A": {
        "個人": CellRule(
            base_fee=80_000,
            label="建設工事許可 × 個人",
            max_priority_multiplier=1.50,   # 個人は最急対応不可（上限：急ぎ）
            allow_environmental=False,       # 個人申請に環境評価不要
            allow_joint=False,               # 個人に共同申請不可
            max_repeat_discount=0.15,        # 個人の割引上限15%
            note="個人事業主の建設業許可。一般建設業のみ対応。最急対応・環境評価・共同申請は不適用。",
        ),
        "法人": CellRule(
            base_fee=150_000,
            label="建設工事許可 × 法人",
            # 法人はすべてのオプション適用可（デフォルト値のまま）
            cell_surcharge=20_000,
            cell_surcharge_label="法人登記確認料",
            note="法人建設業許可。特定建設業許可も対応。法人登記確認料が固定加算。",
        ),
        "行政": CellRule(
            base_fee=60_000,
            label="建設工事許可 × 行政",
            max_priority_multiplier=1.50,   # 行政は最急不可（予算決裁に時間）
            max_complexity_multiplier=1.45, # 行政書類は超複雑上限なし（1.45まで）
            allow_joint=False,
            max_repeat_discount=0.20,
            max_package_discount=0.15,      # 行政のパッケージ割引上限15%
            note="公共工事関連の建設許可。行政内部の決裁プロセスにより最急対応・共同申請は不可。",
        ),
    },

    # ─── B: 営業許可申請（飲食・風俗・古物等） ──────────────
    "B": {
        "個人": CellRule(
            base_fee=50_000,
            label="営業許可 × 個人",
            max_priority_multiplier=1.50,
            allow_environmental=False,
            allow_joint=False,
            max_repeat_discount=0.15,
            note="飲食店・古物商等の個人営業許可。比較的シンプルな申請が多い。",
        ),
        "法人": CellRule(
            base_fee=90_000,
            label="営業許可 × 法人",
            cell_surcharge=10_000,
            cell_surcharge_label="法人営業実態確認料",
            note="法人の各種営業許可。複数店舗・フランチャイズ対応あり。",
        ),
        "行政": CellRule(
            base_fee=40_000,
            label="営業許可 × 行政",
            max_priority_multiplier=1.00,   # 行政営業許可は優先度係数なし（定型処理）
            max_complexity_multiplier=1.00, # 行政は複雑度係数なし
            allow_environmental=False,
            allow_joint=False,
            allow_translation=False,        # 行政機関に翻訳不要
            max_repeat_discount=0.20,
            max_package_discount=0.10,
            note="行政機関の特例営業許可。定型フォーマットのため係数乗算なし（フラット料金体系）。",
        ),
    },

    # ─── C: 補助金・助成金申請 ───────────────────────────────
    "C": {
        "個人": CellRule(
            base_fee=30_000,
            label="補助金申請 × 個人",
            max_priority_multiplier=1.50,
            allow_environmental=False,
            allow_joint=False,
            max_repeat_discount=0.10,       # 補助金個人は割引控えめ
            note="個人事業主向け補助金申請。締切対応で急ぎ係数あり。",
        ),
        "法人": CellRule(
            base_fee=60_000,
            label="補助金申請 × 法人",
            cell_surcharge=15_000,
            cell_surcharge_label="事業計画書作成支援料",
            note="法人向け補助金・助成金申請。事業計画書作成支援が固定加算。ものづくり補助金等。",
        ),
        "行政": CellRule(
            base_fee=20_000,
            label="補助金申請 × 行政",
            max_priority_multiplier=1.00,
            max_complexity_multiplier=1.00,
            allow_environmental=False,
            allow_joint=False,
            allow_translation=False,
            max_repeat_discount=0.20,
            max_package_discount=0.20,
            cell_surcharge=0,
            note="行政機関の交付金・補助金申請。国・都道府県向けの申請代行。定型フォーマット。",
        ),
    },

    # ─── D: 輸出入許可申請 ───────────────────────────────────
    "D": {
        "個人": CellRule(
            base_fee=70_000,
            label="輸出入許可 × 個人",
            max_priority_multiplier=1.50,
            allow_environmental=False,
            allow_joint=False,
            cell_surcharge=10_000,
            cell_surcharge_label="個人通関コンサル料",
            note="個人輸出入許可（個人輸入業・ネット販売等）。通関コンサル料固定加算。",
        ),
        "法人": CellRule(
            base_fee=130_000,
            label="輸出入許可 × 法人",
            cell_surcharge=30_000,
            cell_surcharge_label="通関業者連携調整料",
            note="法人の輸出入許可・通関申請。通関業者との連携調整が必要。翻訳が高頻度で発生。",
        ),
        "行政": CellRule(
            base_fee=50_000,
            label="輸出入許可 × 行政",
            max_priority_multiplier=1.50,
            max_complexity_multiplier=1.45,
            allow_joint=False,
            max_package_discount=0.15,
            note="行政機関の物品輸出入許可（研究用試薬・文化財等）。特殊案件が多い。",
        ),
    },

    # ─── E: 宅地建物取引業免許申請 ────────────────────────────
    "E": {
        "個人": CellRule(
            base_fee=100_000,
            label="宅建免許 × 個人",
            max_priority_multiplier=1.50,
            allow_environmental=False,
            allow_joint=False,
            max_repeat_discount=0.15,
            note="個人の宅建業免許（1人社長・個人事業主）。事務所要件確認が必要。",
        ),
        "法人": CellRule(
            base_fee=180_000,
            label="宅建免許 × 法人",
            cell_surcharge=25_000,
            cell_surcharge_label="事務所実地確認料",
            note="法人の宅建業免許。事務所実地確認料が固定加算。複数事務所の場合は追加発生。",
        ),
        "行政": CellRule(
            base_fee=70_000,
            label="宅建免許 × 行政",
            max_priority_multiplier=1.50,
            max_complexity_multiplier=1.45,
            allow_joint=False,
            allow_environmental=False,
            max_package_discount=0.15,
            note="公的機関の不動産業許可。公営住宅供給公社等。環境評価・共同申請は不要。",
        ),
    },

    # ─── F: 産業廃棄物処理業許可申請 ──────────────────────────
    "F": {
        "個人": CellRule(
            base_fee=120_000,
            label="産廃許可 × 個人",
            max_priority_multiplier=1.50,
            allow_joint=False,
            max_repeat_discount=0.15,
            cell_surcharge=15_000,
            cell_surcharge_label="現地施設確認料（個人）",
            note="個人事業主の産廃処理業許可。施設確認が必須。環境評価フラグが高確率でON。",
        ),
        "法人": CellRule(
            base_fee=220_000,
            label="産廃許可 × 法人",
            cell_surcharge=35_000,
            cell_surcharge_label="現地施設確認料（法人）",
            note="最も複雑な申請種別。施設確認・環境評価・法務確認がほぼ必須。最高料金帯。",
        ),
        "行政": CellRule(
            base_fee=80_000,
            label="産廃許可 × 行政",
            max_priority_multiplier=1.50,
            max_complexity_multiplier=1.45,
            allow_joint=False,
            max_package_discount=0.15,
            cell_surcharge=10_000,
            cell_surcharge_label="行政施設確認料",
            note="行政機関（廃棄物処理センター等）の産廃業許可。施設確認料固定加算。",
        ),
    },
}


# ============================================================
# 3. 係数テーブル（グローバル）
# ============================================================

REGION_MULTIPLIER: Dict[str, float] = {
    "rural":            0.85,  # 過疎地域
    "prefecture":       1.00,  # 都道府県（標準）
    "designated_city":  1.15,  # 政令指定都市
    "special_ward":     1.30,  # 東京23区
}

PRIORITY_MULTIPLIER: Dict[str, float] = {
    "standard": 1.00,  # 通常（14営業日）
    "express":  1.50,  # 急ぎ（7営業日）
    "urgent":   2.20,  # 最急（3営業日）
}

COMPLEXITY_MULTIPLIER: Dict[str, float] = {
    "simple":   0.80,  # 簡易（書類5枚未満）
    "moderate": 1.00,  # 中程度（5〜20枚）
    "complex":  1.45,  # 複雑（20〜50枚）
    "extreme":  2.10,  # 超複雑（50枚超）
}

BUSINESS_SCALE_MULTIPLIER: Dict[str, float] = {
    "MICRO":  0.75,  # 資本金300万以下 or 従業員5名以下
    "SMALL":  1.00,  # 中小企業（標準）
    "MEDIUM": 1.30,  # 中規模
    "LARGE":  1.65,  # 大企業・上場
}

ADDITIONAL_FEE: Dict[str, int] = {
    "legal_review":         50_000,
    "cross_prefecture":     40_000,
    "environmental_impact": 100_000,
    "joint_application":    30_000,
}

TRANSLATION_FEE_PER_PAGE: int = 3_000

CORRECTION_FEE_FIRST: int = 15_000
CORRECTION_FEE_EXTRA: int = 10_000

SEASONAL_MULTIPLIER: Dict[int, float] = {
    1: 1.00, 2: 1.20, 3: 1.20, 4: 1.10,
    5: 1.00, 6: 1.00, 7: 0.95, 8: 0.95,
    9: 1.00, 10: 1.00, 11: 1.00, 12: 1.05,
}


# ============================================================
# 4. パイプライン関数群
# ============================================================

def get_cell_rule(app_type: str, applicant_type: str) -> CellRule:
    """Step 0: マトリックスからセルルールを取得"""
    if app_type not in MATRIX:
        raise ValueError(f"未定義の申請種別: {app_type}")
    if applicant_type not in MATRIX[app_type]:
        raise ValueError(f"未定義の申請者区分: {applicant_type}")
    return MATRIX[app_type][applicant_type]


def apply_region(fee: int, region: str) -> Tuple[int, float]:
    """Step 1: 地域係数適用"""
    m = REGION_MULTIPLIER.get(region, 1.0)
    return int(fee * m), m


def apply_priority(fee: int, priority: str, cell: CellRule) -> Tuple[int, float]:
    """Step 2: 優先度係数適用（セルの上限でクリップ）"""
    raw = PRIORITY_MULTIPLIER.get(priority, 1.0)
    m = min(raw, cell.max_priority_multiplier)  # ← セル固有上限適用
    return int(fee * m), m


def apply_complexity(fee: int, complexity: str, cell: CellRule) -> Tuple[int, float]:
    """Step 3: 複雑度係数適用（セルの上限でクリップ）"""
    raw = COMPLEXITY_MULTIPLIER.get(complexity, 1.0)
    m = min(raw, cell.max_complexity_multiplier)  # ← セル固有上限適用
    return int(fee * m), m


def apply_business_scale(fee: int, applicant_type: str, business_scale: str) -> Tuple[int, float]:
    """Step 4: 事業規模係数適用（法人のみ。行政はMICRO固定。個人は適用なし）"""
    if applicant_type == "法人":
        m = BUSINESS_SCALE_MULTIPLIER.get(business_scale, 1.0)
    elif applicant_type == "行政":
        m = BUSINESS_SCALE_MULTIPLIER["MICRO"]  # 行政優遇固定
    else:
        m = 1.0  # 個人は適用なし
    return int(fee * m), m


def apply_seasonal(fee: int, submission_date: date) -> Tuple[int, float]:
    """Step 5: 季節・繁忙期係数適用"""
    m = SEASONAL_MULTIPLIER.get(submission_date.month, 1.0)
    return int(fee * m), m


def calc_additional_fees(req: ApplicationRequest, cell: CellRule) -> Dict[str, int]:
    """Step 6: 追加料金（フラグ＋セル固有チェック）"""
    fees: Dict[str, int] = {}

    # セル固有追加料金
    if cell.cell_surcharge > 0:
        fees[cell.cell_surcharge_label] = cell.cell_surcharge

    # フラグベース追加料金（セルの allow_* でフィルタリング）
    if req.legal_review:
        fees["法務確認料"] = ADDITIONAL_FEE["legal_review"]

    if req.translation and cell.allow_translation:
        fees["翻訳料"] = (req.document_count) * TRANSLATION_FEE_PER_PAGE

    if req.cross_prefecture:
        fees["複数都道府県対応料"] = ADDITIONAL_FEE["cross_prefecture"]

    if req.environmental_impact and cell.allow_environmental:
        fees["環境影響評価対応料"] = ADDITIONAL_FEE["environmental_impact"]

    if req.joint_application and cell.allow_joint:
        fees["共同申請手続料"] = ADDITIONAL_FEE["joint_application"]

    # 書類超過料金（段階制）
    n = req.document_count
    if n > 60:
        surcharge = 34_000 + (n - 60) * 1_200
    elif n > 30:
        surcharge = 10_000 + (n - 30) * 800
    elif n > 10:
        surcharge = (n - 10) * 500
    else:
        surcharge = 0
    if surcharge > 0:
        fees[f"書類超過料金({n}枚)"] = surcharge

    # 補正対応料
    if req.correction_count >= 1:
        corr_fee = CORRECTION_FEE_FIRST + max(0, req.correction_count - 1) * CORRECTION_FEE_EXTRA
        fees[f"補正対応料({req.correction_count}回)"] = corr_fee

    return fees


def apply_repeat_discount(subtotal: int, past_apps: int, cell: CellRule) -> Tuple[int, float]:
    """Step 7: リピーター割引（セルの上限でクリップ）"""
    if past_apps >= 11:
        raw_rate = 0.20
    elif past_apps >= 6:
        raw_rate = 0.15
    elif past_apps >= 3:
        raw_rate = 0.10
    elif past_apps >= 1:
        raw_rate = 0.05
    else:
        raw_rate = 0.0
    rate = min(raw_rate, cell.max_repeat_discount)  # ← セル固有上限
    discount = int(subtotal * rate)
    return discount, rate


def apply_package_discount(after_repeat: int, sibling: int, cell: CellRule) -> Tuple[int, float]:
    """Step 8: パッケージ割引（セルの上限でクリップ）"""
    if sibling >= 5:
        raw_rate = 0.20
    elif sibling >= 3:
        raw_rate = 0.15
    elif sibling >= 2:
        raw_rate = 0.08
    else:
        raw_rate = 0.0
    rate = min(raw_rate, cell.max_package_discount)  # ← セル固有上限
    discount = int(after_repeat * rate)
    return discount, rate


def round_up_100(fee: int) -> int:
    """Step 9: 100円単位切り上げ"""
    return ((fee + 99) // 100) * 100


# ============================================================
# 5. メイン計算関数
# ============================================================

def calculate(req: ApplicationRequest, request_id: str = "APP-XXX") -> FeeBreakdown:
    """2軸マトリックス × セル内複数条件 料金算出パイプライン"""
    bd = FeeBreakdown(
        request_id=request_id,
        app_type=req.app_type,
        applicant_type=req.applicant_type,
        cell_label="",
    )

    # Step 0: セルルール取得
    cell = get_cell_rule(req.app_type, req.applicant_type)
    bd.cell_label = cell.label
    bd.base_fee = cell.base_fee

    # セル固有追加料金（後でaddに含めるためここでは加算しない）
    fee = cell.base_fee

    # Step 1: 地域係数
    fee, m = apply_region(fee, req.region)
    bd.after_region = fee
    bd.region_multiplier = m

    # Step 2: 優先度係数（セル上限あり）
    fee, m = apply_priority(fee, req.priority, cell)
    bd.after_priority = fee
    bd.priority_multiplier = m

    # Step 3: 複雑度係数（セル上限あり）
    fee, m = apply_complexity(fee, req.complexity, cell)
    bd.after_complexity = fee
    bd.complexity_multiplier = m

    # Step 4: 事業規模係数
    fee, m = apply_business_scale(fee, req.applicant_type, req.business_scale)
    bd.after_business_scale = fee
    bd.business_scale_multiplier = m

    # Step 5: 季節係数
    fee, m = apply_seasonal(fee, req.submission_date)
    bd.after_seasonal = fee
    bd.seasonal_multiplier = m

    # Step 6: 追加料金（フラグ＋セル固有）
    add_fees = calc_additional_fees(req, cell)
    bd.additional_fees = add_fees
    total_add = sum(add_fees.values())
    bd.cell_surcharge = cell.cell_surcharge

    subtotal = fee + total_add
    bd.subtotal = subtotal

    # Step 7: リピーター割引（セル上限あり）
    repeat_disc, repeat_rate = apply_repeat_discount(subtotal, req.past_applications, cell)
    bd.repeat_discount_rate = repeat_rate
    bd.repeat_discount_amount = repeat_disc
    after_repeat = subtotal - repeat_disc
    bd.after_repeat_discount = after_repeat

    # Step 8: パッケージ割引（セル上限あり）
    pkg_disc, pkg_rate = apply_package_discount(after_repeat, req.sibling_count, cell)
    bd.package_discount_rate = pkg_rate
    bd.package_discount_amount = pkg_disc
    after_pkg = after_repeat - pkg_disc
    bd.after_package_discount = after_pkg

    # Step 9: 100円単位切り上げ・税計算
    final_before_tax = round_up_100(after_pkg)
    tax = int(final_before_tax * 0.10)
    bd.final_fee_before_tax = final_before_tax
    bd.tax_amount = tax
    bd.final_fee_with_tax = final_before_tax + tax

    return bd


# ============================================================
# 6. 全セル最低料金・最高料金のサマリー出力
# ============================================================

def print_matrix_summary():
    """全18セルの基本料金＋セル固有追加料金サマリーを表示"""
    print("\n" + "="*80)
    print("2軸マトリックス サマリー（基本料金 + セル固有追加料金）")
    print("="*80)
    header = f"{'申請種別':<8} | {'個人':>12} | {'法人':>12} | {'行政':>12} | セル固有の特徴"
    print(header)
    print("-"*80)
    for atype in ["A", "B", "C", "D", "E", "F"]:
        row = f"  {atype}      "
        features = []
        for apptype in ["個人", "法人", "行政"]:
            cell = MATRIX[atype][apptype]
            total = cell.base_fee + cell.cell_surcharge
            row += f" | ¥{total:>10,}"
            # 特殊制約
            if cell.max_priority_multiplier < 2.20:
                features.append(f"{apptype}:優先度上限×{cell.max_priority_multiplier}")
            if not cell.allow_environmental:
                features.append(f"{apptype}:環境評価不可")
            if not cell.allow_joint:
                features.append(f"{apptype}:共同申請不可")
        row += " | " + " / ".join(features[:2])
        print(row)
    print("="*80)


# ============================================================
# 7. テスト実行
# ============================================================

if __name__ == "__main__":
    print_matrix_summary()

    # テストケース定義
    test_cases = [
        {
            "id": "MATRIX-001",
            "desc": "産廃許可×法人(大企業)×東京×最急×超複雑【全オプション】",
            "req": ApplicationRequest(
                app_type="F", applicant_type="法人",
                region="special_ward", priority="urgent", complexity="extreme",
                business_scale="LARGE", submission_date=date(2026, 3, 15),
                document_count=75, legal_review=True, translation=True,
                cross_prefecture=True, environmental_impact=True, joint_application=True,
                correction_count=3, past_applications=0, sibling_count=2,
            ),
        },
        {
            "id": "MATRIX-002",
            "desc": "営業許可×行政【係数が全て1.0に制限されるケース】",
            "req": ApplicationRequest(
                app_type="B", applicant_type="行政",
                region="special_ward", priority="urgent", complexity="extreme",
                business_scale="MICRO", submission_date=date(2026, 3, 1),
                document_count=5, legal_review=False, translation=True,  # 翻訳も不可
                cross_prefecture=False, environmental_impact=False, joint_application=False,
                correction_count=0, past_applications=15, sibling_count=5,
            ),
        },
        {
            "id": "MATRIX-003",
            "desc": "宅建免許×法人(大企業)×東京×急ぎ×複雑【割引あり】",
            "req": ApplicationRequest(
                app_type="E", applicant_type="法人",
                region="special_ward", priority="express", complexity="complex",
                business_scale="LARGE", submission_date=date(2026, 8, 1),
                document_count=35, legal_review=True, translation=False,
                cross_prefecture=True, environmental_impact=False, joint_application=False,
                correction_count=1, past_applications=8, sibling_count=3,
            ),
        },
        {
            "id": "MATRIX-004",
            "desc": "補助金申請×個人×過疎地×通常×簡易【最低コストケース】",
            "req": ApplicationRequest(
                app_type="C", applicant_type="個人",
                region="rural", priority="standard", complexity="simple",
                business_scale="MICRO", submission_date=date(2026, 8, 10),
                document_count=3, legal_review=False, translation=False,
                cross_prefecture=False, environmental_impact=False, joint_application=False,
                correction_count=0, past_applications=11, sibling_count=5,
            ),
        },
        {
            "id": "MATRIX-005",
            "desc": "輸出入許可×法人×政令市×最急×複雑【翻訳100枚+環境評価】",
            "req": ApplicationRequest(
                app_type="D", applicant_type="法人",
                region="designated_city", priority="urgent", complexity="complex",
                business_scale="MEDIUM", submission_date=date(2026, 2, 20),
                document_count=100, legal_review=True, translation=True,
                cross_prefecture=True, environmental_impact=True, joint_application=True,
                correction_count=2, past_applications=3, sibling_count=0,
            ),
        },
    ]

    print("\n" + "="*80)
    print("テストケース 算出結果")
    print("="*80)

    results = []
    for tc in test_cases:
        bd = calculate(tc["req"], tc["id"])
        results.append({"case": tc, "bd": bd})

        print(f"\n【{bd.request_id}】{tc['desc']}")
        print(f"  セル     : {bd.cell_label}")
        print(f"  基本料金  : ¥{bd.base_fee:>10,}")
        print(f"  地域係数後: ¥{bd.after_region:>10,}  (×{bd.region_multiplier})")
        print(f"  優先度係数後: ¥{bd.after_priority:>10,}  (×{bd.priority_multiplier})")
        print(f"  複雑度係数後: ¥{bd.after_complexity:>10,}  (×{bd.complexity_multiplier})")
        print(f"  事業規模後: ¥{bd.after_business_scale:>10,}  (×{bd.business_scale_multiplier})")
        print(f"  季節係数後: ¥{bd.after_seasonal:>10,}  (×{bd.seasonal_multiplier})")
        print(f"  追加料金  :")
        for k, v in bd.additional_fees.items():
            print(f"    {k}: ¥{v:,}")
        print(f"  小計      : ¥{bd.subtotal:>10,}")
        print(f"  リピーター割引: ▲¥{bd.repeat_discount_amount:,} ({bd.repeat_discount_rate*100:.0f}%)")
        print(f"  パッケージ割引: ▲¥{bd.package_discount_amount:,} ({bd.package_discount_rate*100:.0f}%)")
        print(f"  ──────────────────────────")
        print(f"  最終料金(税別): ¥{bd.final_fee_before_tax:>10,}")
        print(f"  消費税(10%): ¥{bd.tax_amount:>10,}")
        print(f"  最終料金(税込): ¥{bd.final_fee_with_tax:>10,}")

    # JSON出力（仕様書生成用）
    output = []
    for r in results:
        bd = r["bd"]
        output.append({
            "id": bd.request_id,
            "desc": r["case"]["desc"],
            "cell_label": bd.cell_label,
            "base_fee": bd.base_fee,
            "after_region": bd.after_region,
            "region_multiplier": bd.region_multiplier,
            "after_priority": bd.after_priority,
            "priority_multiplier": bd.priority_multiplier,
            "after_complexity": bd.after_complexity,
            "complexity_multiplier": bd.complexity_multiplier,
            "after_business_scale": bd.after_business_scale,
            "business_scale_multiplier": bd.business_scale_multiplier,
            "after_seasonal": bd.after_seasonal,
            "seasonal_multiplier": bd.seasonal_multiplier,
            "additional_fees": bd.additional_fees,
            "subtotal": bd.subtotal,
            "repeat_discount_rate": bd.repeat_discount_rate,
            "repeat_discount_amount": bd.repeat_discount_amount,
            "package_discount_rate": bd.package_discount_rate,
            "package_discount_amount": bd.package_discount_amount,
            "final_fee_before_tax": bd.final_fee_before_tax,
            "tax_amount": bd.tax_amount,
            "final_fee_with_tax": bd.final_fee_with_tax,
        })

    with open("/tmp/fee_matrix/matrix_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("\n✅ 結果をmatrix_results.jsonに保存しました")
