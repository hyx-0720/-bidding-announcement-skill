#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
招标公告 PDF 渲染器（基于 reportlab）。

复用与 render_docx.js 完全相同的 blocks JSON（{settings, blocks}），输出 A4 PDF。

用法：
  python render_pdf.py <input.json> <output.pdf>

input.json：
{
  "settings": {                 // 可选
    "default_size_pt": 10.5,
    "title_color": "383940",
    "body_color": "383838",
    "title_align": "center",    // center | left
    "margin_cm": { "top":2.54, "bottom":2.54, "left":3.18, "right":3.18 },
    "font_path": "C:/Windows/Fonts/simsun.ttc"   // 可选：指定中文 TTF/TTC（支持更准确字体）
  },
  "blocks": [ { "style": "title|section|subheading|body|body_indent", "text": "..." | "runs": [{"text":"..","bold":true}] } ]
}

中文字体：默认使用内置 CID 字体 STSong-Light（无需外部文件）。如需特定字体/更明显的加粗，
可在 settings.font_path 指定 TTF/TTC。注意：标准 CID 字体无独立粗体字形，加粗主要靠字号区分。
"""

import sys
import io
import os
import json
import argparse

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
except Exception:
    pass

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    from reportlab.pdfbase.ttfonts import TTFont
except ImportError:
    print("缺少 reportlab。请先安装：python -m pip install reportlab", file=sys.stderr)
    sys.exit(1)


def register_font(settings):
    """注册中文字体，返回字体名。优先 settings.font_path（TTF/TTC），否则用 CID STSong-Light。"""
    fp = (settings or {}).get("font_path")
    if fp and os.path.isfile(fp):
        try:
            name = "UserCJK"
            pdfmetrics.registerFont(TTFont(name, fp))
            pdfmetrics.registerFontFamily(name, normal=name, bold=name, italic=name, boldItalic=name)
            return name
        except Exception as e:
            print("指定字体加载失败，回退 STSong-Light：" + str(e), file=sys.stderr)
    name = "STSong-Light"
    pdfmetrics.registerFont(UnicodeCIDFont(name))
    pdfmetrics.registerFontFamily(name, normal=name, bold=name, italic=name, boldItalic=name)
    return name


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def block_to_markup(block):
    if isinstance(block.get("runs"), list):
        parts = []
        for r in block["runs"]:
            t = esc(r.get("text", ""))
            parts.append("<b>%s</b>" % t if r.get("bold") else t)
        return "".join(parts)
    return esc(block.get("text", ""))


def build_styles(settings, font):
    s = settings or {}
    body = float(s.get("default_size_pt", 10.5))
    title = body + 4.5
    body_color = HexColor("#" + s.get("body_color", "383838"))
    title_color = HexColor("#" + s.get("title_color", "383940"))
    title_align = TA_LEFT if (s.get("title_align") == "left") else TA_CENTER

    common = dict(fontName=font, textColor=body_color, leading=body * 1.45)
    return {
        "title": ParagraphStyle("title", fontName=font, fontSize=title, textColor=title_color,
                                 alignment=title_align, leading=title * 1.3,
                                 spaceBefore=14, spaceAfter=10),
        "section": ParagraphStyle("section", fontSize=body, spaceBefore=8, spaceAfter=6, **common),
        "subheading": ParagraphStyle("subheading", fontSize=body, spaceBefore=6, spaceAfter=4, **common),
        "body": ParagraphStyle("body", fontSize=body, spaceBefore=0, spaceAfter=5, **common),
        "body_indent": ParagraphStyle("body_indent", fontSize=body, spaceBefore=0, spaceAfter=5,
                                      firstLineIndent=body * 2, **common),
    }, body


def main():
    ap = argparse.ArgumentParser(description="招标公告 PDF 渲染器")
    ap.add_argument("input")
    ap.add_argument("output")
    args = ap.parse_args()

    try:
        raw = open(args.input, "r", encoding="utf-8-sig").read()
        data = json.loads(raw)
    except Exception as e:
        print("读取/解析输入 JSON 失败：" + str(e), file=sys.stderr)
        sys.exit(1)

    blocks = data if isinstance(data, list) else data.get("blocks")
    settings = None if isinstance(data, list) else data.get("settings")
    if not isinstance(blocks, list) or not blocks:
        print("输入 JSON 必须含非空的 blocks 数组。", file=sys.stderr)
        sys.exit(1)

    font = register_font(settings)
    styles, _ = build_styles(settings, font)

    m = (settings or {}).get("margin_cm", {})
    margins = dict(
        topMargin=float(m.get("top", 2.54)) * cm,
        bottomMargin=float(m.get("bottom", 2.54)) * cm,
        leftMargin=float(m.get("left", 3.18)) * cm,
        rightMargin=float(m.get("right", 3.18)) * cm,
    )

    out_dir = os.path.dirname(os.path.abspath(args.output))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    doc = SimpleDocTemplate(args.output, pagesize=A4, **margins)
    story = []
    for b in blocks:
        style = styles.get(b.get("style", "body"), styles["body"])
        story.append(Paragraph(block_to_markup(b), style))

    try:
        doc.build(story)
    except Exception as e:
        print("生成 PDF 失败：" + str(e), file=sys.stderr)
        sys.exit(1)
    print("已生成：" + args.output)


if __name__ == "__main__":
    main()
