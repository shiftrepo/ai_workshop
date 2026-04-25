"""
複雑な事務処理ロジック：料金算出マトリックス エンジン
========================================================

対応する申請種別:
  A. 建設工事許可申請
  B. 営業許可申請（飲食・風俗・古物等）
  C. 補助金・助成金申請
  D. 輸出入許可申請
  E. 宅地建物取引業免許申請
  F. 産業廃棄物処理業許可申請

料金算出の変数(マトリックス軸):
  - 申請種別
  - 申請者区分（個人/法人/行政機関）
  - 事業規模（資本金・売上・従業員数）
  - 地域区分（都道府県、政令指定都市、特別区）
  - 処理優先度（通常/急ぎ/最急）
  - 申請の複雑度（記述量・添付書類数）
  - 過去の申請履歴（リピーター割引）
  - 補正回数（追加請求）
  - 季節・繁忙期係数
  - 複数申請の同時提出（パッケージ割引）
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import date, datetime
from enum import Enum
import json


# ==================== 列挙型定義 ====================

class ApplicationType(str, Enum):
    CONSTRUCTION_PERMIT    = "A"  # 建設工事許可申請
    BUSINESS_LICENSE       = "B"  # 営業許可申請
    SUBSIDY                = "C"  # 補助金・助成金申請
    IMPORT_EXPORT          = "D"  # 輸出入許可申請
    REAL_ESTATE_LICENSE    = "E"  # 宅建業免許申請
    WASTE_PROCESSING       = "F"  # 産業廃棄物処理業許可

class ApplicantType(str, Enum):
    INDIVIDUAL  = "individual"    # 個人
    CORPORATION = "corporation"   # 法人
    GOVERNMENT  = "government"    # 行政機関

class Region(str, Enum):
    PREFECTURE      = "prefecture"       # 都道府県
    DESIGNATED_CITY = "designated_city"  # 政令指定都市
    SPECIAL_WARD    = "special_ward"     # 特別区（東京23区等）
    RURAL           = "rural"            # 過疎地域

class Priority(str, Enum):
    STANDARD = "standard"   # 通常（14営業日）
    EXPRESS  = "express"    # 急ぎ（7営業日）
    URGENT   = "urgent"     # 最急（3営業日）

class Complexity(str, Enum):
    SIMPLE   = "simple"   # 簡易（書類5枚未満）
    MODERATE = "moderate" # 中程度（5〜20枚）
    COMPLEX  = "complex"  # 複雑（20〜50枚）
    EXTREME  = "extreme"  # 超複雑（50枚超・法務確認要）

class BusinessScale(str, Enum):
    MICRO  = "micro"   # 小規模（資本金300万以下 or 従業員5名以下）
    SMALL  = "small"   # 中小企業（資本金300万〜3億、従業員300名以下）
    MEDIUM = "medium"  # 中規模（資本金3億〜10億）
    LARGE  = "large"   # 大企業（資本金10億超 or 上場）


# ==================== 申請データクラス ====================

@dataclass
class ApplicationRequest:
    """1件の申請を表すデータクラス"""
    app_id: str
    app_type: ApplicationType
    applicant_type: ApplicantType
    region: Region
    priority: Priority
    complexity: Complexity
    business_scale: BusinessScale

    # 数値フィールド
    document_pages: int = 0          # 書類枚数
    attachment_count: int = 0        # 添付書類数
    legal_review_required: bool = False  # 法務確認要否
    translation_required: bool = False   # 翻訳要否（外国語書類）

    # 申請者固有情報
    past_applications: int = 0       # 過去申請件数（リピーター判定）
    correction_count: int = 0        # 補正・修正回数（追加請求）

    # 特殊フラグ
    joint_application: bool = False  # 共同申請（複数法人）
    cross_prefecture: bool = False   # 複数都道府県にまたがる申請
    environmental_impact: bool = False  # 環境影響評価が必要

    # 提出日（季節係数計算用）
    submission_date: date = field(default_factory=date.today)

    # 同時申請パッケージ（他の申請IDリスト）
    package_siblings: list = field(default_factory=list)


# ==================== 基本料金テーブル ====================

BASE_FEE_TABLE: dict = {
    # (申請種別, 申請者区分) → 基本料金（円）
    (ApplicationType.CONSTRUCTION_PERMIT, ApplicantType.INDIVIDUAL):   80_000,
    (ApplicationType.CONSTRUCTION_PERMIT, ApplicantType.CORPORATION): 150_000,
    (ApplicationType.CONSTRUCTION_PERMIT, ApplicantType.GOVERNMENT):   60_000,

    (ApplicationType.BUSINESS_LICENSE,    ApplicantType.INDIVIDUAL):   50_000,
    (ApplicationType.BUSINESS_LICENSE,    ApplicantType.CORPORATION):  90_000,
    (ApplicationType.BUSINESS_LICENSE,    ApplicantType.GOVERNMENT):   40_000,

    (ApplicationType.SUBSIDY,             ApplicantType.INDIVIDUAL):   30_000,
    (ApplicationType.SUBSIDY,             ApplicantType.CORPORATION):  60_000,
    (ApplicationType.SUBSIDY,             ApplicantType.GOVERNMENT):   20_000,

    (ApplicationType.IMPORT_EXPORT,       ApplicantType.INDIVIDUAL):   70_000,
    (ApplicationType.IMPORT_EXPORT,       ApplicantType.CORPORATION): 130_000,
    (ApplicationType.IMPORT_EXPORT,       ApplicantType.GOVERNMENT):   50_000,

    (ApplicationType.REAL_ESTATE_LICENSE, ApplicantType.INDIVIDUAL):  100_000,
    (ApplicationType.REAL_ESTATE_LICENSE, ApplicantType.CORPORATION): 180_000,
    (ApplicationType.REAL_ESTATE_LICENSE, ApplicantType.GOVERNMENT):   70_000,

    (ApplicationType.WASTE_PROCESSING,    ApplicantType.INDIVIDUAL):  120_000,
    (ApplicationType.WASTE_PROCESSING,    ApplicantType.CORPORATION): 220_000,
    (ApplicationType.WASTE_PROCESSING,    ApplicantType.GOVERNMENT):   80_000,
}


# ==================== 各種係数テーブル ====================

# 地域係数
REGION_MULTIPLIER: dict = {
    Region.SPECIAL_WARD:    1.30,  # 東京23区：手続き複雑・物価高
    Region.DESIGNATED_CITY: 1.15,  # 政令市：窓口対応コスト高
    Region.PREFECTURE:      1.00,  # 標準
    Region.RURAL:           0.85,  # 過疎地域：促進割引
}

# 優先度係数
PRIORITY_MULTIPLIER: dict = {
    Priority.STANDARD: 1.00,
    Priority.EXPRESS:  1.50,
    Priority.URGENT:   2.20,
}

# 複雑度係数
COMPLEXITY_MULTIPLIER: dict = {
    Complexity.SIMPLE:   0.80,
    Complexity.MODERATE: 1.00,
    Complexity.COMPLEX:  1.45,
    Complexity.EXTREME:  2.10,
}

# 事業規模係数（法人のみ適用）
BUSINESS_SCALE_MULTIPLIER: dict = {
    BusinessScale.MICRO:  0.75,
    BusinessScale.SMALL:  1.00,
    BusinessScale.MEDIUM: 1.30,
    BusinessScale.LARGE:  1.65,
}


# ==================== 追加料金テーブル ====================

ADDITIONAL_FEE: dict = {
    "legal_review":           50_000,   # 法務確認
    "translation_per_page":    3_000,   # 翻訳（1枚あたり）
    "cross_prefecture":       40_000,   # 複数都道府県対応
    "environmental_impact":  100_000,   # 環境影響評価対応
    "joint_application":      30_000,   # 共同申請手続き
    "correction_base":        15_000,   # 補正1回あたり基本
    "correction_escalation":  10_000,   # 補正2回目以降の追加（回数×この値）
}

# 書類超過料金（枚数段階制）
def document_surcharge(pages: int) -> int:
    """書類枚数に応じた追加料金"""
    if pages <= 10:
        return 0
    elif pages <= 30:
        return (pages - 10) * 500
    elif pages <= 60:
        return 10_000 + (pages - 30) * 800
    else:
        return 34_000 + (pages - 60) * 1_200


# ==================== 割引テーブル ====================

def repeat_discount_rate(past_applications: int) -> float:
    """過去申請件数に応じたリピーター割引率"""
    if past_applications == 0:
        return 0.00
    elif past_applications <= 2:
        return 0.05   # 5%
    elif past_applications <= 5:
        return 0.10   # 10%
    elif past_applications <= 10:
        return 0.15   # 15%
    else:
        return 0.20   # 20%（上限）

def package_discount_rate(sibling_count: int) -> float:
    """同時申請パッケージ割引"""
    if sibling_count == 0:
        return 0.00
    elif sibling_count == 1:
        return 0.08   # 2件同時: 8%
    elif sibling_count <= 3:
        return 0.15   # 3〜4件同時: 15%
    else:
        return 0.20   # 5件以上: 20%


# ==================== 季節・繁忙期係数 ====================

def seasonal_multiplier(submission_date: date) -> float:
    """提出月に応じた繁忙期係数"""
    month = submission_date.month
    # 年度末（2月・3月）は繁忙期
    if month in (2, 3):
        return 1.20
    # 年度初め（4月）も多忙
    elif month == 4:
        return 1.10
    # 夏季（7月・8月）は閑散期
    elif month in (7, 8):
        return 0.95
    # 年末（12月）はやや混雑
    elif month == 12:
        return 1.05
    else:
        return 1.00


# ==================== メイン料金算出関数 ====================

@dataclass
class FeeBreakdown:
    """料金明細"""
    app_id: str
    base_fee: int
    region_multiplied: int
    priority_multiplied: int
    complexity_multiplied: int
    scale_multiplied: int
    seasonal_adjusted: int
    additional_fees: dict
    additional_total: int
    subtotal_before_discount: int
    repeat_discount_amount: int
    package_discount_amount: int
    total_fee: int
    notes: list

    def to_dict(self) -> dict:
        return {
            "申請ID": self.app_id,
            "基本料金": f"¥{self.base_fee:,}",
            "地域係数適用後": f"¥{self.region_multiplied:,}",
            "優先度係数適用後": f"¥{self.priority_multiplied:,}",
            "複雑度係数適用後": f"¥{self.complexity_multiplied:,}",
            "規模係数適用後": f"¥{self.scale_multiplied:,}",
            "季節係数適用後": f"¥{self.seasonal_adjusted:,}",
            "追加料金明細": {k: f"¥{v:,}" for k, v in self.additional_fees.items()},
            "追加料金合計": f"¥{self.additional_total:,}",
            "割引前小計": f"¥{self.subtotal_before_discount:,}",
            "リピーター割引": f"▲¥{self.repeat_discount_amount:,}",
            "パッケージ割引": f"▲¥{self.package_discount_amount:,}",
            "最終料金（税別）": f"¥{self.total_fee:,}",
            "消費税（10%）": f"¥{int(self.total_fee * 0.1):,}",
            "最終料金（税込）": f"¥{int(self.total_fee * 1.1):,}",
            "備考": self.notes,
        }


def calculate_fee(req: ApplicationRequest) -> FeeBreakdown:
    """
    申請データから料金を算出するメイン関数。
    多段階の係数・割引・追加料金を順次適用する。
    """
    notes = []

    # ── Step 1: 基本料金 ──
    base = BASE_FEE_TABLE.get((req.app_type, req.applicant_type))
    if base is None:
        raise ValueError(f"未定義の組み合わせ: {req.app_type} × {req.applicant_type}")

    # ── Step 2: 地域係数 ──
    region_fee = int(base * REGION_MULTIPLIER[req.region])

    # ── Step 3: 優先度係数 ──
    priority_fee = int(region_fee * PRIORITY_MULTIPLIER[req.priority])
    if req.priority in (Priority.EXPRESS, Priority.URGENT):
        notes.append(f"優先処理({req.priority.value})対応")

    # ── Step 4: 複雑度係数 ──
    complexity_fee = int(priority_fee * COMPLEXITY_MULTIPLIER[req.complexity])

    # ── Step 5: 事業規模係数（法人のみ） ──
    if req.applicant_type == ApplicantType.CORPORATION:
        scale_fee = int(complexity_fee * BUSINESS_SCALE_MULTIPLIER[req.business_scale])
        notes.append(f"事業規模({req.business_scale.value})係数適用")
    elif req.applicant_type == ApplicantType.GOVERNMENT:
        # 行政機関は規模係数を MICRO 固定（行政優遇）
        scale_fee = int(complexity_fee * BUSINESS_SCALE_MULTIPLIER[BusinessScale.MICRO])
        notes.append("行政機関優遇係数適用")
    else:
        scale_fee = complexity_fee

    # ── Step 6: 季節・繁忙期係数 ──
    s_mult = seasonal_multiplier(req.submission_date)
    seasonal_fee = int(scale_fee * s_mult)
    if s_mult != 1.0:
        notes.append(f"繁忙期係数 ×{s_mult}")

    # ── Step 7: 追加料金（フラット加算） ──
    additional = {}

    if req.legal_review_required:
        additional["法務確認"] = ADDITIONAL_FEE["legal_review"]

    if req.translation_required:
        # 翻訳は書類枚数 × 単価（添付書類も含む）
        total_pages = req.document_pages + req.attachment_count
        t_fee = total_pages * ADDITIONAL_FEE["translation_per_page"]
        additional["翻訳料"] = t_fee

    if req.cross_prefecture:
        additional["複数都道府県対応"] = ADDITIONAL_FEE["cross_prefecture"]

    if req.environmental_impact:
        additional["環境影響評価"] = ADDITIONAL_FEE["environmental_impact"]
        notes.append("環境影響評価対応あり（追加審査期間が必要な場合あり）")

    if req.joint_application:
        additional["共同申請手続"] = ADDITIONAL_FEE["joint_application"]

    # 書類超過料金
    doc_sur = document_surcharge(req.document_pages)
    if doc_sur > 0:
        additional["書類超過料金"] = doc_sur

    # 補正追加料金（補正が発生した場合の後払い想定）
    if req.correction_count > 0:
        corr_fee = (ADDITIONAL_FEE["correction_base"]
                    + max(0, req.correction_count - 1) * ADDITIONAL_FEE["correction_escalation"])
        additional["補正対応料金"] = corr_fee
        notes.append(f"補正{req.correction_count}回（追加請求）")

    add_total = sum(additional.values())

    # ── Step 8: 小計 ──
    subtotal = seasonal_fee + add_total

    # ── Step 9: リピーター割引 ──
    r_rate = repeat_discount_rate(req.past_applications)
    repeat_disc = int(subtotal * r_rate)
    if repeat_disc > 0:
        notes.append(f"リピーター割引 {int(r_rate*100)}%（過去{req.past_applications}件）")

    # ── Step 10: パッケージ割引 ──
    p_rate = package_discount_rate(len(req.package_siblings))
    # パッケージ割引はリピーター割引後の金額に適用
    after_repeat = subtotal - repeat_disc
    package_disc = int(after_repeat * p_rate)
    if package_disc > 0:
        notes.append(f"パッケージ割引 {int(p_rate*100)}%（{len(req.package_siblings)+1}件同時申請）")

    # ── Step 11: 最終料金（端数 100円切り上げ） ──
    raw_total = after_repeat - package_disc
    total = ((raw_total + 99) // 100) * 100  # 100円単位に切り上げ

    return FeeBreakdown(
        app_id=req.app_id,
        base_fee=base,
        region_multiplied=region_fee,
        priority_multiplied=priority_fee,
        complexity_multiplied=complexity_fee,
        scale_multiplied=scale_fee,
        seasonal_adjusted=seasonal_fee,
        additional_fees=additional,
        additional_total=add_total,
        subtotal_before_discount=subtotal,
        repeat_discount_amount=repeat_disc,
        package_discount_amount=package_disc,
        total_fee=total,
        notes=notes,
    )


# ==================== デモ実行 ====================

if __name__ == "__main__":
    # テストケース定義
    test_cases = [
        # ケース1: シンプルな個人営業許可
        ApplicationRequest(
            app_id="APP-001",
            app_type=ApplicationType.BUSINESS_LICENSE,
            applicant_type=ApplicantType.INDIVIDUAL,
            region=Region.PREFECTURE,
            priority=Priority.STANDARD,
            complexity=Complexity.SIMPLE,
            business_scale=BusinessScale.MICRO,
            document_pages=5,
            attachment_count=3,
            submission_date=date(2025, 6, 15),
        ),

        # ケース2: 大企業の建設工事許可（急ぎ・複雑・東京）
        ApplicationRequest(
            app_id="APP-002",
            app_type=ApplicationType.CONSTRUCTION_PERMIT,
            applicant_type=ApplicantType.CORPORATION,
            region=Region.SPECIAL_WARD,
            priority=Priority.EXPRESS,
            complexity=Complexity.COMPLEX,
            business_scale=BusinessScale.LARGE,
            document_pages=45,
            attachment_count=20,
            legal_review_required=True,
            cross_prefecture=True,
            past_applications=8,
            submission_date=date(2025, 3, 10),  # 繁忙期
        ),

        # ケース3: パッケージ申請（産廃+宅建業、法人中規模）
        ApplicationRequest(
            app_id="APP-003",
            app_type=ApplicationType.WASTE_PROCESSING,
            applicant_type=ApplicantType.CORPORATION,
            region=Region.DESIGNATED_CITY,
            priority=Priority.STANDARD,
            complexity=Complexity.EXTREME,
            business_scale=BusinessScale.MEDIUM,
            document_pages=75,
            attachment_count=35,
            legal_review_required=True,
            environmental_impact=True,
            joint_application=True,
            correction_count=2,
            package_siblings=["APP-004"],
            submission_date=date(2025, 2, 20),  # 年度末繁忙期
        ),

        # ケース4: 輸出入許可（翻訳あり、最急）
        ApplicationRequest(
            app_id="APP-004",
            app_type=ApplicationType.IMPORT_EXPORT,
            applicant_type=ApplicantType.CORPORATION,
            region=Region.DESIGNATED_CITY,
            priority=Priority.URGENT,
            complexity=Complexity.MODERATE,
            business_scale=BusinessScale.SMALL,
            document_pages=18,
            attachment_count=10,
            translation_required=True,
            past_applications=3,
            package_siblings=["APP-003"],
            submission_date=date(2025, 2, 20),
        ),

        # ケース5: 行政機関の補助金申請（特別区・通常）
        ApplicationRequest(
            app_id="APP-005",
            app_type=ApplicationType.SUBSIDY,
            applicant_type=ApplicantType.GOVERNMENT,
            region=Region.SPECIAL_WARD,
            priority=Priority.STANDARD,
            complexity=Complexity.MODERATE,
            business_scale=BusinessScale.LARGE,  # 行政には規模係数不適用（上書き）
            document_pages=22,
            submission_date=date(2025, 8, 5),  # 閑散期
        ),
    ]

    print("=" * 70)
    print("  複雑な事務処理ロジック：料金算出マトリックス エンジン — デモ実行")
    print("=" * 70)

    results = []
    for req in test_cases:
        result = calculate_fee(req)
        d = result.to_dict()
        results.append(d)
        print(f"\n【{req.app_id}】{req.app_type.name} / {req.applicant_type.value}")
        print(json.dumps(d, ensure_ascii=False, indent=2))

    print("\n" + "=" * 70)
    print("  料金サマリー比較")
    print("=" * 70)
    for i, (r, req) in enumerate(zip(results, test_cases)):
        print(f"  {req.app_id}: {req.app_type.name:25s} → {r['最終料金（税込）']}")
