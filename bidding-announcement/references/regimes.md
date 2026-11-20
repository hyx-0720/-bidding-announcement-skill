# 招标公告场景调度（regimes）

> 阶段零使用：先确定用户身份与类型，映射到对应 profile，再据 profile 驱动后续问卷/模板/条款/合规/术语。

## 选择流程

### 第 1 问：身份 / 场景
> 请选择您要生成的招标公告类型：
> 1. **政府采购**（适用《政府采购法》，发布于中国政府采购网）
> 2. **工程建设招标**（适用《招标投标法》，依法必招的工程及相关货物/服务）
> 3. **企业自主招标**（企业/国企自主采购，格式较自由，无强制法定条款）
> 4. **完全自定义**（自行决定章节、条款、术语与样式；可上传已有公告提取格式与结构模板）
> 5. **国际招标**（International Competitive Bidding / RFP，English-first，ICB/世行/亚行等框架）

### 第 2 问：标的类型（场景 1/2/3/5 需要；场景 4 在组装中决定）
- 政府采购 / 工程建设 / 企业自主 / 国际：货物 / 工程 / 服务（工程建设含"与工程有关的货物/服务"；国际为 Goods / Works / Services）

### 第 3 问：公告生成语言（全部场景）
> 请选择公告生成语言：
> A. **中文**（默认，除国际招标以 English 为默认）
> B. **English**（英文）
> C. **中英双语**（中外文对照，英文为主或中文为主均可）

双语模式：优先按场景主体语言出主版，再附加译文版。如国际场景 English 为主 + 中文译附。语言选择流入后续问卷/模板/条款的语种以及合规审查的关键词语种。

## 调度表

| 用户选择 | regime id | profile 文件 | 条款库 | 合规标志 | 默认语言 |
|----------|-----------|--------------|--------|----------|----------|
| 1 政府采购 | `gov` | `profiles/gov-procurement.md` | `clauses/gov-procurement.md` | `--regime gov`（强） | 中文 |
| 2 工程建设招标 | `construction` | `profiles/construction-tender.md` | `clauses/construction.md` | `--regime construction`（强） | 中文 |
| 3 企业自主招标 | `enterprise` | `profiles/enterprise-tender.md` | `clauses/common.md` | `--regime enterprise`（弱） | 中文 |
| 4 完全自定义 | `custom` | `profiles/custom.md` | 任选 / 自填 | `--regime none`（默认关闭） | 中文 |
| 5 国际招标 | `international` | `profiles/international-tender.md` | `clauses/international.md` | `--regime international`（中） | English |

## 调度后
载入对应 profile 文件，按其「问卷 → 生成规则 → 模板」执行 SKILL.md 的后续阶段。`custom` 走 profile 内的组装子流程。标的类型差异统一参考 `categories.md`。
