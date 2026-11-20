# Profile：国际招标（regime id: `international`）

## 元信息
- 适用框架：World Bank / ADB / FIDIC / UNCITRAL / WTO GPA / EU Procurement Directives（按用户项目指定）
- 适用范围：国际竞争性招标（ICB）、有限国际招标（LIB）、国际询价等
- 标的类型：工程（Works）/ 货物（Goods）/ 服务（Services）
- 采购方式：International Competitive Bidding (ICB，默认)、Limited International Bidding (LIB)、Request for Proposals (RFP)
- 默认语言：English
- 术语：Employer / Bidder / Contractor / Consultant, Invitation for Bids (IFB), Bid Security, Performance Security, Contract Award
- 条款库：`../clauses/international.md`、`../clauses/common.md`（部分通用英文条款）
- 合规：**中**，`scripts/check_compliance.py --regime international`，规则见 `../compliance/international.md`

## 问卷（阶段一收集，English，按类别适配 Goods/Works/Services）

> ▎Groups = steps for guided intake. [Required] must be completed; (Optional) can be skipped.

```
Please provide the following procurement information:

▎Step 1  General Information
- Project Name [Required]
- Country / Location [Required]
- Employer Name [Required], Address, Contact Person & Email/Phone
- Procurement Method [Required] (ICB / LIB / RFP / other)
- Funding Source (Optional, e.g., World Bank, ADB, government budget)

▎Step 2  Scope of Procurement
- Brief Description of Works / Goods / Services [Required]
- Contract Duration / Delivery Schedule [Required]
  (Works: completion period; Goods: delivery timeline; Services: contract term)
- Estimated Budget (Optional, in USD or local currency)

▎Step 3  Eligibility & Qualification of Bidders
- Eligibility Restrictions (Optional, per funding institution policy)
  e.g., "Bidders from World Bank member countries only"
- Qualification Requirements [Required]
  - Financial capability (e.g., minimum annual turnover)
  - Experience (e.g., at least N similar contracts in the last M years)
  - Key personnel / equipment (where applicable)
- Joint Venture / Consortium allowed? (Optional, default: Yes, with conditions)
- Conflict of Interest declaration required (standard, see clauses)

▎Step 4  Obtaining Bidding Documents
- Document Availability Period [Required]
- How to Obtain [Required] (online download / email request / purchase)
- Document Fee (Optional, default: free)

▎Step 5  Bid Submission
- Bid Submission Deadline (Date & Time, local time) [Required]
- Bid Opening (Date & Time, normally same as deadline) [Required]
- Place of Bid Opening [Required]
- Bid Security amount & form (Optional: bank guarantee, letter of credit, etc.)
- Pre-bid Meeting / Site Visit (Optional: date & place)

▎Step 6  Contact Information
- Contact Person for Inquiries [Required], Email / Phone
- Address for Bid Submission [Required]
```

## 生成规则
- 留空字段/章节省略；发布日期取当天（格式：`Month DD, YYYY`）。
- 合同履行期限标签按标的替换：工程=Completion Period / 货物=Delivery Schedule / 服务=Contract Term。
- 法定/标准条款按 `../clauses/international.md` 嵌入规则原文嵌入。
- 语言按用户选择：English / 中文 / 双语。双语模式在英文正文后附加中文翻译（LLM 直译），中文在前时反之。

## 模板（输出 Markdown — English 模式）

```
# [Employer Name]: Invitation for Bids (IFB) for [Project Name]

## 1. Employer and Project Background
[Employer Name] (hereinafter "the Employer") invites sealed bids from eligible bidders for [Brief Description of Works/Goods/Services] under [Project Name], located in [Country/Location].

*Funding Source: [Funding Source, if applicable]

## 2. Scope of Procurement
[Detailed scope, contract duration/delivery schedule, and key specifications]
Estimated Budget: [Amount, Optional]

## 3. Eligibility and Qualification of Bidders
[Embed clauses/international.md: Eligibility / Conflict of Interest / Sanctions / Qualification criteria]
Bidders shall meet the following minimum qualification requirements:
- Financial: [turnover / net worth requirements]
- Experience: [number and description of similar contracts]
- [Key personnel / equipment, if applicable]
Joint Venture / Consortium: [Allowed / Not Allowed], subject to [conditions].

## 4. Obtaining Bidding Documents
Bidding documents will be available from [Start Date] to [End Date] and may be obtained by [Method].
*Document Fee: [Amount or Free]

## 5. Bid Submission and Opening
Bids must be delivered to: [Address]
Deadline for bid submission: [Date & Time] (local time)
Bids will be publicly opened at [Time] on [Date] at [Place].
Late bids will be rejected.
*Pre-bid Meeting / Site Visit: [Date, Time, Place, if applicable]

## 6. Bid Security (if required)
[Embed clauses/international.md: Bid Security clause]
The amount of Bid Security shall be: [Amount], valid for [N] days beyond the bid validity period.
Form: [Bank Guarantee / Letter of Credit / Cashier's Check]

## 7. Contact and Inquiries
All inquiries shall be directed to:
Contact Person: [Name]
Email: [Email]  |  Phone: [Phone]
Address for Bid Submission: [Address]

Issued on: [Month DD, YYYY]
```
