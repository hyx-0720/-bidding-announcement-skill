#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
从已有 .docx 招标公告中提取样式，输出 render_docx.js 可用的 settings JSON。

用法：
  python extract_style.py <input.docx> [--out settings.json]

提取项：
  - default_font     默认字体（优先中文 eastAsia 字体）
  - default_size_pt  默认正文字号（pt）
  - margin_cm        页边距（上/下/左/右，cm）
  - title_color/title_align  首段（疑似标题）颜色与对齐（尽力而为，取不到则省略）

仅做尽力而为的提取；提取结果应交用户确认后再用于生成。内容/结构请用 pandoc 提取后由 LLM 分析。
"""

import sys
import io
import os
import json
import argparse
import zipfile
import xml.etree.ElementTree as ET

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
except Exception:
    pass

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def q(tag):
    return f"{{{W}}}{tag}"


def attr(el, name):
    return el.get(q(name)) if el is not None else None


def twips_to_cm(tw):
    try:
        return round(int(tw) * 2.54 / 1440, 2)
    except (TypeError, ValueError):
        return None


def extract(docx_path):
    settings = {}
    with zipfile.ZipFile(docx_path) as z:
        names = set(z.namelist())
        styles_xml = z.read("word/styles.xml") if "word/styles.xml" in names else None
        document_xml = z.read("word/document.xml") if "word/document.xml" in names else None

    # ---- 默认字体与字号（docDefaults，回退 Normal 样式）----
    if styles_xml:
        sroot = ET.fromstring(styles_xml)
        rpr = None
        dd = sroot.find(q("docDefaults"))
        if dd is not None:
            rprd = dd.find(q("rPrDefault"))
            if rprd is not None:
                rpr = rprd.find(q("rPr"))
        if rpr is None:
            for st in sroot.findall(q("style")):
                if attr(st, "styleId") == "Normal" or (st.find(q("name")) is not None and attr(st.find(q("name")), "val") == "Normal"):
                    rpr = st.find(q("rPr"))
                    break
        if rpr is not None:
            rfonts = rpr.find(q("rFonts"))
            if rfonts is not None:
                font = attr(rfonts, "eastAsia") or attr(rfonts, "ascii") or attr(rfonts, "hAnsi")
                if font:
                    settings["default_font"] = font
            sz = rpr.find(q("sz"))
            if sz is not None and attr(sz, "val"):
                try:
                    settings["default_size_pt"] = round(int(attr(sz, "val")) / 2, 1)
                except ValueError:
                    pass

    # ---- 页边距 与 首段标题样式 ----
    if document_xml:
        droot = ET.fromstring(document_xml)
        body = droot.find(q("body"))
        if body is not None:
            # 最后一个 sectPr 的 pgMar
            sectprs = body.findall(q("sectPr"))
            if sectprs:
                pgmar = sectprs[-1].find(q("pgMar"))
                if pgmar is not None:
                    m = {}
                    for side in ("top", "bottom", "left", "right"):
                        cm = twips_to_cm(attr(pgmar, side))
                        if cm is not None:
                            m[side] = cm
                    if m:
                        settings["margin_cm"] = m
            # 首个非空段落作为疑似标题
            for p in body.findall(q("p")):
                runs = p.findall(q("r"))
                text = "".join((t.text or "") for r in runs for t in r.findall(q("t")))
                if not text.strip():
                    continue
                ppr = p.find(q("pPr"))
                if ppr is not None:
                    jc = ppr.find(q("jc"))
                    val = attr(jc, "val") if jc is not None else None
                    if val in ("center", "left"):
                        settings["title_align"] = val
                # 首个 run 的颜色
                if runs:
                    rpr = runs[0].find(q("rPr"))
                    if rpr is not None:
                        color = rpr.find(q("color"))
                        cval = attr(color, "val") if color is not None else None
                        if cval and cval.lower() not in ("auto",):
                            settings["title_color"] = cval
                break

    return settings


def main():
    ap = argparse.ArgumentParser(description="从 .docx 提取样式 settings")
    ap.add_argument("input", help="输入 .docx 路径")
    ap.add_argument("--out", help="将 settings JSON 写入该文件（UTF-8）")
    args = ap.parse_args()

    if not os.path.isfile(args.input):
        print("文件不存在：" + args.input, file=sys.stderr)
        sys.exit(2)
    try:
        settings = extract(args.input)
    except zipfile.BadZipFile:
        print("不是有效的 .docx（ZIP）文件。若为 .doc 请先转换为 .docx。", file=sys.stderr)
        sys.exit(2)
    except KeyError as e:
        print("解析 docx 结构失败：" + str(e), file=sys.stderr)
        sys.exit(2)

    out = json.dumps({"settings": settings}, ensure_ascii=False, indent=2)
    print(out)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fp:
            fp.write(out)


if __name__ == "__main__":
    main()
