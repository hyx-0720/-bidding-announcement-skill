# 招标公告生成 Skill

面向 opencode 的招标公告生成技能：按场景自动切换格式、术语、法定条款与合规强度，对话式收集信息，一键生成 Markdown 并导出 Word / PDF。

## 功能特性

| 能力 | 说明 |
|------|------|
| 五类场景 | 政府采购 / 工程建设 / 企业自主 / 国际招标 / 完全自定义 |
| 三类标的 | 货物 / 工程 / 服务，字段按标的自动适配 |
| 多语言 | 中文 / English / 中英双语 |
| 双收集模式 | 一次性填写（熟手）/ 分步引导（新手） |
| 条款引用 | 三级查找，只逐字引用已校核法条，缺失即提示补充 |
| 合规审查 | 按场景强度校验条款完整性、日期逻辑、歧视性表述等 |
| 多格式导出 | Markdown → DOCX（docx-js）→ PDF（reportlab） |
| 模板提取 | 上传已有公告（.docx/.md/.txt/.pdf），提取结构与样式复用 |

## 安装

将本目录放到 opencode 的 skills 路径下，二选一：

**项目级**（仅当前项目可用）：

```
<项目根目录>/.opencode/skills/bidding-announcement/
```

**全局**（所有项目可用）：

```
~/.config/opencode/skills/bidding-announcement/
```

或直接克隆：

```bash
git clone <本仓库地址> ~/.config/opencode/skills/bidding-announcement
```

## 快速开始

在 opencode 中输入：

```
帮我生成一份招标公告
```

技能会依次询问：

1. **身份/场景** — 五选一
2. **标的类型** — 货物 / 工程 / 服务
3. **公告语言** — 中文 / English / 中英双语
4. **信息收集方式** — 一次性填写 / 分步引导

随后按场景问卷收集信息 → 生成 Markdown → 合规审查 → 按需导出 DOCX/PDF。

## 工作流程

```
阶段零 选择场景与语言
   ↓
阶段一 收集信息（问卷 / 分步引导）
   ↓
阶段二 生成公告 Markdown（原文嵌入法定条款）
   ↓
阶段三 合规审查（check_compliance.py）
   ↓
阶段四 导出 DOCX（render_docx.js）
   ↓
阶段五 导出 PDF（render_pdf.py，可选）
```

## 目录结构

```
bidding-announcement/
├── SKILL.md                  # 技能主入口
├── USAGE.md                  # 详细使用说明与 FAQ
├── README.md
├── references/
│   ├── regimes.md            # 场景调度表
│   ├── intake-guide.md       # 信息收集协议
│   ├── CLAUSE-INDEX.md       # 条款速查索引
│   ├── profiles/             # 各场景问卷与模板
│   ├── clauses/              # 预提取高频法定条款
│   ├── compliance/           # 分场景合规规则
│   └── legal-kb/             # 法规全文与导入校核规范
└── scripts/
    ├── render_docx.js        # DOCX 渲染
    ├── render_pdf.py         # PDF 渲染
    ├── check_compliance.py   # 合规审查
    ├── extract_style.py      # .docx 样式提取
    └── lookup_clause.py      # 条款精准提取
```

## 环境依赖

- **Node.js**：`npm install -g docx`（导出 DOCX）
- **Python 3**：`pip install reportlab pypdf`（导出/读取 PDF）
- **可选**：pandoc（提取已有 .docx 内容）、LibreOffice（旧版 .doc 转换）

## 设计原则

- **法条不编造**：法定条款仅从 `clauses/` 或 `legal-kb/` 中逐字引用已校核原文；所需条款缺失时标注"待人工补充"，绝不由模型生成。
- **场景驱动**：不同场景使用各自的问卷、术语、条款与合规强度。
- **留空即省略**：未填写的选填字段不输出，必填项标记 `[待补充]`。

## 更多文档

完整使用说明、合规细节、常见问题见 [USAGE.md](USAGE.md)。

> 本技能生成的内容仅供编制参考，最终公告的合法合规性由采购人/招标人及其代理机构负责审核。
