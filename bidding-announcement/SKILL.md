---
name: bidding-announcement
description: Use when the user asks to generate a bidding announcement, tender notice, 招标公告, or 招标文件. Also use when the user says "写一份招标公告", "生成招标文件", "帮我写个招标公告", or "make a bidding notice".
---

# 招标公告生成 Skill（多场景）

## 目的
按用户场景生成招标公告，覆盖**政府采购、工程建设招标、企业自主招标、完全自定义**四类，不同场景使用不同的格式、术语、法定条款与合规强度，并可一键导出 Word（.docx）。

## 设计：场景分发（regime）
先选身份/类型，载入对应 profile，再由 profile 驱动问卷/模板/条款/合规/术语。新增场景只需加 profile。

## 参考文件
- `references/regimes.md` — 场景选择与调度表（阶段零必读）
- `references/intake-guide.md` — 信息收集的两种模式与分步引导协议（阶段一必读）
- `references/profiles/{gov-procurement,construction-tender,enterprise-tender,custom}.md` — 各场景的问卷/模板/规则
- `references/clauses/{gov-procurement,construction,common}.md` — 各体系法定/通用条款（原文引用，不得改写）
- `references/compliance/{gov-procurement,construction}.md` — 合规规则
- `references/categories.md` — 工程/货物/服务标的差异
- `references/sections-library.md` — 章节积木库（自定义场景用）
- `references/legal-kb/` — 法律条款知识库（当前为骨架；导入与校核规范见 `legal-kb/INGEST-PROTOCOL.md`）
- `references/CLAUSE-INDEX.md` — 条款速查索引（条号 → 文件路径快速映射）
- `scripts/lookup_clause.py` — 条款精准提取工具（`--index | <文件> <条号> | --search "关键词"`）

## 工作流程

### 阶段零：选择身份、类型与语言（必做）
读取 `references/regimes.md`，按「选择流程」三步提问，不要继续直到用户完成：
1. **身份/场景**（政府采购 / 工程建设招标 / 企业自主招标 / 完全自定义 / **国际招标**）。
2. **标的类型**（货物/工程/服务；国际为 Goods/Works/Services；自定义场景在组装中决定）。
3. **公告语言**（中文 / English / 中英双语）。国际招标默认 English，其余默认中文；双语版在主体语言版后附译文。

据调度表确定 `regime id` 与默认语言，**载入对应 profile 文件**。语言设置传入后续所有阶段（问卷语种、模板语种、条款语种、合规关键词匹配语种）。

### 阶段一：收集信息
读取 `references/intake-guide.md`，先让用户选择收集模式：
- **A. 一次性填写**（熟悉用户）：直接显示所载入 profile 的完整问卷，一次性收集。
- **B. 分步引导填写**（新手）：按 profile 的 ▎ 分组逐步引导，每步说明用途、标注【必填】/（选填）并给示例，按 intake-guide.md 的「分步协议」执行；支持随时"切换为一次性填写"。

两种模式的字段集均来自所载入 profile 的问卷；按 `categories.md` 适配标的相关字段。

场景 custom：跳过模式选择，直接执行 `profiles/custom.md`。其首问为**是否基于已有公告提取模板**：
- **路径 A（提取模板）**：用户上传已有公告（.docx/.md/.txt）→ `pandoc` 提结构内容 +（.docx）`scripts/extract_style.py` 提样式 → LLM 产出"模板规格"供确认 → 仅收集需替换的项目专属字段 → 套用原结构与固定条款生成，导出时并入提取的样式 settings 保持原格式。
- **路径 B（空白自定义）**：走组装子流程（分步引导：术语→选章节→填字段→选条款→样式→确认）。

### 阶段二：生成公告（Markdown）
按所载入 profile 的「生成规则 + 模板」生成，并：
- 使用该场景的术语（采购人/招标人、供应商/投标人等）。
- 按对应 `clauses/*.md` 的嵌入规则**原文嵌入**法定条款；custom 仅嵌入用户所选/自填条款。
- **查条款三级路径**（不读 legal-kb 全文）：
  1. 📄 `clauses/*.md` —— 预提取的高频条款（≤15KB，命中 90% 场景）
  2. 📋 `references/CLAUSE-INDEX.md` —— 条号 → 文件路径快速映射（5KB 一次读取）
  3. 🔍 `python lookup_clause.py <文件> <条号>` —— 精准提取单条（~50ms）
  不定条号时：`python lookup_clause.py <文件> --search "关键词"`
- **法条守则**：法定条款只能**逐字引用**已校核的条款（`clauses/*` 及 `legal-kb/` 中「校核通过」条目）；**所需条款缺失或未校核通过时，提示"缺权威来源，待人工补充"，绝不由模型生成法条**（见 `legal-kb/INGEST-PROTOCOL.md`）。
- 项目编号未提供则 `[待补充]`，发布日期取当天，留空字段/章节省略。
- 生成后提醒核对，询问是否修改。

### 阶段三：合规审查（按场景强度）
组装审查输入 `review.json`（`text`=公告全文，`fields`=归一化后的字段，字段集见对应 `compliance/*.md`），运行：
```powershell
$env:PYTHONUTF8 = "1"
python ".opencode\skills\bidding-announcement\scripts\check_compliance.py" review.json --regime <gov|construction|enterprise|none> --out review_report.md
```
- gov / construction：**强合规**，退出码 1 表示有「错误」级问题，建议先修正再导出。
- enterprise：弱合规（仅逻辑一致性 + 歧视性提示）。
- custom：默认可跳过；用户需要时用 `--regime none`。
- 脚本之外仍需 LLM 语义复核歧视性条款与政策符合性（见对应 compliance 文件）。先列「错误」并给修改建议，说明合规责任由采购人/招标人承担。

### 阶段四：导出为 DOCX（生成后主动询问）
> 公告已生成完毕。是否需要导出为 Word 文档（.docx）？

肯定答复后，使用本 skill 自带的 `render_docx.js`（docx-js），**不依赖任何 MCP 工具**。

#### 步骤 1：组装 blocks JSON（写入 content.json）
将 Markdown 公告逐行映射为 `{"blocks":[...]}`：

| Markdown 行 | block.style |
|-------------|-------------|
| `# 主标题` | `title` |
| `## 章节标题` | `section` |
| `**加粗小标题**`（如 `**1. 采购人信息**`） | `subheading` |
| 普通正文 | `body` |
| 编号开头（`1.`/`（1）`）或长段落(>25字) | `body_indent` |
| 空行 / `---` | 跳过 |

- 行内部分加粗用 `runs`：`{"style":"body","runs":[{"text":"名 称：","bold":true},{"text":"xxx"}]}`；否则用 `text`。
- **自定义场景样式**：用户设定的字体/字号/主色/页边距/对齐放入顶层 `settings`（可选）：
```json
{ "settings": { "default_font": "宋体", "default_size_pt": 10.5, "title_color": "000000", "title_align": "center", "margin_cm": { "top":2.54,"bottom":2.54,"left":3.18,"right":3.18 } }, "blocks": [ ... ] }
```
缺省则用内置默认样式。

#### 步骤 2：生成 .docx（Windows 设 NODE_PATH）
输出路径：与 Markdown 同目录同名（`.md`→`.docx`），或用户指定。
```powershell
$env:NODE_PATH = (npm root -g)
node ".opencode\skills\bidding-announcement\scripts\render_docx.js" content.json 公告.docx
```

#### 步骤 3：校验（Windows 必须设 PYTHONUTF8=1）
```powershell
$env:PYTHONUTF8 = "1"
python ".opencode\skills\docx\scripts\office\validate.py" 公告.docx
```
出现 `All validations PASSED!` 即成功。

#### 步骤 4：确认结果
告知保存路径，询问是否修改。

### 阶段五：导出 PDF（可选）
基于 `pdf` skill 的 reportlab 能力，**复用阶段四同一份 blocks JSON**（含 `settings`）直接出 A4 PDF，无需 LibreOffice。

```powershell
$env:PYTHONUTF8 = "1"
python ".opencode\skills\bidding-announcement\scripts\render_pdf.py" content.json 公告.pdf
```
- 中文默认用内置 CID 字体 STSong-Light（无需外部字体文件）；如需特定字体或更明显的加粗，在 `settings.font_path` 指定 TTF/TTC（如 `C:/Windows/Fonts/simsun.ttc`）。注意标准 CID 字体无独立粗体字形，加粗主要靠字号区分。
- 校验：可用 `pdf` skill 读回确认内容：`python -c "from pypdf import PdfReader; print(PdfReader('公告.pdf').pages[0].extract_text())"`。
- 依赖：`python -m pip install reportlab`（写）、`pypdf`（读，通常已随 pdf skill 提供）。

## 环境前置
- Node.js + `npm install -g docx`（DOCX 生成）
- Python 3（validate.py / check_compliance.py / render_pdf.py / extract_style.py）
- PDF：`python -m pip install reportlab`（写）、`pypdf`（读，随 `pdf` skill 提供）
