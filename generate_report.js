const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageBreak, PageNumber, Footer, Header, PageOrientation
} = require("docx");

// ============ Constants ============
const FONT_BODY = "SimSun";
const FONT_HEADING = "SimHei";
const FONT_CODE = "Consolas";
const SIZE_BODY = 24;         // 小四 = 12pt = 24 half-points
const SIZE_H1 = 32;           // 三号 = 16pt = 32 half-points
const SIZE_H2 = 28;           // 四号 = 14pt = 28 half-points
const SIZE_H3 = 24;           // 小四 bold
const SIZE_CODE = 20;         // 五号 = 10.5pt ≈ 21
const SIZE_TITLE = 44;        // 二号 = 22pt
const SIZE_LARGE = 36;        // 小二 = 18pt
const INDENT = 480;           // 2 chars indent for 12pt text
const LINE_SPACING = 360;     // 1.5x line spacing (240 * 1.5)
const PAGE_WIDTH = 11906;     // A4 width in DXA
const PAGE_HEIGHT = 16838;    // A4 height in DXA

// ============ Helper Functions ============

function p(text, opts = {}) {
  const runs = [];
  if (typeof text === "string") {
    runs.push(new TextRun({ text, font: FONT_BODY, size: SIZE_BODY }));
  } else if (Array.isArray(text)) {
    text.forEach(t => runs.push(typeof t === "string"
      ? new TextRun({ text: t, font: FONT_BODY, size: SIZE_BODY })
      : new TextRun(t)));
  }
  return new Paragraph({
    spacing: { line: LINE_SPACING, lineRule: "atLeast" },
    indent: opts.noIndent ? undefined : { firstLine: INDENT },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    ...opts.paragraph,
    children: runs,
    ...(opts.pageBreakBefore ? { pageBreakBefore: true } : {}),
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120, line: LINE_SPACING },
    children: [new TextRun({ text, font: FONT_HEADING, size: SIZE_H1, bold: true })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 60, line: LINE_SPACING },
    children: [new TextRun({ text, font: FONT_HEADING, size: SIZE_H2, bold: true })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 120, after: 60, line: LINE_SPACING },
    children: [new TextRun({ text, font: FONT_HEADING, size: SIZE_H3, bold: true })],
  });
}

function codeBlock(text) {
  const lines = text.trim().split("\n");
  return lines.map(line => new Paragraph({
    spacing: { line: 276, lineRule: "atLeast" },
    indent: { left: 480 },
    children: [new TextRun({ text: line || " ", font: FONT_CODE, size: SIZE_CODE })],
  }));
}

function emptyLine() {
  return new Paragraph({ spacing: { line: LINE_SPACING }, children: [] });
}

function centerPara(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: opts.lineSpacing || LINE_SPACING },
    children: [new TextRun({ text, font: opts.font || FONT_BODY, size: opts.size || SIZE_BODY, bold: opts.bold })],
  });
}

function screenshotNote(desc) {
  return new Paragraph({
    spacing: { line: LINE_SPACING },
    indent: { firstLine: INDENT },
    shading: { fill: "FFF3CD", type: ShadingType.CLEAR },
    children: [
      new TextRun({ text: `[📷 插入截图: ${desc}]`, font: FONT_BODY, size: SIZE_BODY, italics: true, color: "856404" }),
    ],
  });
}

function figureCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120, line: LINE_SPACING },
    children: [new TextRun({ text, font: FONT_HEADING, size: 20, bold: true })],
  });
}

const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 50, bottom: 50, left: 80, right: 80 };

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: headers.map((h, i) => new TableCell({
          borders,
          width: { size: colWidths[i], type: WidthType.DXA },
          margins: cellMargins,
          shading: { fill: "D9E2F3", type: ShadingType.CLEAR },
          verticalAlign: "center",
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: h, font: FONT_HEADING, size: 20, bold: true })],
          })],
        })),
      }),
      ...rows.map(row => new TableRow({
        children: row.map((cell, i) => new TableCell({
          borders,
          width: { size: colWidths[i], type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({
            alignment: cell === row[0] ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [new TextRun({ text: cell, font: FONT_BODY, size: 20 })],
          })],
        })),
      })),
    ],
  });
}

// ============ Build Document Content ============

const children = [];

// ---- Cover Page ----
children.push(emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine());
children.push(centerPara("餐饮预定系统", { font: FONT_HEADING, size: SIZE_TITLE, bold: true }));
children.push(emptyLine());
children.push(centerPara("计算机软件综合实验报告", { font: FONT_HEADING, size: SIZE_LARGE, bold: true }));
children.push(emptyLine(), emptyLine(), emptyLine(), emptyLine());

const coverItems = [
  ["学　　院：", "电气与电子工程学院"],
  ["专　　业：", "计算机科学与技术"],
  ["姓　　名：", "胡云箫"],
  ["学　　号：", "028123073"],
  ["班　　级：", "（请填写）"],
  ["设计名称：", "计算机软件综合实验 — 餐饮预定系统"],
  ["设计周数：", "2周"],
  ["指导老师：", "（请填写）"],
  ["起止时间：", "（请填写）~（请填写）"],
];

coverItems.forEach(([label, value]) => {
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 480 },
    children: [
      new TextRun({ text: label, font: FONT_BODY, size: SIZE_H2 }),
      new TextRun({ text: value, font: FONT_BODY, size: SIZE_H2, underline: { type: "single" } }),
    ],
  }));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Abstract ----
children.push(heading1("摘要"));
children.push(p("本系统是一个基于 C# ASP.NET Core MVC 与 MySQL 的 B/S 架构餐饮预定系统，面向校园及社区内的小微型餐饮商家，提供低成本的线上订单管理解决方案。系统采用 Visual Studio 2022 集成开发环境，使用 C# 语言开发完成，具有用户管理、订单管理、菜品管理、报表打印、在线帮助、系统备份和恢复等功能。系统核心用户分为消费者、商家和管理员三类角色，消费者可浏览商家菜品并创建预定订单，商家可管理菜品和处理订单，管理员可进行用户管理及系统维护。经测试，该系统的各项功能在 Windows 11 操作系统上运行通过，达到预定设计目标，解决了小微型餐饮商家线上订单统计效率低下、出餐慢等实际问题。"));
children.push(emptyLine());
children.push(new Paragraph({
  spacing: { line: LINE_SPACING },
  indent: { firstLine: INDENT },
  children: [
    new TextRun({ text: "关键词：", font: FONT_HEADING, size: SIZE_BODY, bold: true }),
    new TextRun({ text: "餐饮预定；B/S架构；ASP.NET Core MVC；MySQL", font: FONT_BODY, size: SIZE_BODY }),
  ],
}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Section 1 ----
children.push(heading1("一、软件需求和可行性分析"));

children.push(heading2("（一）需求分析"));
children.push(p("当前，外卖行业急速发展，不少线下进行餐饮行业的商家也大踏步地向外卖行业进军，可如何在线上对食客的需求进行统计成为了一大难题。虽然已经有了许多功能完善、用户群体庞大的外卖平台，可对于一些体量较小、利润不高的商家来说，平台的大量抽成对其无疑是一笔很大的负担。因此，希望做一个功能简洁实用的微型软件，为这些商家提供符合其简单需求的、更低成本的选择。"));
children.push(p("特别观察到，在大学的饭堂里，有一些商家面临着人手不足、难以记住大量学生的订餐需求，从而导致出餐效率低下的问题。而通过这款软件，则可以有效地提升收银效率，使得学生点餐时的需求可以更容易更方便地被统计，由此提高商家的出餐效率创造更多的营收。"));
children.push(p("该系统贴合当下本地生活服务数字化的实际背景，尤其可为特定校园或社区内的小微餐饮商家提供低成本线上接单渠道，同时确保系统在功能实现的同时满足食品安全监管与个人信息保护的基本要求。"));

children.push(heading2("（二）可行性分析"));
children.push(p("技术可行性：本系统采用 C# ASP.NET Core MVC 框架，配合 Entity Framework Core ORM 访问 MySQL 数据库。C# 语法严谨简洁，配合 Visual Studio 2022 强大的智能提示和调试工具，可显著减少开发时间。MySQL 作为开源数据库，性能出色，足以支撑订单处理和菜品查询等核心操作。以上技术均属于主流成熟技术，拥有丰富的社区资源和文档支持，完全能够在限定的两周时间内完成开发。", { paragraph: {}, noIndent: false }));
children.push(p("经济可行性：开发工具 Visual Studio 2022 Community 版本完全免费，MySQL 社区版免费且无需支付任何授权费用，系统部署对服务器硬件要求不高，开发阶段几乎不产生额外费用，适合课程设计阶段的有限投入。", { paragraph: {}, noIndent: false }));
children.push(p("社会可行性：本系统仅供校园餐饮管理使用，不涉及博彩等敏感话题，无法律风险。系统不依赖第三方外卖平台，不存在数据泄露和商业竞争风险。所有代码均为自主开发，不涉及盗版和侵权问题。", { paragraph: {}, noIndent: false }));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Section 2 ----
children.push(heading1("二、系统的总体设计"));

children.push(heading2("（一）架构设计"));
children.push(p("本系统采用 B/S（浏览器/服务器）架构的 Web 应用软件。选择 B/S 架构的原因是：用户无需安装任何客户端软件，只需通过浏览器即可访问系统，方便部署和演示；后台升级维护无需更新所有客户端，降低了运维成本；B/S 架构天然支持多用户并发访问，适合多个消费者同时下单的场景。"));
children.push(p("系统在 Program.cs 中配置了核心服务：", { noIndent: false }));
children.push(...codeBlock(`
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 28))));
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(2);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DbInitializer.Seed(db);
}
app.UseStaticFiles();
app.UseSession();
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
app.Run();
`));
children.push(screenshotNote("系统架构图（可用 Visio/draw.io 绘制一个简单的三层架构图：浏览器层 → Web服务器(ASP.NET Core)层 → 数据库(MySQL)层）"));

children.push(heading2("（二）功能设计"));
children.push(p("本系统的功能设计如图1所示，系统功能如表1所示。"));
children.push(screenshotNote("功能结构图（绘制一个树形功能图，展示所有一级功能和二级子功能的关系）"));
children.push(figureCaption("图1 餐饮预定系统的功能设计图"));
children.push(emptyLine());
children.push(centerPara("表1 餐饮预定系统的功能表", { font: FONT_HEADING, size: 20, bold: true }));
children.push(makeTable(
  ["一级功能", "二级子功能", "功能详述"],
  [
    ["用户管理", "用户注册", "消费者和商家可按要求注册账号"],
    ["用户管理", "用户登录", "可通过账号密码登录系统"],
    ["用户管理", "用户退出", "登录后，可安全退出账号"],
    ["用户管理", "用户修改", "登录后，可按需求修改密码和个人信息"],
    ["用户管理", "用户删除", "管理员可删除消费者和商家账号"],
    ["订单管理", "创建订单", "消费者可浏览商家菜品，选择数量和菜品并创建预定订单"],
    ["订单管理", "查询订单", "消费者可查询自己的订单历史，商家和管理员可查询全部订单"],
    ["订单管理", "删除订单", "商家可拒绝消费者的订单，管理员可删除任意订单"],
    ["菜品管理", "新增菜品", "商家可添加新菜品"],
    ["菜品管理", "删除菜品", "商家和管理员可删除菜品"],
    ["菜品管理", "菜品上下架", "商家可设置菜品是否售罄"],
    ["报表打印", "打印订单列表", "商家和管理员可打印订单报表"],
    ["报表打印", "打印用户信息列表", "管理员可打印用户信息列表"],
    ["在线帮助", "—", "对系统使用有疑问时可查看在线帮助页面"],
    ["系统备份和恢复", "系统备份", "管理员可将数据库备份为 SQL 文件"],
    ["系统备份和恢复", "系统恢复", "管理员可通过上传 SQL 文件恢复数据库"],
  ],
  [2200, 2200, 4620]
));

children.push(heading2("（三）角色设计"));
children.push(p("系统核心用户分为消费者、商家及平台管理员三类。"));
children.push(p("消费者用户赋予用户注册、用户登录、用户退出、用户修改、创建订单和查询订单的功能，具体如表2所示。", { noIndent: false }));

children.push(centerPara("表2 消费者用户功能表", { font: FONT_HEADING, size: 20, bold: true }));
children.push(makeTable(
  ["功能名称", "功能详述"],
  [
    ["用户注册", "消费者用户可按要求注册账号"],
    ["用户登录", "消费者用户可通过账号密码登录系统"],
    ["用户退出", "登录后，消费者用户可退出账号"],
    ["用户修改", "登录后，消费者用户可按需求修改密码和个人信息"],
    ["浏览商家", "登录后可浏览所有营业中的商家"],
    ["创建订单", "消费者可按需求选择菜品及数量并创建预定订单"],
    ["查询订单", "消费者可查询自己创建过的订单"],
  ],
  [2400, 6620]
));

children.push(p("商家用户赋予用户注册、用户登录、用户退出、用户修改、查询订单、删除订单、新增菜品、删除菜品、打印订单列表的功能，具体如表3所示。", { noIndent: false }));

children.push(centerPara("表3 商家用户功能表", { font: FONT_HEADING, size: 20, bold: true }));
children.push(makeTable(
  ["功能名称", "功能详述"],
  [
    ["用户注册", "商家用户可按要求注册账号"],
    ["用户登录", "商家用户可通过账号密码登录系统"],
    ["用户退出", "登录后，商家用户可退出账号"],
    ["用户修改", "登录后，商家用户可按需求修改密码和店铺信息"],
    ["切换营业状态", "商家可设置店铺营业或歇业状态"],
    ["查询订单", "商家可查询自己的菜品被预定的订单"],
    ["删除订单", "商家可拒绝消费者的订单"],
    ["新增菜品", "商家可添加菜品"],
    ["删除菜品", "商家可删除菜品"],
    ["菜品上下架", "商家可设置菜品售罄或上架"],
    ["打印订单列表", "商家可打印属于自己店铺的订单报表"],
  ],
  [2400, 6620]
));

children.push(p("管理员用户赋予用户登录、用户退出、用户修改、用户删除、查询订单、删除订单、删除菜品、打印订单列表、打印用户信息列表、在线帮助、系统备份、系统恢复功能，具体如表4所示。", { noIndent: false }));

children.push(centerPara("表4 管理员用户功能表", { font: FONT_HEADING, size: 20, bold: true }));
children.push(makeTable(
  ["功能名称", "功能详述"],
  [
    ["用户登录", "管理员可通过预设账号登录系统"],
    ["用户退出", "登录后，管理员可退出账号"],
    ["用户修改", "登录后，管理员可按需求修改密码"],
    ["用户删除", "管理员可按需删除消费者或商家的账号"],
    ["查询订单", "管理员可查询所有订单"],
    ["删除订单", "管理员可删除任意订单"],
    ["删除菜品", "管理员可删除任意菜品"],
    ["打印订单列表", "管理员可打印所有订单报表"],
    ["打印用户信息列表", "管理员可打印用户信息列表"],
    ["在线帮助", "对系统使用有疑问时可查看在线帮助"],
    ["系统备份", "对数据库中的信息进行备份操作"],
    ["系统恢复", "出现故障时通过上传备份文件进行系统恢复"],
  ],
  [2400, 6620]
));

children.push(heading2("（四）开发和运行平台选择"));
children.push(heading3("（1）软件开发语言"));
children.push(p("本软件系统选用 C# 语言作为开发语言。C# 是一门面向对象的现代编程语言，运行于 .NET 平台。C# 拥有简洁严谨的语法结构，配合 Visual Studio 集成开发环境，提供了强大的智能提示、代码自动补全和调试工具，能够显著减少开发过程中的语法错误和调试时间。C# 具备强类型语言的优势，类型安全机制能在编译阶段发现许多潜在错误，减少运行时异常。同时其丰富的类库和 NuGet 包管理生态几乎覆盖了所有常见需求，如数据访问（Entity Framework Core）、身份验证、序列化等。"));

children.push(heading3("（2）软件开发工具"));
children.push(p("本软件系统选用 Visual Studio 2022 Community 作为开发工具。Visual Studio 2022 是微软推出的旗舰级集成开发环境，提供智能代码编辑、高级调试、性能分析、集成 Git 版本控制等功能。其 Community 版本对个人开发者、学术研究和开源项目完全免费，功能足以满足本课程设计的需求。"));

children.push(heading3("（3）数据库管理系统"));
children.push(p("本软件系统选用 MySQL 8.0 作为数据库管理系统。MySQL 是目前应用最广泛的开源关系型数据库管理系统之一。从经济成本角度看，MySQL 社区版完全免费，无需支付任何授权费用。在性能方面，MySQL 具有出色的读写速度和并发处理能力，通过合理的索引设计和 SQL 优化，足以支撑外卖预定系统所需的订单处理、菜品查询等核心操作。MySQL 与 C# 的配合十分顺畅，通过 Pomelo.EntityFrameworkCore.MySql 提供程序，可以使用 Entity Framework Core 以面向对象的方式操作数据库。"));

children.push(heading3("（4）软件运行平台"));
children.push(p("硬件：本软件系统运行的最低硬件配置要求为 CPU Intel Core i3 及以上、内存 4GB、硬盘 500MB 可用空间。", { noIndent: false }));
children.push(p("软件：本软件系统运行的推荐操作系统为 Windows 10/11。", { noIndent: false }));

children.push(heading2("（五）数据库设计"));

children.push(heading3("（1）概念设计"));
children.push(p("本系统共有 3 个核心实体：消费者、菜品、商家。由于消费者实体与菜品实体之间是多对多的关系（一个消费者可以预定多个菜品，一个菜品可以被多个消费者预定），因此设计预定（订单）实体作为关联实体，以用户编号和菜品编号作为外键。"));
children.push(screenshotNote("E-R 图（用 Visio/draw.io 绘制，包含 消费者、菜品、商家、订单 四个实体及其属性、关系）"));
children.push(figureCaption("图2 餐饮预定系统 E-R 图"));

children.push(heading3("（2）逻辑设计"));
children.push(p("由上述 E-R 图，得到系统数据库表结构如下。本系统共设计了五张表：用户表（Users）、消费者表（Consumers）、商家表（Merchants）、菜品表（Dishes）和订单表（Orders）。每个表都满足第三范式。"));

children.push(centerPara("表5 用户（Users）表", { font: FONT_HEADING, size: 20, bold: true }));
children.push(makeTable(
  ["字段", "数据类型", "主键", "非空", "说明"],
  [
    ["UserId", "Int", "Y", "Y", "用户编号，自增"],
    ["Username", "Varchar(50)", "N", "Y", "登录账号，唯一索引"],
    ["PasswordHash", "Varchar(256)", "N", "Y", "登录密码（SHA256 哈希）"],
    ["Role", "Varchar(20)", "N", "Y", "角色：Consumer/Merchant/Admin"],
    ["CreatedAt", "Datetime", "N", "N", "注册时间"],
  ],
  [1600, 1600, 800, 800, 4220]
));

children.push(centerPara("表6 消费者（Consumers）表", { font: FONT_HEADING, size: 20, bold: true }));
children.push(makeTable(
  ["字段", "数据类型", "主键", "非空", "说明"],
  [
    ["ConsumerId", "Int", "Y", "Y", "消费者编号，自增"],
    ["UserId", "Int", "N", "Y", "外键→Users(UserId)，唯一"],
    ["Name", "Varchar(50)", "N", "N", "姓名"],
    ["Address", "Varchar(200)", "N", "N", "地址"],
    ["Preference", "Varchar(200)", "N", "N", "偏好"],
    ["Contact", "Varchar(50)", "N", "N", "联系方式"],
  ],
  [1600, 1600, 800, 800, 4220]
));

children.push(centerPara("表7 商家（Merchants）表", { font: FONT_HEADING, size: 20, bold: true }));
children.push(makeTable(
  ["字段", "数据类型", "主键", "非空", "说明"],
  [
    ["MerchantId", "Int", "Y", "Y", "商家编号，自增"],
    ["UserId", "Int", "N", "Y", "外键→Users(UserId)，唯一"],
    ["Name", "Varchar(100)", "N", "N", "商家名称"],
    ["Address", "Varchar(200)", "N", "N", "线下地址"],
    ["Contact", "Varchar(50)", "N", "N", "联系方式"],
    ["IsOpen", "Bool", "N", "N", "是否营业"],
  ],
  [1600, 1600, 800, 800, 4220]
));

children.push(centerPara("表8 菜品（Dishes）表", { font: FONT_HEADING, size: 20, bold: true }));
children.push(makeTable(
  ["字段", "数据类型", "主键", "非空", "说明"],
  [
    ["DishId", "Int", "Y", "Y", "菜品编号，自增"],
    ["MerchantId", "Int", "N", "Y", "外键→Merchants(MerchantId)"],
    ["Name", "Varchar(100)", "N", "Y", "菜品名称"],
    ["Price", "Decimal(10,2)", "N", "N", "菜品价格"],
    ["Ingredients", "Varchar(500)", "N", "N", "制作配料表"],
    ["Method", "Varchar(500)", "N", "N", "制作方法"],
    ["IsSoldOut", "Bool", "N", "N", "是否售罄"],
  ],
  [1600, 1600, 800, 800, 4220]
));

children.push(centerPara("表9 订单（Orders）表", { font: FONT_HEADING, size: 20, bold: true }));
children.push(makeTable(
  ["字段", "数据类型", "主键", "非空", "说明"],
  [
    ["OrderId", "Int", "Y", "Y", "订单号，自增"],
    ["UserId", "Int", "N", "Y", "外键→Users(UserId)"],
    ["DishId", "Int", "N", "Y", "外键→Dishes(DishId)"],
    ["OrderTime", "Datetime", "N", "N", "下单时间（同批次订单共享）"],
    ["DishName", "Varchar(100)", "N", "N", "菜品名称（历史快照）"],
    ["DishPrice", "Decimal(10,2)", "N", "N", "菜品价格（历史快照）"],
    ["Quantity", "Int", "N", "N", "订购数量，默认1"],
  ],
  [1600, 1600, 800, 800, 4220]
));

children.push(p("各实体对应的 C# 模型定义如下。User 实体使用 Data Annotation 定义主键和字段约束：", { noIndent: false }));
children.push(...codeBlock(`
public class User
{
    [Key]
    public int UserId { get; set; }
    [Required][StringLength(50)]
    public string Username { get; set; }
    [Required][StringLength(256)]
    public string PasswordHash { get; set; }
    [Required][StringLength(20)]
    public string Role { get; set; }     // Consumer / Merchant / Admin
    public DateTime CreatedAt { get; set; }
    public ICollection<Order> Orders { get; set; }
}

public class Order
{
    [Key]
    public int OrderId { get; set; }
    public int UserId { get; set; }
    public int DishId { get; set; }
    public DateTime OrderTime { get; set; }
    public string DishName { get; set; }       // 历史快照
    [Column(TypeName = "decimal(10,2)")]
    public decimal DishPrice { get; set; }      // 历史快照
    public int Quantity { get; set; } = 1;
    [ForeignKey("UserId")] public User? User { get; set; }
    [ForeignKey("DishId")] public Dish? Dish { get; set; }
}
`));

children.push(heading3("（3）物理实现"));
children.push(p("根据上述设计结果并结合本系统选择的数据库管理系统 MySQL，在 MySQL 中共创建了 5 张表。"));
children.push(screenshotNote("MySQL Workbench 或命令行中执行 SHOW TABLES; 的结果截图，展示 CateringOrderSys 数据库中的 5 张表"));
children.push(figureCaption("图3 本软件数据库在 MySQL 中的实现"));
children.push(screenshotNote("Users 表结构，执行 DESCRIBE Users; 的结果截图"));
children.push(figureCaption("图4 用户（Users）表在 MySQL 中的实现"));
children.push(screenshotNote("Consumers 表结构，执行 DESCRIBE Consumers; 的结果截图"));
children.push(figureCaption("图5 消费者（Consumers）表在 MySQL 中的实现"));
children.push(screenshotNote("Merchants 表结构，执行 DESCRIBE Merchants; 的结果截图"));
children.push(figureCaption("图6 商家（Merchants）表在 MySQL 中的实现"));
children.push(screenshotNote("Dishes 表结构，执行 DESCRIBE Dishes; 的结果截图"));
children.push(figureCaption("图7 菜品（Dishes）表在 MySQL 中的实现"));
children.push(screenshotNote("Orders 表结构，执行 DESCRIBE Orders; 的结果截图"));
children.push(figureCaption("图8 订单（Orders）表在 MySQL 中的实现"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Section 3 ----
children.push(heading1("三、系统的实现"));

// === 用户管理模块 ===
children.push(heading2("（一）用户管理模块"));
children.push(p("用户管理模块是系统的基础模块，实现了消费者和商家的身份认证与个人信息管理功能。该模块包含以下子模块：用户登录、用户注册、用户退出、用户修改。"));

children.push(heading3("（1）用户登录子模块"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("用户登录界面作为系统入口，用户需输入用户名和密码才能登录系统。系统首页会根据用户是否已登录展示不同的内容。未登录用户看到的是登录和注册入口，已登录用户看到的是对应角色的快捷入口。"));
children.push(screenshotNote("首页未登录状态，显示\"餐饮预定系统\"标题 + \"登录\"和\"注册新账号\"两个按钮的页面"));
children.push(figureCaption("图9 系统首页（未登录状态）"));
children.push(screenshotNote("登录页面，显示用户名和密码输入框的完整表单"));
children.push(figureCaption("图10 用户登录界面"));
children.push(p("登录时，系统对输入的密码进行 SHA256 哈希后与数据库中存储的哈希值进行比对，验证成功后跳转至对应角色的功能主页，并在右上角弹出\"登录成功\"的绿色提示弹窗，3 秒后自动消失。"));
children.push(screenshotNote("用 zhangsan/123456 登录成功后跳转到商家浏览页面，注意右上角绿色\"登录成功!\"提示弹窗"));
children.push(figureCaption("图11 登录成功提示"));
children.push(p("逻辑设计", { noIndent: true, paragraph: {} }));
children.push(screenshotNote("用户登录流程图（用 Visio/draw.io 绘制）"));
children.push(figureCaption("图12 用户登录流程图"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("登录功能的核心代码位于 AccountController.cs 的 Login 方法中。该方法接收用户名和密码参数，调用 PasswordHelper.Hash() 对密码进行 SHA256 哈希，然后通过 Entity Framework Core 查询数据库中匹配的用户记录。验证通过后，将用户信息（UserId、Username、Role）写入 Session，并根据角色重定向到不同的功能页面。"));

children.push(...codeBlock(`
[HttpPost]
public async Task<IActionResult> Login(string username, string password)
{
    var hash = PasswordHelper.Hash(password);
    var user = await _db.Users.FirstOrDefaultAsync(u => 
        u.Username == username && u.PasswordHash == hash);
    if (user == null)
    {
        ViewBag.Error = "用户名或密码错误";
        return View();
    }
    HttpContext.Session.SetInt32("UserId", user.UserId);
    HttpContext.Session.SetString("Username", user.Username);
    HttpContext.Session.SetString("Role", user.Role);
    TempData["LoginSuccess"] = true;
    return user.Role switch
    {
        "Consumer" => RedirectToAction("Index", "Consumer"),
        "Merchant" => RedirectToAction("Index", "Merchant"),
        "Admin" => RedirectToAction("Index", "Admin"),
        _ => RedirectToAction("Index", "Home")
    };
}
`));

children.push(p("密码加密使用 SHA256 哈希算法，封装在 PasswordHelper 类中：", { noIndent: false }));
children.push(...codeBlock(`
public static class PasswordHelper
{
    public static string Hash(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToHexString(bytes);
    }
}
`));

children.push(heading3("（2）用户注册子模块"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("新用户可通过注册页面创建账号。注册时需选择角色（消费者或商家）、填写用户名、密码、姓名、地址和联系方式等信息。选择消费者角色时，额外显示\"偏好\"输入框。"));
children.push(screenshotNote("注册页面，选择\"消费者\"角色后的完整表单，注意偏好字段可见"));
children.push(figureCaption("图13 用户注册界面（消费者）"));
children.push(screenshotNote("注册页面，选择\"商家\"角色后的完整表单，注意偏好字段已隐藏"));
children.push(figureCaption("图14 用户注册界面（商家）"));
children.push(p("逻辑设计", { noIndent: true, paragraph: {} }));
children.push(screenshotNote("用户注册流程图（FLOWCHARTS.md 图2）"));
children.push(figureCaption("图15 用户注册流程图"));
children.push(p("注册成功后，系统自动在 Users 表中创建认证记录，并在 Consumers 或 Merchants 表中创建对应的详情记录，然后自动登录并跳转至功能页面。"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("注册功能的核心代码位于 AccountController.cs 的 Register 方法中。系统首先检查用户名是否已存在，若不存在则创建 User 记录，然后根据角色分别创建 Consumer 或 Merchant 记录，最后自动设置 Session 并重定向。"));

children.push(...codeBlock(`
[HttpPost]
public async Task<IActionResult> Register(string username, string password, 
    string role, string name, string address, string contact, string preference)
{
    if (await _db.Users.AnyAsync(u => u.Username == username))
    {
        ViewBag.Error = "用户名已存在";
        return View();
    }
    var user = new User
    {
        Username = username,
        PasswordHash = PasswordHelper.Hash(password),
        Role = role,
        CreatedAt = DateTime.Now
    };
    _db.Users.Add(user);
    await _db.SaveChangesAsync();

    if (role == "Consumer")
        _db.Consumers.Add(new Consumer { UserId = user.UserId, Name = name, 
            Address = address ?? "", Contact = contact ?? "", Preference = preference ?? "" });
    else if (role == "Merchant")
        _db.Merchants.Add(new Merchant { UserId = user.UserId, Name = name, 
            Address = address ?? "", Contact = contact ?? "", IsOpen = true });
    await _db.SaveChangesAsync();

    HttpContext.Session.SetInt32("UserId", user.UserId);
    HttpContext.Session.SetString("Username", user.Username);
    HttpContext.Session.SetString("Role", user.Role);
    TempData["LoginSuccess"] = true;
    return role == "Consumer" ? RedirectToAction("Index", "Consumer") 
        : RedirectToAction("Index", "Merchant");
}
`));

children.push(heading3("（3）用户退出子模块"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("用户退出功能通过导航栏右侧的\"退出\"按钮实现。点击\"退出\"后，系统清除当前用户的 Session 会话数据，并重定向至登录页面。退出后，导航栏恢复为未登录状态，仅显示\"登录\"和\"注册\"入口。"));
children.push(screenshotNote("登录后界面，鼠标悬停在导航栏右侧\"退出\"按钮上，展示退出入口"));
children.push(figureCaption("图15 用户退出入口"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("退出功能的核心代码位于 AccountController.cs 的 Logout 方法中，该方法调用 HttpContext.Session.Clear() 清除所有会话数据，然后重定向到登录页面。"));
children.push(...codeBlock(`
public IActionResult Logout()
{
    HttpContext.Session.Clear();
    return RedirectToAction("Login");
}
`));

children.push(heading3("（4）用户修改子模块"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("用户修改功能包括\"修改密码\"和\"编辑个人资料/店铺资料\"两部分。\"修改密码\"功能要求用户输入原密码、新密码和确认新密码。\"编辑个人资料\"功能允许消费者修改姓名、地址、联系方式和偏好等个人信息。\"编辑店铺资料\"功能允许商家修改店铺名称、地址、联系方式和营业状态。"));
children.push(screenshotNote("修改密码页面，显示原密码、新密码、确认新密码三个输入框"));
children.push(figureCaption("图16 修改密码界面"));
children.push(screenshotNote("消费者个人资料编辑页面（用 zhangsan 登录后点击\"个人资料\"），展示各字段输入框"));
children.push(figureCaption("图17 消费者个人资料编辑界面"));
children.push(screenshotNote("商家店铺资料编辑页面（用 laozhang 登录后点击\"店铺资料\"），展示店铺信息 + 营业状态切换区域"));
children.push(figureCaption("图18 商家店铺资料编辑界面"));
children.push(p("逻辑设计", { noIndent: true, paragraph: {} }));
children.push(screenshotNote("修改密码流程图（FLOWCHARTS.md 图3）"));
children.push(figureCaption("图19 修改密码流程图"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("修改密码功能验证原密码正确后，将新密码进行 SHA256 哈希并更新到数据库。编辑个人资料功能通过 Form 表单提交更新字段值，直接保存到对应的 Consumer 或 Merchant 表中。"));
children.push(p("修改密码核心代码：", { noIndent: false }));
children.push(...codeBlock(`
[HttpPost]
public async Task<IActionResult> ChangePassword(
    string oldPassword, string newPassword, string confirmPassword)
{
    var userId = HttpContext.Session.GetInt32("UserId");
    if (userId == null) return RedirectToAction("Login");
    if (newPassword != confirmPassword)
    {
        ViewBag.Error = "两次输入的新密码不一致";
        return View();
    }
    var user = await _db.Users.FindAsync(userId.Value);
    if (user == null || user.PasswordHash != PasswordHelper.Hash(oldPassword))
    {
        ViewBag.Error = "原密码错误";
        return View();
    }
    user.PasswordHash = PasswordHelper.Hash(newPassword);
    await _db.SaveChangesAsync();
    ViewBag.Success = "密码修改成功";
    return View();
}
`));

children.push(p("消费者编辑个人资料核心代码：", { noIndent: false }));
children.push(...codeBlock(`
[HttpPost]
public async Task<IActionResult> EditProfile(
    string name, string address, string contact, string preference)
{
    var userId = HttpContext.Session.GetInt32("UserId")!.Value;
    var consumer = await _db.Consumers.FirstOrDefaultAsync(c => c.UserId == userId);
    if (consumer != null)
    {
        consumer.Name = name;
        consumer.Address = address ?? "";
        consumer.Contact = contact ?? "";
        consumer.Preference = preference ?? "";
        await _db.SaveChangesAsync();
        ViewBag.Success = "个人信息已更新";
    }
    return View(consumer);
}
`));

// === 订单管理模块 ===
children.push(heading2("（二）订单管理模块"));
children.push(p("订单管理模块实现了消费者创建预定订单、查询历史订单以及商家和管理员管理订单的功能。"));

children.push(heading3("（1）创建订单子模块（消费者）"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("消费者登录后首先进入\"商家浏览\"页面，页面上以卡片形式展示所有营业中的商家，每个卡片显示商家名称、地址和联系方式。点击某个商家卡片后，进入该商家的\"菜品浏览\"页面。"));
children.push(screenshotNote("用 zhangsan 登录后的商家浏览页面，展示\"老张快餐\"和\"李氏面馆\"两个商家卡片"));
children.push(figureCaption("图19 商家浏览界面"));
children.push(p("在\"菜品浏览\"页面，每道菜品以卡片形式展示名称、价格、配料和制作方法。每张卡片底部有一个数量输入框（0~256），用户可同时对多道菜品设置订购数量。页面顶部和底部各有一个\"提交预定\"按钮。"));
children.push(screenshotNote("点击老张快餐后的菜品浏览页面，展示其 4 道菜品，每道菜下方有数量选择器"));
children.push(figureCaption("图20 菜品浏览界面（老张快餐）"));
children.push(screenshotNote("在菜品浏览页面中将宫保鸡丁数量设为 2、番茄炒蛋数量设为 1，其他为 0，然后点击\"提交预定\"按钮"));
children.push(figureCaption("图21 选择菜品数量并提交预定"));
children.push(p("如果用户未选择任何菜品（数量全为 0）就点击\"提交预定\"，系统会在右上角弹出黄色警告提示\"未预定任何菜品\"，并不会跳转页面。"));
children.push(screenshotNote("数量全为 0 时点击提交预定后，右上角黄色\"未预定任何菜品\"提示弹窗"));
children.push(figureCaption("图22 空预定警告提示"));
children.push(p("逻辑设计", { noIndent: true, paragraph: {} }));
children.push(screenshotNote("创建订单流程图（FLOWCHARTS.md 图4）"));
children.push(figureCaption("图23 创建订单流程图"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("创建订单功能的核心代码位于 ConsumerController.cs 的 CreateOrder 方法中。该方法接收 dishIds[] 和 quantities[] 两个数组参数，遍历所有菜品，对数量大于 0 的菜品创建 Order 记录，所有订单共享同一个 OrderTime 以便后续按批次分组展示。如果没有任何数量大于 0 的菜品，则设置 TempData[\"NoOrder\"] 标志并重定向回菜品浏览页面。"));
children.push(...codeBlock(`
[HttpPost]
public async Task<IActionResult> CreateOrder(
    int merchantId, int[] dishIds, int[] quantities)
{
    var userId = HttpContext.Session.GetInt32("UserId")!.Value;
    var now = DateTime.Now;
    bool hasAny = false;
    int count = Math.Min(dishIds.Length, quantities.Length);
    for (int i = 0; i < count; i++)
    {
        if (quantities[i] <= 0) continue;
        var dish = await _db.Dishes.FindAsync(dishIds[i]);
        if (dish == null || dish.IsSoldOut) continue;
        _db.Orders.Add(new Order
        {
            UserId = userId, DishId = dishIds[i], OrderTime = now,
            DishName = dish.Name, DishPrice = dish.Price, Quantity = quantities[i]
        });
        hasAny = true;
    }
    if (!hasAny)
    {
        TempData["NoOrder"] = true;
        return RedirectToAction("BrowseDishes", new { merchantId });
    }
    await _db.SaveChangesAsync();
    return RedirectToAction("MyOrders");
}
`));

children.push(heading3("（2）查询订单子模块（消费者）"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("消费者可通过\"我的订单\"页面查看自己的预定历史。订单按批次分组展示，每个批次卡片的标题栏显示下单时间和合计总价，卡片内部以表格形式列出该批次的各项菜品、商家、单价、数量和小计。"));
children.push(screenshotNote("用 zhangsan 登录后点击\"我的订单\"，展示按批次分组的订单列表"));
children.push(figureCaption("图24 消费者我的订单界面"));
children.push(p("逻辑设计", { noIndent: true, paragraph: {} }));
children.push(screenshotNote("查询订单流程图（FLOWCHARTS.md 图5）"));
children.push(figureCaption("图25 查询订单流程图"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("查询订单功能的核心代码位于 ConsumerController.cs 的 MyOrders 方法中。该方法首先查询当前用户的所有订单，然后按 OrderTime 字段分组，通过 OrderBatch ViewModel 计算每个批次的合计金额。"));
children.push(...codeBlock(`
public async Task<IActionResult> MyOrders()
{
    var userId = HttpContext.Session.GetInt32("UserId")!.Value;
    var orders = await _db.Orders
        .Include(o => o.Dish).ThenInclude(d => d!.Merchant)
        .Where(o => o.UserId == userId)
        .OrderByDescending(o => o.OrderTime).ToListAsync();
    var batches = orders.GroupBy(o => o.OrderTime).Select(g => new OrderBatch
    {
        OrderTime = g.Key,
        Items = g.ToList(),
        TotalPrice = g.Sum(o => o.DishPrice * o.Quantity)
    }).ToList();
    return View(batches);
}
`));

children.push(heading3("（3）查询/删除订单子模块（商家）"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("商家可通过\"订单管理\"页面查看属于自己店铺的所有订单。订单同样按批次分组展示，每个批次卡片显示下单时间、消费者用户名、合计金额，以及一个\"拒绝\"按钮。点击\"拒绝\"可删除该批次的全部订单。"));
children.push(screenshotNote("用 laozhang 登录后点击\"订单管理\"，展示订单批次列表"));
children.push(figureCaption("图24 商家订单管理界面"));
children.push(p("逻辑设计", { noIndent: true, paragraph: {} }));
children.push(screenshotNote("拒绝订单流程图（FLOWCHARTS.md 图8）"));
children.push(figureCaption("图25 拒绝订单流程图"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("商家查询订单时，通过 GetMerchantId() 辅助方法获取当前商家的商家编号，然后查询该商家的菜品所关联的订单。删除订单时，通过 batchTime 参数找到同一批次的所有订单并删除。"));
children.push(...codeBlock(`
public async Task<IActionResult> Orders()
{
    var merchantId = await GetMerchantId();
    var orders = await _db.Orders.Include(o => o.Dish).Include(o => o.User)
        .Where(o => o.Dish != null && o.Dish.MerchantId == merchantId)
        .OrderByDescending(o => o.OrderTime).ToListAsync();
    var batches = orders.GroupBy(o => o.OrderTime).Select(g => new OrderBatch
    {
        OrderTime = g.Key, Items = g.ToList(),
        TotalPrice = g.Sum(o => o.DishPrice * o.Quantity)
    }).ToList();
    return View(batches);
}

[HttpPost]
public async Task<IActionResult> DeleteOrder(string batchTime)
{
    if (DateTime.TryParse(batchTime, out var time))
    {
        var orders = await _db.Orders.Where(o => o.OrderTime == time).ToListAsync();
        _db.Orders.RemoveRange(orders);
        await _db.SaveChangesAsync();
    }
    return RedirectToAction("Orders");
}
`));

children.push(heading3("（4）查询/删除订单子模块（管理员）"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("管理员可通过\"订单管理\"页面查看系统中所有订单，每个批次卡片额外显示商家信息。管理员也可以删除任意批次的订单。"));
children.push(screenshotNote("用 admin 登录后点击导航栏\"订单管理\"，展示全部订单批次列表（含商家列）"));
children.push(figureCaption("图25 管理员订单管理界面"));

// === 菜品管理模块 ===
children.push(heading2("（三）菜品管理模块"));
children.push(p("菜品管理模块主要供商家使用，用于管理自己店铺的菜品信息，包括新增菜品、删除菜品和菜品上下架等子功能。"));

children.push(heading3("（1）新增菜品子模块（商家）"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("商家在\"菜品管理\"页面顶部有一个内联表单，可输入菜品名称、价格、配料表和制作方法。填写后点击\"添加\"按钮，新菜品即出现在下方的菜品列表中。"));
children.push(screenshotNote("用 laozhang 登录后点击\"菜品管理\"，展示加菜表单 + 已有菜品列表"));
children.push(figureCaption("图26 商家菜品管理界面（含新增菜品表单）"));
children.push(p("逻辑设计", { noIndent: true, paragraph: {} }));
children.push(screenshotNote("新增菜品流程图（FLOWCHARTS.md 图6）"));
children.push(screenshotNote("菜品上下架流程图（FLOWCHARTS.md 图7）"));
children.push(figureCaption("图27 新增菜品与上下架流程图"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("新增菜品功能的核心代码位于 MerchantController.cs 的 AddDish 方法中。该方法创建新的 Dish 记录，并将 MerchantId 设为当前登录商家。菜品上下架功能通过 ToggleSoldOut 方法实现，该方法在操作前验证菜品所有权，防止越权修改其他商家的菜品。"));
children.push(...codeBlock(`
[HttpPost]
public async Task<IActionResult> AddDish(
    string name, decimal price, string ingredients, string method)
{
    var merchantId = await GetMerchantId();
    _db.Dishes.Add(new Dish
    {
        MerchantId = merchantId, Name = name, Price = price,
        Ingredients = ingredients ?? "", Method = method ?? ""
    });
    await _db.SaveChangesAsync();
    return RedirectToAction("Index");
}

[HttpPost]
public async Task<IActionResult> ToggleSoldOut(int dishId)
{
    var merchantId = await GetMerchantId();
    var dish = await _db.Dishes.FirstOrDefaultAsync(
        d => d.DishId == dishId && d.MerchantId == merchantId);
    if (dish != null)
    {
        dish.IsSoldOut = !dish.IsSoldOut;
        await _db.SaveChangesAsync();
    }
    return RedirectToAction("Index");
}
`));

children.push(heading3("（4）删除菜品子模块（管理员）"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("管理员的\"菜品管理\"页面展示所有商家的全部菜品，可以删除任意菜品。"));
children.push(screenshotNote("用 admin 登录后点击\"菜品管理\"，展示所有商家的菜品列表"));
children.push(figureCaption("图27 管理员菜品管理界面"));

// === 报表打印模块 ===
children.push(heading2("（四）报表打印模块"));

children.push(heading3("（1）打印订单列表子模块（商家）"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("商家在\"订单管理\"页面右上角有\"打印订单列表\"按钮，点击后在新窗口中以打印友好格式展示订单报表。打印视图采用单独的布局，隐藏导航栏和页脚，表格紧凑排列，包含序号、消费者、菜品、单价、数量、小计和时间列。"));
children.push(screenshotNote("用 laozhang 登录后点击\"打印订单列表\"，展示打印风格的订单页面"));
children.push(figureCaption("图28 商家打印订单列表界面"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("打印功能通过 _PrintLayout.cshtml 布局实现，该布局不包含导航栏和页脚，并使用 CSS @media print 规则进一步优化打印效果。"));
children.push(...codeBlock(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8" />
    <title>@ViewData["Title"] - 餐饮预定系统</title>
    <link rel="stylesheet" href="~/lib/bootstrap/dist/css/bootstrap.min.css" />
    <style>
        @media print {
            .no-print { display: none !important; }
            body { font-size: 12px; }
            table { font-size: 11px; }
        }
    </style>
</head>
<body>
    <div class="container mt-4">
        @RenderBody()
    </div>
</body>
</html>
`));

children.push(heading3("（2）打印订单列表子模块（管理员）"));
children.push(p("管理员的打印功能与商家类似，但额外增加了商家列。", { noIndent: false }));
children.push(screenshotNote("用 admin 登录后点击\"打印订单列表\"，展示打印风格的订单页面（含商家列）"));
children.push(figureCaption("图29 管理员打印订单列表界面"));

children.push(heading3("（3）打印用户信息列表子模块（管理员）"));
children.push(p("管理员在\"用户管理\"页面右上角有\"打印用户列表\"按钮，打印输出包含序号、用户名、角色和注册时间列。", { noIndent: false }));
children.push(screenshotNote("用 admin 登录后点击\"打印用户列表\"，展示打印风格的用户列表"));
children.push(figureCaption("图30 管理员打印用户列表界面"));

// === 在线帮助模块 ===
children.push(heading2("（五）在线帮助模块"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("管理员可通过导航栏\"在线帮助\"或控制面板的\"在线帮助\"按钮访问帮助页面。帮助页面以卡片形式展示系统简介、角色说明、使用流程和技术支持信息。"));
children.push(screenshotNote("用 admin 登录后进入在线帮助页面，展示完整的帮助内容"));
children.push(figureCaption("图31 在线帮助界面"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("帮助页面为静态内容，不涉及数据库操作。", { noIndent: false }));

// === 系统备份和恢复模块 ===
children.push(heading2("（六）系统备份和恢复模块"));

children.push(heading3("（1）系统备份子模块"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("管理员在\"系统备份\"页面点击\"执行备份\"按钮，系统调用 mysqldump 命令行工具将数据库导出为 SQL 文件，保存到服务器 wwwroot/backups/ 目录下，并在页面上显示备份结果信息。"));
children.push(screenshotNote("用 admin 登录后进入系统备份页面，点击按钮后显示备份成功信息"));
children.push(figureCaption("图32 系统备份界面"));
children.push(p("逻辑设计", { noIndent: true, paragraph: {} }));
children.push(screenshotNote("系统备份流程图（FLOWCHARTS.md 图9）"));
children.push(figureCaption("图33 系统备份流程图"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("备份功能通过 Process.Start() 调用 MySQL 自带的 mysqldump.exe 命令行工具实现。系统从连接字符串中解析主机、端口、用户名、密码和数据库名，然后构造 mysqldump 命令并执行。"));
children.push(...codeBlock(`
[HttpPost]
public IActionResult Backup(string _)
{
    try
    {
        var backupDir = Path.Combine(_env.WebRootPath, "backups");
        Directory.CreateDirectory(backupDir);
        var file = Path.Combine(backupDir, 
            $"backup_{DateTime.Now:yyyyMMdd_HHmmss}.sql");
        var connStr = _db.Database.GetConnectionString()!;
        var parts = ParseConnectionString(connStr);
        var psi = new ProcessStartInfo
        {
            FileName = @"D:\\...\\mysql-8.0.28-winx64\\bin\\mysqldump.exe",
            Arguments = $"-u {parts.user} -p{parts.password} " +
                $"-P {parts.port} -h {parts.host} " +
                $"{parts.database} --result-file=\\"{file}\\"",
            RedirectStandardError = true, UseShellExecute = false,
            CreateNoWindow = true
        };
        var proc = Process.Start(psi);
        var err = proc!.StandardError.ReadToEnd();
        proc.WaitForExit();
        ViewBag.Message = proc.ExitCode == 0 
            ? $"备份成功! 文件: {file}" : $"备份失败: {err}";
    }
    catch (Exception ex)
    {
        ViewBag.Message = $"备份失败: {ex.Message}";
    }
    return View();
}
`));

children.push(heading3("（2）系统恢复子模块"));
children.push(p("界面设计", { noIndent: true, paragraph: {} }));
children.push(p("管理员在\"系统恢复\"页面选择一个 .sql 备份文件并上传，系统调用 mysql 命令行工具将文件中的 SQL 语句导入数据库，并在页面上显示恢复结果信息。"));
children.push(screenshotNote("用 admin 登录后进入系统恢复页面，选择文件上传"));
children.push(figureCaption("图33 系统恢复界面"));
children.push(p("逻辑设计", { noIndent: true, paragraph: {} }));
children.push(screenshotNote("系统恢复流程图（FLOWCHARTS.md 图10）"));
children.push(figureCaption("图34 系统恢复流程图"));
children.push(p("关键实现", { noIndent: true, paragraph: {} }));
children.push(p("恢复功能首先将上传的文件保存到临时路径，读取全部 SQL 内容，然后通过 Process.Start() 调用 mysql.exe 命令行工具，将 SQL 通过标准输入导入数据库。"));
children.push(...codeBlock(`
[HttpPost]
public async Task<IActionResult> Restore(IFormFile? backupFile)
{
    if (backupFile == null || backupFile.Length == 0)
    {
        ViewBag.Message = "请选择备份文件";
        return View();
    }
    try
    {
        var tempPath = Path.GetTempFileName();
        using (var stream = System.IO.File.Create(tempPath))
            await backupFile.CopyToAsync(stream);
        var connStr = _db.Database.GetConnectionString()!;
        var parts = ParseConnectionString(connStr);
        var psi = new ProcessStartInfo
        {
            FileName = @"D:\\...\\mysql-8.0.28-winx64\\bin\\mysql.exe",
            Arguments = $"-u {parts.user} -p{parts.password} " +
                $"-P {parts.port} -h {parts.host} {parts.database}",
            RedirectStandardInput = true, RedirectStandardError = true,
            UseShellExecute = false, CreateNoWindow = true
        };
        var proc = Process.Start(psi)!;
        proc.StandardInput.Write(System.IO.File.ReadAllText(tempPath));
        proc.StandardInput.Close();
        var err = proc.StandardError.ReadToEnd();
        proc.WaitForExit();
        System.IO.File.Delete(tempPath);
        ViewBag.Message = proc.ExitCode == 0 ? "恢复成功!" : $"恢复失败: {err}";
    }
    catch (Exception ex)
    {
        ViewBag.Message = $"恢复失败: {ex.Message}";
    }
    return View();
}
`));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Section 4 ----
children.push(heading1("四、系统的测试"));

children.push(heading2("（一）用户管理"));

children.push(heading3("（1）用户登录"));
children.push(p("用合法输入和非法输入分别测试登录功能。"));
children.push(p("当用户输入正确的用户名 zhangsan 和密码 123456 后点击登录，系统验证通过，右上角弹出\"登录成功!\"提示，并自动跳转到消费者商家浏览页面。", { noIndent: false }));
children.push(screenshotNote("zhangsan 登录成功的界面，展示弹出提示和跳转后的商家浏览页"));
children.push(figureCaption("图34 用户登录成功测试"));
children.push(p("当用户输入错误的密码时，系统返回登录页面并在表单上方显示红色错误提示\"用户名或密码错误\"。", { noIndent: false }));
children.push(screenshotNote("输入 zhangsan + 错误密码后的登录页面，显示红色错误提示"));
children.push(figureCaption("图35 用户登录失败测试"));

children.push(heading3("（2）用户注册"));
children.push(p("当用户输入未使用的用户名、合法的密码和个人信息后点击注册，系统创建账号，弹出登录成功提示，并自动登录跳转至对应功能页面。", { noIndent: false }));
children.push(screenshotNote("注册一个新消费者账号，展示注册成功后的页面"));
children.push(figureCaption("图36 用户注册成功测试"));
children.push(p("当用户输入已存在的用户名时，系统返回注册页面并显示\"用户名已存在\"错误提示。", { noIndent: false }));
children.push(screenshotNote("用 zhangsan（已存在）注册，展示用户名已存在的错误提示"));
children.push(figureCaption("图37 用户注册失败（用户名已存在）测试"));

children.push(heading3("（3）用户退出"));
children.push(p("用户登录后点击导航栏\"退出\"按钮，Session 被清除，页面跳转到登录页面。导航栏恢复为仅显示\"登录\"和\"注册\"按钮。", { noIndent: false }));
children.push(screenshotNote("退出后的登录页面，展示未登录状态的导航栏"));
children.push(figureCaption("图38 用户退出测试"));

children.push(heading3("（4）用户修改"));
children.push(p("用户修改密码时，输入正确的原密码和一致的新密码后点击确认，系统提示\"密码修改成功\"。", { noIndent: false }));
children.push(screenshotNote("修改密码成功后的页面，展示绿色\"密码修改成功\"提示"));
children.push(figureCaption("图39 修改密码成功测试"));
children.push(p("用户修改密码时，如输入错误的原密码，系统提示\"原密码错误\"。", { noIndent: false }));
children.push(screenshotNote("修改密码输入错误原密码后，展示\"原密码错误\"提示"));
children.push(figureCaption("图40 修改密码失败测试"));
children.push(p("消费者编辑个人资料时，修改姓名、地址等信息后点击保存，系统提示\"个人信息已更新\"。", { noIndent: false }));
children.push(screenshotNote("消费者编辑个人资料保存成功后的页面"));
children.push(figureCaption("图41 消费者编辑个人资料测试"));
children.push(p("商家编辑店铺资料时，修改信息并切换营业状态，测试\"营业中\"和\"已歇业\"状态切换。", { noIndent: false }));
children.push(screenshotNote("商家点击\"设为歇业\"后的页面，展示状态已切换"));
children.push(figureCaption("图42 商家营业状态切换测试"));

children.push(heading3("（5）用户删除（管理员）"));
children.push(p("管理员在用户管理页面点击某个用户的\"删除\"按钮，弹出确认对话框，确认后该用户及其关联数据被删除。", { noIndent: false }));
children.push(screenshotNote("管理员用户管理页面，展示删除确认对话框"));
children.push(figureCaption("图43 管理员删除用户测试"));

children.push(heading2("（二）订单管理"));

children.push(heading3("（1）创建订单"));
children.push(p("消费者浏览商家菜品后，设置宫保鸡丁数量为 2、番茄炒蛋数量为 1，点击提交预定，系统成功创建订单并跳转到\"我的订单\"页面，显示刚才创建的订单批次，合计金额为 ¥40.00。", { noIndent: false }));
children.push(screenshotNote("创建订单后的我的订单页面，展示包含 2 个菜品的订单批次"));
children.push(figureCaption("图44 创建订单成功测试"));
children.push(p("消费者不选择任何菜品点击提交预定，弹出\"未预定任何菜品\"黄色警告提示，停留在当前页面。", { noIndent: false }));
children.push(screenshotNote("空预定时的警告提示（与图22可共用或重截一次）"));
children.push(figureCaption("图45 空预定测试"));

children.push(heading3("（2）查询订单"));
children.push(p("消费者可查看按批次分组的订单历史。", { noIndent: false }));

children.push(heading3("（3）删除订单（商家拒绝订单）"));
children.push(p("商家点击\"拒绝\"按钮并确认后，该批次订单被删除。", { noIndent: false }));
children.push(screenshotNote("商家订单管理页面，展示确认拒绝对话框"));
children.push(figureCaption("图46 商家拒绝订单测试"));

children.push(heading3("（4）删除订单（管理员）"));
children.push(p("管理员可删除任意订单批次。", { noIndent: false }));

children.push(heading2("（三）菜品管理"));

children.push(heading3("（1）新增菜品"));
children.push(p("商家填写菜品信息后点击添加，新菜品出现在列表中。", { noIndent: false }));
children.push(screenshotNote("商家添加菜品后的列表，展示新增的菜品"));
children.push(figureCaption("图47 商家新增菜品测试"));

children.push(heading3("（2）菜品上下架"));
children.push(p("商家点击\"售罄\"按钮，菜品状态变为售罄；再次点击\"上架\"，状态恢复。售罄的菜品不会在消费者的菜品浏览页面中显示。", { noIndent: false }));

children.push(heading3("（3）删除菜品"));
children.push(p("商家或管理员点击\"删除\"按钮并确认后，菜品及其关联订单被删除。", { noIndent: false }));

children.push(heading2("（四）报表打印"));
children.push(p("点击打印按钮后，在新窗口中显示打印友好格式的报表。使用浏览器打印功能（Ctrl+P）可输出为 PDF 或纸质文档。", { noIndent: false }));
children.push(screenshotNote("打印预览页面，展示完整的打印订单列表"));
children.push(figureCaption("图48 打印订单列表测试"));

children.push(heading2("（五）在线帮助"));
children.push(p("管理员进入在线帮助页面，查看完整的系统使用说明。", { noIndent: false }));
children.push(screenshotNote("在线帮助页面完整内容（可与图31共用）"));
children.push(figureCaption("图49 在线帮助测试"));

children.push(heading2("（六）系统备份和恢复"));

children.push(heading3("（1）系统备份"));
children.push(p("管理员点击\"执行备份\"按钮，系统调用 mysqldump 导出数据库，页面显示备份成功信息及备份文件路径。", { noIndent: false }));
children.push(screenshotNote("系统备份成功后的页面，展示备份文件路径提示"));
children.push(figureCaption("图50 系统备份测试"));

children.push(heading3("（2）系统恢复"));
children.push(p("管理员选择一个 .sql 备份文件上传并点击\"执行恢复\"，系统将数据恢复到数据库，页面显示恢复成功信息。", { noIndent: false }));
children.push(screenshotNote("系统恢复成功后的页面，展示\"恢复成功\"提示"));
children.push(figureCaption("图51 系统恢复测试"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Section 5 ----
children.push(heading1("五、软件开发总结"));

children.push(heading2("（一）主要功能"));
children.push(p("本餐饮预定系统实现的主要功能包括：用户注册与登录认证、消费者浏览商家和菜品并创建订单、商家管理菜品和处理订单、管理员全局管理用户与系统数据、订单报表打印、在线帮助、以及数据库备份与恢复。系统支持消费者在单次操作中选择多道菜品并设置数量，订单按批次分组展示并自动计算合计金额，商家可以灵活管理菜品的上下架状态和营业状态。"));

children.push(heading2("（二）主要用途"));
children.push(p("本系统的主要用途是面向校园食堂或社区内的小微型餐饮商家，提供低成本的线上订单管理服务。商家无需入驻大型外卖平台即可通过本系统接收消费者的预定订单，提高出餐效率。消费者可通过浏览器方便地浏览营业中的商家及其菜品，在线提交预定并查看历史订单。"));

children.push(heading2("（三）技术特点"));
children.push(p("本系统采用 C# ASP.NET Core MVC + Entity Framework Core + MySQL 的技术方案，具有以下技术特点：(1) 采用 B/S 架构，用户无需安装客户端，通过浏览器即可访问；(2) 使用 Entity Framework Core ORM 框架，以面向对象方式操作数据库，减少了手写 SQL 的工作量；(3) Session 会话机制实现轻量级身份认证和角色权限控制；(4) 订单采用同时间戳批次设计，支持多菜品批量下单和分组展示；(5) 使用 Bootstrap 5 响应式前端框架，界面适配不同屏幕尺寸；(6) 系统备份与恢复通过调用 MySQL 命令行工具实现，操作简单可靠。"));

children.push(heading2("（四）下一步工作"));
children.push(p("本系统目前实现了全部需求文档规定的功能，但仍有以下可改进方向：(1) 增加订单状态流转（待确认 → 已确认 → 制作中 → 已完成），替代当前的简单删除模式；(2) 增加分页和搜索功能，优化大量数据下的页面性能；(3) 增加菜品图片上传功能，提升用户体验；(4) 增加购物车功能，允许消费者跨商家浏览后再统一结算；(5) 增加评价和评分系统；(6) 采用 ASP.NET Core Identity 替代当前的自定义 Session 认证，增强安全性；(7) 增加消息通知功能，当订单状态变化时实时通知消费者。"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Appendix ----
children.push(heading1("附录 实验代码文档"));
children.push(p("餐饮预定系统（028123073/胡云箫）", { noIndent: false, paragraph: {} }));

// ============ Build Document ============

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT_BODY, size: SIZE_BODY },
        paragraph: { spacing: { line: LINE_SPACING } },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: SIZE_H1, bold: true, font: FONT_HEADING },
        paragraph: { spacing: { before: 240, after: 120, line: LINE_SPACING }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: SIZE_H2, bold: true, font: FONT_HEADING },
        paragraph: { spacing: { before: 180, after: 60, line: LINE_SPACING }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: SIZE_H3, bold: true, font: FONT_HEADING },
        paragraph: { spacing: { before: 120, after: 60, line: LINE_SPACING }, outlineLevel: 2 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: 1418, bottom: 1418, left: 1701, right: 1418 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "餐饮预定系统实验报告", font: FONT_BODY, size: 18, color: "888888" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "第 ", font: FONT_BODY, size: 18 }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 18 }),
              new TextRun({ text: " 页", font: FONT_BODY, size: 18 }),
            ],
          })],
        }),
      },
      children,
    },
  ],
});

// ============ Output ============

const outputPath = "D:\\理想电信实习\\.opencode\\skills\\餐饮预定系统实验报告.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Document saved to: ${outputPath}`);
  console.log(`   File size: ${(buffer.length / 1024).toFixed(1)} KB`);
});
