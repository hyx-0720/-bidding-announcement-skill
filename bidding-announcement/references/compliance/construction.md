# 合规审查规则 — 工程建设招标（regime: construction）

> 配套脚本：`scripts/check_compliance.py --regime construction`。本场景为**强合规**，但规则不同于政府采购。

## 审查维度

| 维度 | 检查内容 | 判定方 |
|------|----------|--------|
| 法规完整性 | 含资格审查方式（资格预审/资格后审）表述、信用限制（信用中国）、依法必招项目发布媒介说明 | 脚本（关键词存在性） |
| 逻辑一致性 | 获取文件截止 ≤ 投标截止；（如填）投标保证金 ≤ 招标项目估算价 × 2% | 脚本（日期/数值比较） |
| 公告期限 | 公开招标自招标文件开始出售之日起至投标截止 ≥ 20 日；文件获取期 ≥ 5 个工作日 | 脚本（工作日未计节假日） |
| 歧视性条款 | 指定品牌/厂商、地域限制（要求本地注册/设立）、注册资本门槛、以特定奖项作条件、限定特定行政区域 | 脚本扫词（提示）+ LLM/人工语义判定 |
| 资质必要性 | 资质类别/等级是否与工程类别、规模匹配，是否超出必要 | LLM/人工 |

## 与政采的差异（脚本规则切换要点）

- **不检查**政府采购法第二十二条、财库125号（属政采体系）。
- 法规完整性检查项改为：`资格预审|资格后审`、`信用中国`、发布媒介（`中国招标投标公共服务平台|公共资源交易`）。
- 新增逻辑校验：`bid_security_wan ≤ estimated_price_wan × 0.02`（两者均提供时）。

## 输入 JSON（`fields` 关键项，相对政采增量）

```json
{
  "text": "<公告全文>",
  "fields": {
    "procurement_method": "公开招标|邀请招标",
    "category": "engineering|goods|service",
    "publish_date": "YYYY-MM-DD",
    "doc_get_start": "YYYY-MM-DD",
    "doc_get_deadline": "YYYY-MM-DD",
    "bid_deadline": "YYYY-MM-DDTHH:MM",
    "estimated_price_wan": 0,
    "bid_security_wan": 0,
    "qualification_review": "pre|post",
    "publish_media": "中国招标投标公共服务平台"
  }
}
```

## 严重级别 / 呈现

同政采（错误/警告/提示/通过；先列错误并给修改建议）。最终合规责任由招标人/招标代理机构承担。
