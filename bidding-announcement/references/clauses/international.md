# 国际招标标准条款库（regime: international）

> 适用于国际竞争性招标（ICB）、世界银行/亚行等资助项目。条款为通用招标语言，**发布前须根据具体项目适用的采购框架（世行 Procurement Regulations / ADB Procurement Policy / FIDIC 等）核实**。
> 这些为标准合同语言，非特定国家法规，不构成"模型生成法条"问题。

---

## 条款 I1：Eligibility（默认包含）

Bidding is open to all bidders from eligible source countries as defined in the [applicable procurement guidelines / regulations]. A bidder shall not have a conflict of interest. Bidders that have been sanctioned, debarred, or suspended by the funding institution or relevant authorities shall be ineligible.

## 条款 I2：Conflict of Interest（默认包含）

A bidder shall be considered to have a conflict of interest and shall be disqualified if the bidder:
(a) directly or indirectly controls, is controlled by, or is under common control with another bidder;
(b) receives or will receive any direct or indirect subsidy from another bidder;
(c) has the same legal representative or key management as another bidder;
(d) participates in more than one bid in this bidding process, except as a subcontractor.
(e) has been engaged by the Employer to provide consulting services for the preparation of the procurement.

## 条款 I3：Fraud and Corruption / Sanctions（默认包含）

The Employer requires that bidders, suppliers, and contractors observe the highest standard of ethics during procurement and execution of contracts. The Employer will reject a proposal for award if it determines that the bidder recommended for award has engaged in corrupt, fraudulent, collusive, coercive, or obstructive practices in competing for the contract. The bidder shall comply with the anti-corruption policies of [applicable funding institution].

## 条款 I4：Bid Security（如用户填写，按需包含）

The bidder shall furnish a bid security in the amount of [Amount] and in the form of [Bank Guarantee / Irrevocable Letter of Credit / Cashier's Check]. The bid security shall remain valid for [N] days beyond the bid validity period. Bid securities of unsuccessful bidders will be returned promptly after contract award. The bid security of the successful bidder will be returned upon submission of the performance security. The bid security may be forfeited if the bidder withdraws its bid during the bid validity period or refuses to sign the contract or furnish the performance security after award.

## 条款 I5：Late Bids（默认包含）

Bids received after the deadline for submission of bids shall be rejected and returned unopened to the bidder.

## 条款 I6：Right to Accept / Reject（默认包含）

The Employer reserves the right to accept or reject any bid, to annul the bidding process, and to reject all bids at any time prior to contract award, without incurring any liability to affected bidders. The Employer shall not be obliged to award the contract to the lowest evaluated bidder.

## 条款 I7：Confidentiality（默认包含）

Information relating to the examination, evaluation, comparison, and recommendation for contract award shall not be disclosed to bidders or any other party not officially concerned with the process until the publication of the contract award. Any effort by a bidder to influence the Employer in the evaluation of bids may result in rejection of its bid.

## 条款 I8：Bidder's Costs（默认包含）

The Employer will not be responsible for, and the bidder shall bear, all costs associated with the preparation and submission of its bid.

---

## 嵌入规则

| 条款 | 嵌入位置 | 触发条件 |
|------|----------|----------|
| I1 Eligibility | §3 Eligibility and Qualification | 默认 |
| I2 Conflict of Interest | §3 Eligibility and Qualification | 默认 |
| I3 Fraud / Sanctions | §3 Eligibility and Qualification | 默认 |
| I4 Bid Security | §6 Bid Security | 用户填写保证金时 |
| I5 Late Bids | §5 Bid Submission | 默认 |
| I6 Right to Accept/Reject | §5 末 or standalone | 默认 |
| I7 Confidentiality | §5 or §7 前 | 默认 |
| I8 Bidder's Costs | §1 or 文末 | 默认（可选） |
