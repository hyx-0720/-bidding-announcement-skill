// 招标公告 DOCX 渲染器（基于 docx-js）
// 用法：
//   $env:NODE_PATH = (npm root -g)
//   node render_docx.js <input.json> <output.docx>
//
// input.json 结构：
// {
//   "settings": {                      // 可选，缺省用内置默认样式
//     "default_font": "微软雅黑",
//     "default_size_pt": 10.5,         // 正文字号(pt)
//     "title_color": "383940",         // 主标题颜色(十六进制，无#)
//     "body_color": "383838",          // 正文颜色
//     "title_align": "center",         // center | left
//     "margin_cm": { "top":2.54, "bottom":2.54, "left":3.18, "right":3.18 }
//   },
//   "blocks": [
//     { "style": "title",       "text": "..." },
//     { "style": "section",     "text": "一、项目基本情况" },
//     { "style": "subheading",  "text": "1. 采购人信息" },
//     { "style": "body",        "text": "正文段落..." },
//     { "style": "body_indent", "text": "（1）首行缩进的编号段落..." },
//     { "style": "body",        "runs": [ {"text":"名 称：","bold":true}, {"text":"xxx公司"} ] }
//   ]
// }
//
// style 取值：title | section | subheading | body | body_indent
// 每个 block 用 "text"（纯文本）或 "runs"（行内分段，可逐段 bold）二选一。

const fs = require("fs");
const path = require("path");

let docx;
try {
  docx = require("docx");
} catch (e) {
  console.error(
    "无法加载 docx 模块。请先全局安装：npm install -g docx，并设置 NODE_PATH=(npm root -g)。"
  );
  process.exit(1);
}

const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;

const cmToTwips = (cm) => Math.round((cm * 1440) / 2.54);
const ptToHalf = (pt) => Math.round(pt * 2);

function buildConfig(settings) {
  const s = settings || {};
  const font = s.default_font || "微软雅黑";
  const bodyHalf = ptToHalf(s.default_size_pt != null ? s.default_size_pt : 10.5);
  const titleHalf = bodyHalf + 9; // 主标题比正文大约 4.5pt
  const bodyColor = s.body_color || "383838";
  const titleColor = s.title_color || "383940";
  const titleAlign =
    (s.title_align || "center") === "left"
      ? AlignmentType.LEFT
      : AlignmentType.CENTER;
  const m = s.margin_cm || {};
  const margin = {
    top: cmToTwips(m.top != null ? m.top : 2.54),
    bottom: cmToTwips(m.bottom != null ? m.bottom : 2.54),
    left: cmToTwips(m.left != null ? m.left : 3.18),
    right: cmToTwips(m.right != null ? m.right : 3.18),
  };

  const STYLES = {
    title: {
      size: titleHalf,
      bold: true,
      color: titleColor,
      alignment: titleAlign,
      spacing: { before: 300, after: 200 },
    },
    section: {
      size: bodyHalf,
      bold: true,
      color: bodyColor,
      spacing: { before: 160, after: 120, line: 276, lineRule: "auto" },
    },
    subheading: {
      size: bodyHalf,
      bold: true,
      color: bodyColor,
      spacing: { before: 120, after: 80, line: 276, lineRule: "auto" },
    },
    body: {
      size: bodyHalf,
      bold: false,
      color: bodyColor,
      spacing: { after: 120, line: 276, lineRule: "auto" },
    },
    body_indent: {
      size: bodyHalf,
      bold: false,
      color: bodyColor,
      spacing: { after: 120, line: 276, lineRule: "auto" },
      indent: { firstLine: Math.round(bodyHalf * 20) }, // 约 2 字符
    },
  };

  return { font, bodyHalf, margin, STYLES };
}

function buildParagraph(block, cfg) {
  const styleName = block.style || "body";
  const s = cfg.STYLES[styleName] || cfg.STYLES.body;

  let runs;
  if (Array.isArray(block.runs)) {
    runs = block.runs.map(
      (r) =>
        new TextRun({
          text: r.text != null ? String(r.text) : "",
          bold: r.bold != null ? !!r.bold : s.bold,
          font: cfg.font,
          size: s.size,
          color: s.color,
        })
    );
  } else {
    runs = [
      new TextRun({
        text: block.text != null ? String(block.text) : "",
        bold: s.bold,
        font: cfg.font,
        size: s.size,
        color: s.color,
      }),
    ];
  }

  const para = { children: runs, spacing: s.spacing };
  if (s.alignment) para.alignment = s.alignment;
  if (s.indent) para.indent = s.indent;

  return new Paragraph(para);
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error("用法：node render_docx.js <input.json> <output.docx>");
    process.exit(1);
  }

  let data;
  try {
    let raw = fs.readFileSync(inputPath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // 剥离 BOM
    data = JSON.parse(raw);
  } catch (e) {
    console.error("读取/解析输入 JSON 失败：" + e.message);
    process.exit(1);
  }

  const blocks = Array.isArray(data) ? data : data.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    console.error("输入 JSON 必须含非空的 blocks 数组。");
    process.exit(1);
  }

  const cfg = buildConfig(Array.isArray(data) ? null : data.settings);
  const children = blocks.map((b) => buildParagraph(b, cfg));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: cfg.font, size: cfg.bodyHalf } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 (DXA)
            margin: cfg.margin,
          },
        },
        children,
      },
    ],
  });

  Packer.toBuffer(doc)
    .then((buffer) => {
      fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
      fs.writeFileSync(outputPath, buffer);
      console.log("已生成：" + outputPath);
    })
    .catch((e) => {
      console.error("生成 DOCX 失败：" + e.message);
      process.exit(1);
    });
}

main();
