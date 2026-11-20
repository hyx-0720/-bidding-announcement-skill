# 招标公告生成 Skill — 目录结构全览

> 共 39 个文件。本文件逐目录、逐文件说明用途与范围。

## 树形结构

```
.opencode/skills/bidding-announcement/
│
├── SKILL.md                         ← 总调度（6 阶段工作流 + 参考文件清单 + 环境前置）
├── USAGE.md                         ← 用户使用说明（功能概述 / 场景矩阵 / 常见问题）
│
├── references/                      ← 知识引用层（profile / 条款 / 合规 / 法条库 / 索引）
│   │
│   ├── regimes.md                  场景选择与调度表：身份→regime id→profile 文件
│   ├── intake-guide.md             信息收集双模式协议：一次性填写 vs 分步引导（含新手开场）
│   ├── CLAUSE-INDEX.md             条款速查索引：条号 → legal-kb 文件路径快速映射
│   ├── categories.md               工程/货物/服务 三类标的的字段标签差异（跨场景复用）
│   ├── sections-library.md         章节积木库：14 个预置章节块（自定义场景组装用）
│   │
│   ├── profiles/                   五场景自包含文档（问卷 + 模板 + 规则 + 术语）
│   │   ├── gov-procurement.md          政府采购 — 6 步/24 字段，7 章模板
│   │   ├── construction-tender.md      工程建设招标 — 7 步/20 字段，7 章模板
│   │   ├── enterprise-tender.md        企业自主招标 — 5 步/12 字段，8 章柔性模板
│   │   ├── international-tender.md     国际招标 ICB — 6 步英文问卷，7 章英文模板
│   │   └── custom.md                   完全自定义 — A 提取模板 / B 积木组装（6 步）
│   │
│   ├── clauses/                   高频条款预提取（≤15KB，公告生成首选来源）
│   │   ├── gov-procurement.md          政采 5 条：22 条/信用/拒绝/中小企业/政策清单
│   │   ├── construction.md             工程 6 条：招标条件/资格/审查/保证金/信用/媒介
│   │   ├── international.md            国际 8 条：Eligibility/Conflict/Fraud/Bid Security/等
│   │   └── common.md                   通用 5 条：免责/保密/保留权利/解释权/联合体
│   │
│   ├── compliance/               合规审查规则（脚本 check_compliance.py 的参考文档）
│   │   ├── gov-procurement.md          政采强合规：5 维度 + 输入格式 + 语义要求
│   │   ├── construction.md             工程强合规：含保证金≤2% 上限 + 英文歧视性
│   │   └── international.md            国际中合规：英文条款完整性 + 30 日 ICB 建议
│   │
│   └── legal-kb/                 法律条款知识库（12 部法规全文，人工从权威来源导入）
│       ├── INGEST-PROTOCOL.md         导入与校核规范（合法性/五步流程/守则/更新）
│       ├── SOURCE-GUIDE.md            16 部法规的官方来源路径 + 检索关键词
│       ├── index.md                    总索引表（12 部 + 校核状态）
│       ├── _TEMPLATE.md                单法规条目模板（YAML 元数据 + 条文区）
│       │
│       ├── [gov 场景 6 部]
│       │   ├── zhengfucaigou-fa.md              政府采购法（30 KB，88 条）
│       │   ├── zhengfucaigou-fa-shishitiaoli.md  实施条例（34 KB，79 条）
│       │   ├── caiku-2016-125.md                 财库〔2016〕125 号（6 KB）
│       │   ├── zhengfucaigou-huowu-fuwu-banfa.md 87 号令（41 KB，88 条）
│       │   ├── zhongxiaocujin-fa.md              中小企业促进法（19 KB，61 条）
│       │   └── zhongxiao-qiye-banfa.md           划型标准规定（8 KB，16 行业）
│       │
│       ├── [construction 场景 4 部]
│       │   ├── zhaobiaotoubiao-fa.md             招标投标法（25 KB，68 条）
│       │   ├── zhaobiaotoubiao-fa-shishitiaoli.md实施条例（38 KB，85 条）
│       │   ├── bixu-zhaobiao-guiding.md          必须招标规定（2.4 KB，6 条）
│       │   └── gongcheng-shigong-zhaobiao-banfa.md施工招标投标办法（39 KB，92 条）
│       │
│       └── [enterprise 场景 2 部]
│           ├── minfadian-hetongbian.md            民法典·合同编（144 KB，约 500 条）
│           └── minfadian-hetong-sifa-jieshi.md    民法典合同编通则司法解释（50 KB，69 条）
│
└── scripts/                        ← 执行脚本（Node + Python）
    │
    ├── render_docx.js              DOCX 渲染器（docx-js，Node）
    │                                 输入：blocks JSON + 可选 settings（字体/字号/主色/页边距）
    │                                 用法：$env:NODE_PATH=(npm root -g); node render_docx.js in.json out.docx
    │
    ├── render_pdf.py               PDF 渲染器（reportlab，Python）
    │                                 与 render_docx.js 共用 blocks JSON
    │                                 中文走内置 CID 字体 STSong-Light，可选 settings.font_path 指定 TTF
    │                                 用法：python render_pdf.py in.json out.pdf
    │
    ├── check_compliance.py         合规审查引擎（Python 标准库）
    │                                 5 维度：法规完整性 / 逻辑一致性 / 公告期限 / 歧视性 / 政策
    │                                 --regime gov|construction|international|enterprise|none 分别调度
    │                                 含中英文歧视性关键词扫描，退出码 1 = 有错误
    │
    ├── extract_style.py            样式提取器（Python，zipfile + xml.etree）
    │                                 从已有 .docx 读取 XML（styles.xml + document.xml）
    │                                 输出 render_docx.js 可用的 settings JSON
    │                                 提取项：默认字体/字号/页边距/标题颜色与对齐
    │
    └── lookup_clause.py            条款精准提取工具（Python）
    │                                 从 legal-kb 文件中按条号提取单条原文
    │                                 --index  列出所有法规及条号范围
    │                                 <文件> <条号>  提取指定条
    │                                 --search "关键词"  搜索含关键词的条款
    │                                 支持中文数字（第二十二条/一百二十五条）→ 阿拉伯数字（22/125）
```

## 角色速查表

| 角色 | 需要读的文件 | 数量 |
|------|-------------|------|
| **用户（生成公告）** | 无需读文件，对话自然交互 | 0 |
| **用户（了解功能）** | `USAGE.md` | 1 |
| **AI 调度（阶段零～五）** | `SKILL.md` → `regimes.md` → 对应 `profiles/*.md` → `clauses/*.md` → `compliance/*.md` | 5~6 |
| **AI 查法规条款** | `CLAUSE-INDEX.md` 或 `lookup_clause.py` | 1~2 |
| **AI 导出文档** | 调用 `render_docx.js` / `render_pdf.py` | 1 |
| **AI 自定义组装** | `sections-library.md` + `profiles/custom.md` | 2 |
| **维护人员（录法条）** | `legal-kb/INGEST-PROTOCOL.md` + `SOURCE-GUIDE.md` | 2 |
| **维护人员（增场景）** | 复制 `_TEMPLATE.md`（legal-kb）或参考现有 `profiles/*.md` | 1 |

## 数据流总览

```
用户指令
  │
  ▼
阶段零 ──→ regimes.md ──→ 选定 profile（gov/construction/enterprise/international/custom）
  │
  ▼
阶段一 ──→ intake-guide.md（双模式） + profile 问卷
  │
  ▼
阶段二 ──→ 查条款：①clauses/*.md → ②CLAUSE-INDEX.md → ③lookup_clause.py ──→ 生成 Markdown
  │
  ▼
阶段三 ──→ check_compliance.py --regime <场景> ──→ 审查报告
  │
  ▼
阶段四/五 ──→ 同一份 blocks JSON ──→ render_docx.js（DOCX） / render_pdf.py（PDF）
```

## 法律条款引用路径

```
生成公告需要某条款
  │
  ├── 命中 ──→ clauses/*.md 预提取（≤15KB）────────→ 逐字嵌入
  │
  ├── 未命中 ──→ CLAUSE-INDEX.md（5KB）──────────→ 定位文件 + 条号
  │                    │
  │                    └──→ lookup_clause.py <文件> <条号>（~50ms）─→ 逐字嵌入
  │
  └── KB 缺失 ──→ 提示"缺权威来源，待人工补充"（绝不生成）
```
