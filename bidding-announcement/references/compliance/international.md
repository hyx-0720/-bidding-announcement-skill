# 合规审查规则 — 国际招标（regime: international）

> 配套脚本：`scripts/check_compliance.py --regime international`。本场景为**中合规**。

## 审查维度

| 维度 | 检查内容 | 判定方 |
|------|----------|--------|
| 法规/条款完整性 | 含 Eligibility、Conflict of Interest、Fraud/Corruption 条款 | 脚本（关键词存在性） |
| 逻辑一致性 | 获取文件截止 ≤ 投标截止；保证金金额填写时校验合理性（≥0） | 脚本（日期/数值比较） |
| 公告期限 | 投标期（公告发布至投标截止）建议 ≥ 30 日（ICB 惯例，非强制） | 脚本（提示，非错误） |
| 歧视性条款 | 疑似：specify brand / local registration required / national exclusivity / discriminatory qualification / country restriction | 脚本扫词（警告） + LLM 语义复核 |
| 合规提示 | 是否根据资金方（世行/亚行/等）的采购政策引用了正确的条款集 | LLM / 人工（提示） |

## 严重级别（同其他场景）

- **错误**：强制条款缺失，发布前必须修正（退出码 1）。
- **警告**：疑似问题（歧视性表述、期限不足），需人工确认。
- **提示**：建议性事项。
- **通过**：检查通过。

## 输入 JSON（`fields` 关键项）

```json
{
  "text": "<full announcement text>",
  "fields": {
    "procurement_method": "ICB|LIB|RFP",
    "category": "works|goods|services",
    "publish_date": "YYYY-MM-DD",
    "doc_get_start": "YYYY-MM-DD",
    "doc_get_deadline": "YYYY-MM-DD",
    "bid_deadline": "YYYY-MM-DDTHH:MM",
    "bid_security_wan": 0,
    "funding_source": "World Bank|ADB|..."
  }
}
```

## 脚本之外（LLM 必做语义审查）

- 资格条件是否排斥合法的国际投标人（如"必须已在本地设立实体"）。
- 技术规格是否指向特定品牌/产地而拒绝同等替代。
- 是否符合特定资金方的采购政策（世行/亚行等有各自 Procurement Regulations）。
- 双语公告的中英文对照是否一致。

## 呈现

同其他场景。先列「错误」并给修改建议；强调最终合规责任由招标人/代理机构承担。
