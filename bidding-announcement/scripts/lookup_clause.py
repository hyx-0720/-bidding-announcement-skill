#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
条款精准提取工具。从 legal-kb/ 的法规文件中按条号提取单条原文。

用法：
  python lookup_clause.py <法规文件名> <条号>               # 提取指定条
  python lookup_clause.py <法规文件名> --list                # 列出所有条号
  python lookup_clause.py <法规文件名> --search "关键词"     # 搜索含关键词的条
  python lookup_clause.py --index                           # 列出所有法规与条号范围

条号支持：22 | 二十二 | 第一百二十五 | 35
法规文件名：zhengfucaigou-fa | zhaobiaotoubiao-fa | ...（不含 .md）
"""

import sys, io, os, re, argparse

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
except Exception:
    pass

KB = r"D:\理想电信实习\.opencode\skills\bidding-announcement\references\legal-kb"

CN_NUM = {
    "零": 0, "〇": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9,
    "十": 10, "百": 100, "千": 1000, "万": 10000,
}

# 第X条 的匹配（中文数字 + 可能阿拉伯数字 + 的/之）
ARTICLE_PAT = re.compile(
    r'(?:^|\n)\s*(?:[（(]\s*)?第\s*([一二三四五六七八九十百千万零〇\d]+)\s*条\b'
)

def cn_to_int(s: str) -> int:
    """中文数字 → 阿拉伯数字"""
    s = s.strip()
    if s.isdigit():
        return int(s)
    result = 0
    segment = 0
    for ch in s:
        if ch in CN_NUM and CN_NUM[ch] >= 10:
            segment = (segment or 1) * CN_NUM[ch]
            result += segment
            segment = 0
        else:
            segment = CN_NUM.get(ch, 0)
    result += segment
    return result


def find_articles(text: str):
    """返回 [(条号(int), 起始位置, 结束位置), ...]"""
    articles = []
    for m in ARTICLE_PAT.finditer(text):
        num = cn_to_int(m.group(1))
        articles.append((num, m.start(), m.group()))
    return articles


def extract_article(text, target_num, fname="?"):
    """提取第target_num条的全文。"""
    articles = find_articles(text)
    if not articles:
        print(f"[{fname}] 未发现任何条款（可能格式不匹配）", file=sys.stderr)
        sys.exit(1)
    # 找到目标条号
    idx = None
    for i, (num, pos, _) in enumerate(articles):
        if num == target_num:
            idx = i
            break
    if idx is None:
        print(f"[{fname}] 未找到 第{target_num}条", file=sys.stderr)
        avail = sorted(set(n for n, _, _ in articles))
        print(f"  可用条号: {avail[:20]}{'...' if len(avail)>20 else ''}", file=sys.stderr)
        sys.exit(1)
    start = articles[idx][1]
    end = articles[idx + 1][1] if idx + 1 < len(articles) else len(text)
    article_text = text[start:end].strip()
    return article_text


def list_articles(text, fname):
    articles = find_articles(text)
    if not articles:
        print(f"[{fname}] 未识别到条款", file=sys.stderr)
        return
    print(f"[{fname}] 共 {len(articles)} 条，范围 第{articles[0][0]}条 - 第{articles[-1][0]}条")
    for num, pos, _ in articles:  # show first 30
        preview = text[pos:pos+80].replace("\n"," ").strip()
        print(f"  第{num}条: {preview[:60]}...")
    if len(articles) > 30:
        print(f"  ... (共 {len(articles)} 条)")


def search_articles(text, keyword, fname):
    articles = find_articles(text)
    if not articles:
        print(f"[{fname}] 未识别到条款", file=sys.stderr)
        return
    hits = []
    for i, (num, start, _) in enumerate(articles):
        end = articles[i+1][1] if i+1 < len(articles) else len(text)
        body = text[start:end]
        if keyword.lower() in body.lower():
            hits.append((num, body.strip()))
    if hits:
        print(f"[{fname}] 命中 {len(hits)} 条：")
        for num, body in hits:
            preview = body.replace("\n"," ")[:200]
            print(f"\n  第{num}条: ...{preview}...")
    else:
        print(f"[{fname}] 未找到含关键词「{keyword}」的条款", file=sys.stderr)


def list_all_regulations():
    """列出 KB 中所有法规及其条号范围。"""
    if not os.path.isdir(KB):
        print("legal-kb 目录不存在", file=sys.stderr)
        return
    print("法规文件名                     | 条号范围")
    print("-"*60)
    for f in sorted(os.listdir(KB)):
        if f.startswith("_") or not f.endswith(".md"):
            continue
        if f in ("index.md","INGEST-PROTOCOL.md","SOURCE-GUIDE.md"):
            continue
        fpath = os.path.join(KB, f)
        with open(fpath, "r", encoding="utf-8") as fp:
            content = fp.read()
        # 跳过 YAML frontmatter
        body = content
        if content.startswith("---"):
            parts = content.split("---", 2)
            body = parts[2] if len(parts) > 2 else content
        articles = find_articles(body)
        if articles:
            print(f" {f:<32} | 第{articles[0][0]}条 - 第{articles[-1][0]}条")
        else:
            print(f" {f:<32} | (未识别)")


def main():
    ap = argparse.ArgumentParser(description="条款精准提取工具")
    ap.add_argument("file", nargs="?", help="法规文件名（不含 .md）")
    ap.add_argument("article", nargs="?", help="条号：22 | 二十二")
    ap.add_argument("--list", action="store_true", help="列出某法规的所有条号")
    ap.add_argument("--search", help="搜索含关键词的条款")
    ap.add_argument("--index", action="store_true", help="列出所有法规及其条号范围")
    args = ap.parse_args()

    if args.index:
        list_all_regulations()
        return

    if not args.file:
        ap.print_help()
        sys.exit(1)

    fpath = os.path.join(KB, args.file if args.file.endswith(".md") else args.file + ".md")
    if not os.path.isfile(fpath):
        print(f"文件不存在: {fpath}", file=sys.stderr)
        print("可用文件列表:", file=sys.stderr)
        list_all_regulations()
        sys.exit(1)

    with open(fpath, "r", encoding="utf-8") as fp:
        content = fp.read()
    # 跳过 YAML frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        content = parts[2] if len(parts) > 2 else content

    if args.search:
        search_articles(content, args.search, args.file)
    elif args.list:
        list_articles(content, args.file)
    elif args.article:
        num = cn_to_int(args.article)
        result = extract_article(content, num, args.file)
        print(result)
    else:
        ap.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
