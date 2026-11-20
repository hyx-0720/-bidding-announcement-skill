#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
招标公告合规审查（确定性规则校验）

用法：
  python check_compliance.py <input.json> [--regime gov|construction|enterprise|custom|none] [--out report.md]

--regime：gov/construction 为强合规（检查法定条款完整性、法定期限等）；
          enterprise/custom/none 仅做逻辑一致性 + 歧视性提示。

input.json 结构（字段均可选，缺失则相应检查跳过并给提示）：
{
  "text": "<整篇公告的纯文本/Markdown>",
  "fields": {
    "procurement_method": "公开招标",
    "category": "engineering | goods | service",
    "publish_date": "2026-06-23",
    "doc_get_start": "2026-06-24",
    "doc_get_deadline": "2026-06-30",
    "bid_deadline": "2026-07-15T09:30",
    "budget_wan": 300,
    "ceiling_wan": null,
    "for_sme_only": false,
    "imported_goods_allowed": null
  }
}

退出码：发现「错误」级问题返回 1，否则 0。
仅做确定性校验；歧视性/政策语义的最终判断仍需人工与 LLM 复核（见 references/compliance/ 下对应场景规则）。
"""

import sys
import io
import json
import re
import argparse
from datetime import datetime, date

# 确保中文输出不受 Windows 控制台 GBK 影响
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
except Exception:
    pass

ERROR, WARN, INFO, OKLEVEL = "错误", "警告", "提示", "通过"

# 歧视性/排他性表述关键词（命中即提示人工复核，非绝对违规）
DISCRIMINATORY = [
    (r"指定品牌|特定品牌|指定生产厂家|指定厂商|指定供应商", "疑似指定品牌/厂商"),
    (r"名牌|驰名商标|著名商标|名优产品", "疑似以荣誉/奖项作为资格条件"),
    (r"注册资[本金][^。；\n]{0,12}(不低于|不少于|大于|≥|不得低于)", "疑似注册资本门槛限制"),
    (r"(仅限|限于|须为|必须是)[^。；\n]{0,8}(本地|本市|本省|当地|本区域)", "疑似地域限制"),
    (r"(在|于)[^。；\n]{0,8}(本地|本市|本省|当地)[^。；\n]{0,6}(设立|注册|有分支机构|有办公场所)", "疑似要求本地注册/设立"),
    (r"特定行政区域", "疑似行政区域限制"),
    (r"必须为进口|仅接受进口|只采购进口", "疑似限定进口（需进口产品论证）"),
    (r"指定[^。；\n]{0,6}专利", "疑似指定特定专利"),

    # English patterns for international bidding
    (r"(?i)(specify|specified|specific|particular|named)\s+brand", "疑似指定品牌 (specified brand)"),
    (r"(?i)(must\s+be\s+(registered|established|incorporated)\s+in\s+the|locally\s+registered|local\s+registration)", "疑似地域/国别限制 (local registration)"),
    (r"(?i)(exclusively\s+from|only\s+from\s+\w+\s+(manufacturer|supplier)|national\s+exclusivity)", "疑似国别排斥"),
    (r"(?i)(registered\s+capital\s+not\s+less|net\s+worth\s+exceeding|minimum\s+(annual\s+)?turnover\s+of|paid-up\s+capital\s+not\s+less)", "疑似财务门槛限制 (capital threshold)"),
    (r"(?i)(award[-\s]winning|prize[-\s]winning|patented\s+(product|technology)|certified\s+by\s+\w+\s+only)", "疑似以特定认证/奖项/专利作条件"),
    (r"(?i)(the\s+equipment\s+must\s+be\s+origin|origin\s+restriction|country\s+of\s+origin)", "疑似原产地限制"),
]



def parse_dt(s):
    if not s:
        return None
    s = str(s).strip().replace("/", "-")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        try:
            return datetime.combine(date.fromisoformat(s), datetime.min.time())
        except ValueError:
            return None


def business_days(d1, d2):
    """d1, d2 为 date；返回 (d1, d2] 内的工作日天数（不计周末，不含节假日表）。"""
    if d1 > d2:
        return 0
    n, cur = 0, d1
    from datetime import timedelta
    while cur < d2:
        cur += timedelta(days=1)
        if cur.weekday() < 5:
            n += 1
    return n


class Report:
    def __init__(self):
        self.items = []

    def add(self, level, dim, msg):
        self.items.append((level, dim, msg))

    @property
    def has_error(self):
        return any(i[0] == ERROR for i in self.items)

    def render(self):
        order = {ERROR: 0, WARN: 1, INFO: 2, OKLEVEL: 3}
        items = sorted(self.items, key=lambda x: order.get(x[0], 9))
        n_err = sum(1 for i in self.items if i[0] == ERROR)
        n_warn = sum(1 for i in self.items if i[0] == WARN)
        n_info = sum(1 for i in self.items if i[0] == INFO)
        lines = ["# 招标公告合规审查报告", ""]
        lines.append(f"结论：错误 {n_err} 项，警告 {n_warn} 项，提示 {n_info} 项。")
        lines.append("")
        if n_err == 0:
            lines.append("> 未发现确定性「错误」级问题。警告/提示项请人工复核后发布。")
        else:
            lines.append("> **存在错误级问题，发布前必须修正。**")
        lines.append("")
        for level, dim, msg in items:
            lines.append(f"- [{level}]（{dim}）{msg}")
        lines.append("")
        lines.append("---")
        lines.append("注：本报告为确定性规则校验。歧视性条款与政策符合性的最终判断仍需结合人工与语义审查（见 references/compliance/ 下对应场景规则）。")
        return "\n".join(lines)


CLAUSE_CHECKS = {
    "gov": [
        ("第二十二条", "缺少《政府采购法》第二十二条资格条款"),
        (r"125\s*号|财库〔2016〕125", "缺少财库〔2016〕125号信用记录查询条款"),
        ("拒绝下述供应商", "缺少拒绝参加条款（单位负责人/关联方/失信名单）"),
    ],
    "construction": [
        (r"资格预审|资格后审", "缺少资格审查方式（资格预审/资格后审）说明"),
        (r"信用中国|creditchina", "缺少信用与失信限制条款（信用中国查询）"),
        (r"中国招标投标公共服务平台|公共资源交易|发布媒介", "缺少依法必招项目发布媒介说明"),
    ],
    "international": [
        (r"(?i)eligib(le|ility)", "缺少 Eligibility 条款（合格投标人范围）"),
        (r"(?i)conflict\s+of\s+interest", "缺少 Conflict of Interest 条款"),
        (r"(?i)(fraud|corrupt(ion)?\s|sanction|debarred|blacklist)", "缺少 Fraud/Corruption/Sanctions 条款"),
    ],
}


def check_clause_completeness(text, rep, regime):
    checks = CLAUSE_CHECKS.get(regime)
    if checks is None:
        rep.add(INFO, "法规完整性", f"场景 {regime} 无强制法定条款检查（仅企业自主/自定义）。")
        return
    if not text:
        rep.add(INFO, "法规完整性", "未提供公告全文，跳过条款完整性检查。")
        return
    for pat, miss_msg in checks:
        if re.search(pat, text):
            rep.add(OKLEVEL, "法规完整性", f"已包含：{miss_msg.replace('缺少', '')}")
        else:
            rep.add(ERROR, "法规完整性", miss_msg)


def check_logic(f, rep, regime):
    publish = parse_dt(f.get("publish_date"))
    get_start = parse_dt(f.get("doc_get_start"))
    get_deadline = parse_dt(f.get("doc_get_deadline"))
    bid_deadline = parse_dt(f.get("bid_deadline"))

    # 获取截止 ≤ 投标截止
    if get_deadline and bid_deadline:
        if get_deadline > bid_deadline:
            rep.add(ERROR, "逻辑一致性", "招标文件获取截止时间晚于投标截止时间。")
        else:
            rep.add(OKLEVEL, "逻辑一致性", "获取截止时间不晚于投标截止时间。")
    else:
        rep.add(INFO, "逻辑一致性", "获取截止/投标截止时间不全，跳过先后校验。")

    # 预算 ≥ 最高限价
    budget = f.get("budget_wan")
    ceiling = f.get("ceiling_wan")
    if isinstance(budget, (int, float)) and isinstance(ceiling, (int, float)):
        if budget < ceiling:
            rep.add(ERROR, "逻辑一致性", f"预算金额（{budget}万元）低于最高限价（{ceiling}万元）。")
        else:
            rep.add(OKLEVEL, "逻辑一致性", "预算金额不低于最高限价。")
    elif ceiling in (None, "", "无"):
        pass
    else:
        rep.add(INFO, "逻辑一致性", "预算或最高限价非数值，跳过比较。")

    # 工程建设：投标保证金 ≤ 招标项目估算价 × 2%
    if regime == "construction":
        sec = f.get("bid_security_wan")
        est = f.get("estimated_price_wan")
        if isinstance(sec, (int, float)) and isinstance(est, (int, float)) and est > 0:
            if sec > est * 0.02:
                rep.add(ERROR, "逻辑一致性", f"投标保证金（{sec}万元）超过招标项目估算价的 2%（上限 {round(est * 0.02, 4)}万元）。")
            else:
                rep.add(OKLEVEL, "逻辑一致性", "投标保证金不超过估算价的 2%。")
        elif isinstance(sec, (int, float)):
            rep.add(INFO, "逻辑一致性", "已填投标保证金但缺估算价，无法校验 2% 上限。")


def check_periods(f, rep, regime=""):
    method = (f.get("procurement_method") or "").strip()
    is_open = "公开招标" in method or "ICB" in method.upper() or f.get("is_open_tender") is True or method == ""
    publish = parse_dt(f.get("publish_date"))
    get_start = parse_dt(f.get("doc_get_start"))
    get_deadline = parse_dt(f.get("doc_get_deadline"))
    bid_deadline = parse_dt(f.get("bid_deadline"))

    # 投标期：国内公开招标 ≥ 20 日；国际 ICB 建议 ≥ 30 日
    start_for_bid = get_start or publish
    min_days = 30 if regime == "international" else 20
    tag = "ICB 国际竞争性招标" if regime == "international" else "公开招标"
    if is_open and start_for_bid and bid_deadline:
        days = (bid_deadline.date() - start_for_bid.date()).days
        if days < min_days:
            level = WARN if regime == "international" else ERROR
            rep.add(level, "公告期限", f"{tag}投标期约 {days} 日，{'建议不少于' if regime=='international' else '不足'} {min_days} 日。")
        else:
            rep.add(OKLEVEL, "公告期限", f"{tag}投标期约 {days} 日，满足不少于 {min_days} 日。")
    else:
        rep.add(INFO, "公告期限", "投标期所需日期不全或非公开招标/ICB，跳过期限校验。")

    # 文件获取/发售期 ≥ 5 个工作日
    if get_start and get_deadline:
        bd = business_days(get_start.date(), get_deadline.date())
        if bd < 5:
            rep.add(WARN, "公告期限", f"招标文件获取期约 {bd} 个工作日（未计法定节假日），可能不足 5 个工作日，请核实。")
        else:
            rep.add(OKLEVEL, "公告期限", f"招标文件获取期约 {bd} 个工作日，满足不少于 5 个工作日（未计节假日）。")
    else:
        rep.add(INFO, "公告期限", "未提供文件获取起止日期，跳过 5 个工作日校验。")


def check_discriminatory(text, rep):
    if not text:
        rep.add(INFO, "歧视性条款", "未提供公告全文，跳过歧视性表述扫描。")
        return
    hits = []
    for pat, label in DISCRIMINATORY:
        for m in re.finditer(pat, text):
            seg = text[max(0, m.start() - 8): m.end() + 8].replace("\n", " ")
            hits.append((label, seg))
    if hits:
        for label, seg in hits:
            rep.add(WARN, "歧视性条款", f"{label}：…{seg}… —— 请人工确认是否构成不合理限制。")
    else:
        rep.add(OKLEVEL, "歧视性条款", "未扫描到常见歧视性/排他性关键词（仍建议人工语义复核）。")


def check_policy(f, text, rep):
    budget = f.get("budget_wan")
    for_sme = f.get("for_sme_only")
    if isinstance(budget, (int, float)) and not for_sme:
        if text and ("中小企业" not in text):
            rep.add(INFO, "政策符合性", "未面向中小企业且未提及中小企业政策，请核实是否需落实中小企业预留份额。")
    if f.get("category") == "goods":
        allowed = f.get("imported_goods_allowed")
        if allowed in (None, False) and text and ("本国产品" not in text and "进口" not in text):
            rep.add(INFO, "政策符合性", "货物类项目建议明确本国产品标准/是否接受进口产品。")


def main():
    ap = argparse.ArgumentParser(description="招标公告合规审查（确定性校验）")
    ap.add_argument("input", help="输入 JSON 路径")
    ap.add_argument("--regime", default="gov",
                    choices=["gov", "construction", "enterprise", "custom", "none", "international"],
                    help="场景：gov/construction/international 强合规；enterprise/custom/none 仅逻辑+歧视性")
    ap.add_argument("--out", help="将报告写入该 Markdown 文件（UTF-8）")
    args = ap.parse_args()

    try:
        raw = open(args.input, "r", encoding="utf-8-sig").read()
        data = json.loads(raw)
    except Exception as e:
        print("读取/解析输入 JSON 失败：" + str(e), file=sys.stderr)
        sys.exit(2)

    text = data.get("text") or ""
    fields = data.get("fields") or {}
    regime = args.regime
    strong_clause = regime in ("gov", "construction", "international")

    rep = Report()
    check_clause_completeness(text, rep, regime)          # clause checks per regime
    check_logic(fields, rep, regime)                      # logic: all regimes
    if strong_clause:
        check_periods(fields, rep, regime)                # periods: gov/construction/international
    check_discriminatory(text, rep)                       # all regimes: CN + EN patterns
    if regime == "gov":
        check_policy(fields, text, rep)                   # policy: gov only
    if regime == "international":
        source = fields.get("funding_source") or ""
        if source:
            rep.add(INFO, "政策符合性", f"资金方：{source}——请确认公告是否符合对应采购政策（如世行/亚行 Procurement Regulations）。")
        else:
            rep.add(INFO, "政策符合性", "未指定资金方/采购框架，请确认适用的采购政策。")

    out = rep.render()
    print(out)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fp:
            fp.write(out)

    sys.exit(1 if rep.has_error else 0)


if __name__ == "__main__":
    main()
