#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
doc_to_questions.py
=====================================
读取你整理好的题目文件，自动转换为 questions.js 格式。
支持格式：.docx（Word 文档）、.txt（纯文本）

使用方法：
  python doc_to_questions.py  输入文件.docx  [--out questions.js] [--append]
  python doc_to_questions.py  输入文件.txt   [--out questions.js] [--append]

参数说明：
  输入文件.docx   你整理好的 Word 文档（必填）
  --out           输出文件路径，默认：questions.js（会覆盖整个文件）
  --append        追加模式：把新题目合并到已有 questions.js（不重复）
  --topic ECO     只处理指定板块（可选，用于部分更新）
  --start 10      id 编号从多少开始（默认自动检测已有最大编号+1）
  --dry-run       只预览结果，不写文件

Word 文档格式要求（详见 template.docx 示例）：
  每道题由以下固定标签行组成，题目类型由程序自动判断：

  【板块】ECO
  【难度】2                              ← 可选，默认 2
  【题干】Which of the following...
  【图片】images/eco_001.png             ← 可选，没有图片就删掉这行
  A. Option text here
  B. Option text here
  C. Option text here
  D. Option text here
  【答案】B                              ← 单选：填字母 B；多选：填 A,C；T/F题：见说明
  【解析】Explanation text here...       ← 可选
  【来源】USABO Open Exam 2023           ← 可选

  题目之间用 --- 分隔

题型自动识别规则：
  - 选项为 True/False 或 T/F → 判断题（type: 'tf'）
  - 答案含多个字母（如 A,C）→ 多选题（type: 'multiple'）
  - 其余 → 单选题（type: 'single'）

T/F 判断题答案写法（两种都支持）：
  写法1：每个选项写 True 或 False，答案写对应字母，如：
    A. True   B. False   答案：A
  写法2：每个选项后面直接写 T 或 F，答案写各项的 T/F，如：
    【答案】T,F,T,F

支持的板块缩写（大小写均可）：
  ECO  ANB  GEN  HER  RPH  GTE  BCC  APH  PLA  TAX  VIR  MIT
"""

import re
import sys
import os
import json
import argparse

# ── 板块定义 ──────────────────────────────────────────────────────────────────
VALID_TOPICS = {
    'ECO': 'Ecology',
    'ANB': 'Animal Behavior',
    'GEN': 'Gene',
    'HER': 'Heredity',
    'RPH': 'Respiration and Photosynthesis',
    'GTE': 'Genetic Technology',
    'BCC': 'Biochemistry and Cell Communication',
    'APH': 'Animal Physiology',
    'PLA': 'Plant Anatomy',
    'TAX': 'Taxonomy',
    'VIR': 'Virus',
    'MIT': 'Mitosis and Meiosis',
}

# ── 选项行匹配（普通 A/B/C/D 选项）────────────────────────────────────────────
OPTION_PATTERN = re.compile(r'^([A-Fa-f])[\.、\)]\s*(.*)')


def infer_question_type(options, answer):
    """
    自动推断题型：
    - 选项值全部是 True/False/T/F → tf（判断题）
    - 答案含多个字母 → multiple（多选）
    - 答案含 T/F 混合列表 → tf
    - 否则 → single（单选）
    """
    # 检查答案是否是 T/F 格式（如 "T,F,T,F" 或 ["T","F","T","F"]）
    if isinstance(answer, list):
        if all(a in ('T', 'F') for a in answer):
            return 'tf'
        if len(answer) > 1 and all(a in 'ABCDEF' for a in answer):
            return 'multiple'
        if len(answer) == 1:
            return 'single'

    # 检查选项文本是否是 True/False
    if options:
        opt_texts = [o['text'].strip().lower() for o in options]
        if all(t in ('true', 'false', 't', 'f', 'yes', 'no') for t in opt_texts if t):
            return 'tf'

    return 'single'


def parse_one_question(lines):
    """
    解析一组行（一道题的内容），返回题目 dict 或 None（解析失败时返回 None）
    支持从 Word 表格提取的 "标签\t值" 格式，也支持纯文本行格式。
    """
    q = {
        'topic': None,
        'difficulty': 2,
        'stem': None,
        'image': None,
        'options': [],
        'answer': [],
        'explain': '',
        'source': '',
    }

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # ── 标签字段提取辅助 ──────────────────────────────────────────────────
        def extract_val(line, tag):
            """从 【tag】value 或 [tag]value 提取 value"""
            if '】' in line:
                return line.split('】', 1)[-1].strip()
            elif ']' in line:
                return line.split(']', 1)[-1].strip()
            return ''

        if line.startswith('【板块】') or line.startswith('[板块]'):
            q['topic'] = extract_val(line, '板块').upper()

        elif line.startswith('【类型】') or line.startswith('[类型]'):
            # 兼容旧模板中有【类型】的情况，读取但不依赖（最终以自动识别为准）
            pass  # 忽略，type 由 infer_question_type 决定

        elif line.startswith('【难度】') or line.startswith('[难度]'):
            val = extract_val(line, '难度')
            try:
                q['difficulty'] = int(val)
            except ValueError:
                q['difficulty'] = 2

        elif line.startswith('【题干】') or line.startswith('[题干]'):
            val = extract_val(line, '题干')
            stem_lines = [val] if val else []
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if (next_line.startswith('【') or next_line.startswith('[')
                        or OPTION_PATTERN.match(next_line)
                        or next_line.startswith('---')):
                    break
                if next_line:
                    stem_lines.append(next_line)
                j += 1
            q['stem'] = ' '.join(stem_lines)
            i = j - 1

        elif line.startswith('【图片】') or line.startswith('[图片]'):
            val = extract_val(line, '图片')
            q['image'] = val if val else None

        elif line.startswith('【答案】') or line.startswith('[答案]'):
            val = extract_val(line, '答案')
            # 支持多种答案格式：
            #   "B"     → ['B']
            #   "A,C"   → ['A','C']
            #   "T,F,T" → ['T','F','T']  （T/F判断题）
            #   "AC"    → ['A','C']
            tf_list = re.findall(r'\b[TF]\b', val.upper())
            letter_list = re.findall(r'[A-F]', val.upper())
            # 如果全是 T/F，当作 T/F 答案
            if tf_list and all(x in ('T', 'F') for x in re.split(r'[,\s]+', val.upper().strip()) if x):
                q['answer'] = tf_list
            else:
                q['answer'] = letter_list

        elif line.startswith('【解析】') or line.startswith('[解析]'):
            val = extract_val(line, '解析')
            explain_lines = [val] if val else []
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if next_line.startswith('【') or next_line.startswith('[') or next_line.startswith('---'):
                    break
                if next_line:
                    explain_lines.append(next_line)
                j += 1
            q['explain'] = ' '.join(explain_lines)
            i = j - 1

        elif line.startswith('【来源】') or line.startswith('[来源]'):
            q['source'] = extract_val(line, '来源')

        else:
            # 尝试匹配选项行  "A. text"  "B、text"  "C) text"
            m = OPTION_PATTERN.match(line)
            if m:
                key = m.group(1).upper()
                text = m.group(2).strip()
                # 选项可能跨多行
                j = i + 1
                while j < len(lines):
                    next_line = lines[j].strip()
                    if (OPTION_PATTERN.match(next_line)
                            or next_line.startswith('【') or next_line.startswith('[')
                            or next_line.startswith('---')):
                        break
                    if next_line:
                        text += ' ' + next_line
                    j += 1
                q['options'].append({'key': key, 'text': text})
                i = j - 1

        i += 1

    # ── 自动推断题型 ──────────────────────────────────────────────────────────
    q['type'] = infer_question_type(q['options'], q['answer'])

    # ── 校验必填字段 ──────────────────────────────────────────────────────────
    errors = []
    if not q['topic']:
        errors.append('缺少【板块】')
    elif q['topic'] not in VALID_TOPICS:
        errors.append(f'未知板块 {q["topic"]}，有效值：{", ".join(VALID_TOPICS)}')
    if not q['stem']:
        errors.append('缺少【题干】')
    if not q['options']:
        errors.append('缺少选项（A. B. C. D.）')
    if not q['answer']:
        errors.append('缺少【答案】')

    if errors:
        return None, errors

    return q, []


# ── 从 docx 中提取所有行（兼容表格格式）──────────────────────────────────────
def extract_lines_from_docx(filepath):
    try:
        from docx import Document
    except ImportError:
        print("错误：缺少 python-docx 库，请先安装：pip install python-docx")
        sys.exit(1)

    doc = Document(filepath)
    lines = []

    # 按文档中元素的出现顺序（段落+表格混合）提取
    # python-docx 的 doc.element.body 包含所有子元素
    from docx.oxml.ns import qn as _qn

    for child in doc.element.body:
        tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag

        if tag == 'p':
            # 普通段落
            text = ''.join(n.text or '' for n in child.iter() if n.tag.endswith('}t'))
            lines.append(text)

        elif tag == 'tbl':
            # 表格：每行的两列提取为 "【标签】值" 格式的行
            from docx.table import Table
            tbl = Table(child, doc)
            for row in tbl.rows:
                cells = [c.text.strip() for c in row.cells]
                if len(cells) >= 2:
                    label = cells[0]
                    value = cells[1]
                    # 跳过表头行（字段/必填/说明）
                    if label in ('字段', '必填', '说明', ''):
                        continue
                    # 跳过示例节标题行（如 "示例 1 — ..."）
                    if not (label.startswith('【') or label.startswith('[') or
                            label.startswith('---') or OPTION_PATTERN.match(label)):
                        # 可能是标题行，跳过
                        if not label.startswith('A') and label not in ('---',):
                            continue

                    if label == '---':
                        lines.append('---')
                    elif OPTION_PATTERN.match(label):
                        # 选项行：还原为 "A. 文本" 格式
                        m = OPTION_PATTERN.match(label)
                        lines.append(f"{m.group(1)}. {value}")
                    else:
                        # 标签行：合并为 "【标签】值"
                        lines.append(f"{label}{value}")
                elif len(cells) == 1 and cells[0]:
                    lines.append(cells[0])

    return lines


# ── 从 txt 中提取所有行 ─────────────────────────────────────────────────────
def extract_lines_from_txt(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.readlines()


# ── 将所有行切分成题目块 ───────────────────────────────────────────────────────
def split_into_question_blocks(lines):
    """用 --- 分隔符 或 连续2+空行 作为题目边界"""
    blocks = []
    current = []
    empty_count = 0

    for line in lines:
        stripped = line.strip()

        if stripped == '---' or stripped == '———' or stripped == '——':
            if current:
                blocks.append(current)
                current = []
            empty_count = 0
            continue

        if stripped == '':
            empty_count += 1
            if empty_count >= 2 and current:
                blocks.append(current)
                current = []
                empty_count = 0
        else:
            empty_count = 0
            current.append(line)

    if current:
        blocks.append(current)

    return blocks


# ── 获取已有 questions.js 中各板块最大编号 ───────────────────────────────────
def get_existing_max_ids(js_path):
    max_ids = {k: 0 for k in VALID_TOPICS}
    if not os.path.exists(js_path):
        return max_ids
    with open(js_path, 'r', encoding='utf-8') as f:
        content = f.read()
    pattern = re.compile(r"id:\s*['\"]([A-Z]{3})_(\d+)['\"]")
    for m in pattern.finditer(content):
        topic = m.group(1)
        num = int(m.group(2))
        if topic in max_ids:
            max_ids[topic] = max(max_ids[topic], num)
    return max_ids


# ── 把题目 dict 渲染为 JS 代码块 ──────────────────────────────────────────────
def render_question_js(q, qid):
    opts = []
    for opt in q['options']:
        opts.append(f"      {{ key: '{opt['key']}', text: {json.dumps(opt['text'], ensure_ascii=False)} }}")
    opts_str = ',\n'.join(opts)

    answer_str = json.dumps(q['answer'], ensure_ascii=False)
    stem_str = json.dumps(q['stem'], ensure_ascii=False)
    explain_str = json.dumps(q['explain'], ensure_ascii=False)
    source_str = json.dumps(q['source'], ensure_ascii=False)
    image_line = f"\n    image: {json.dumps(q['image'], ensure_ascii=False)}," if q['image'] else ''

    return (
        f"  {{ id: '{qid}', topic: '{q['topic']}', type: '{q['type']}', difficulty: {q['difficulty']},\n"
        f"    stem: {stem_str},{image_line}\n"
        f"    options: [\n{opts_str},\n"
        f"    ],\n"
        f"    answer: {answer_str},\n"
        f"    explain: {explain_str},\n"
        f"    source: {source_str}\n"
        f"  }}"
    )


# ── 主函数 ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='Word 题目文件 → questions.js 转换工具')
    parser.add_argument('input', help='输入的 .docx 或 .txt 文件路径')
    parser.add_argument('--out', default='../questions.js', help='输出的 questions.js 路径（默认 ../questions.js）')
    parser.add_argument('--append', action='store_true', help='追加模式：合并到已有 questions.js')
    parser.add_argument('--topic', help='只处理指定板块（如 ECO）')
    parser.add_argument('--start', type=int, help='id 编号起始值（默认自动检测）')
    parser.add_argument('--dry-run', action='store_true', help='只预览，不写文件')
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"错误：找不到输入文件 {args.input}")
        sys.exit(1)

    ext = os.path.splitext(args.input)[1].lower()
    print(f"📖 正在读取：{args.input}")

    if ext == '.txt':
        lines = extract_lines_from_txt(args.input)
    elif ext in ('.docx', '.doc'):
        lines = extract_lines_from_docx(args.input)
    else:
        print(f"错误：不支持的文件格式 {ext}，请使用 .docx 或 .txt 文件")
        sys.exit(1)

    print(f"   共 {len(lines)} 行")

    blocks = split_into_question_blocks(lines)
    print(f"   检测到 {len(blocks)} 个题目块")

    parsed = []
    errors_summary = []
    for idx, block in enumerate(blocks, 1):
        q, errs = parse_one_question(block)
        if q:
            if args.topic and q['topic'] != args.topic.upper():
                continue
            parsed.append(q)
        else:
            errors_summary.append((idx, errs, block[:3]))

    print(f"\n✅ 成功解析：{len(parsed)} 道题")
    if errors_summary:
        print(f"⚠️  跳过了 {len(errors_summary)} 个有问题的块：")
        for idx, errs, preview in errors_summary:
            print(f"   第 {idx} 块：{'; '.join(errs)}")
            print(f"   预览：{' | '.join(p.strip() for p in preview if p.strip())}")

    if not parsed:
        print("没有成功解析的题目，退出。")
        sys.exit(0)

    # 题型统计
    type_counts = {}
    for q in parsed:
        type_counts[q['type']] = type_counts.get(q['type'], 0) + 1
    print(f"\n🔍 题型分布：")
    type_names = {'single': '单选题', 'multiple': '多选题', 'tf': 'T/F判断题'}
    for t, c in sorted(type_counts.items()):
        print(f"   {type_names.get(t, t)}: {c} 题")

    out_path = args.out
    existing_max = get_existing_max_ids(out_path)
    counters = {k: (args.start - 1 if args.start else existing_max[k]) for k in VALID_TOPICS}

    topic_counts = {}
    rendered = []
    for q in parsed:
        topic = q['topic']
        counters[topic] += 1
        qid = f"{topic}_{counters[topic]:03d}"
        rendered.append((qid, render_question_js(q, qid)))
        topic_counts[topic] = topic_counts.get(topic, 0) + 1

    print(f"\n📊 各板块题目数量：")
    for topic, count in sorted(topic_counts.items()):
        print(f"   {topic} ({VALID_TOPICS.get(topic, '?')}): {count} 题")

    print(f"\n👀 预览前 3 题 ID：", ', '.join(qid for qid, _ in rendered[:3]))

    if args.dry_run:
        print("\n（--dry-run 模式，不写文件）")
        for qid, js in rendered[:2]:
            print(f"\n── {qid} ──")
            print(js)
        return

    # 写入文件
    if args.append and os.path.exists(out_path):
        with open(out_path, 'r', encoding='utf-8') as f:
            content = f.read()
        insert_marker = content.rfind('];')
        if insert_marker == -1:
            print("错误：找不到 questions.js 中的 ]; 结尾，无法追加。")
            sys.exit(1)
        new_entries = ',\n'.join(js for _, js in rendered)
        before = content[:insert_marker].rstrip()
        if not before.endswith(','):
            before += ','
        new_content = before + '\n  // ── 新增题目 ──\n' + new_entries + '\n' + content[insert_marker:]
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"\n✅ 已追加 {len(rendered)} 道题 → {out_path}")
    else:
        header = ""
        if os.path.exists(out_path):
            with open(out_path, 'r', encoding='utf-8') as f:
                content = f.read()
            match = re.search(r'^const QUESTIONS\s*=\s*\[', content, re.MULTILINE)
            if match:
                header = content[:match.start()]
            end_match = re.search(r'\];\s*$', content)
            footer = ''
            if end_match:
                after = content[end_match.end():].strip()
                footer = '\n' + after if after else ''
        else:
            header = _default_header()
            footer = ''

        new_entries = ',\n'.join(js for _, js in rendered)
        new_content = header + 'const QUESTIONS = [\n' + new_entries + '\n];\n' + footer
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"\n✅ 已写入 {len(rendered)} 道题 → {out_path}")

    print(f"\n🎉 完成！刷新 index.html 即可看到新题目。")


def _default_header():
    return '''/* ════════════════════════════════════════════════════════
   USABO 题库数据 — 独立文件，方便增加题目
   修改后刷新网页即可生效，无需重新部署其他文件
   ════════════════════════════════════════════════════════ */

// ── 板块定义 ──────────────────────────────────────────
const TOPICS = [
  { key: 'ECO',  en: 'Ecology',                             zh: '生态学' },
  { key: 'ANB',  en: 'Animal Behavior',                     zh: '动物行为' },
  { key: 'GEN',  en: 'Gene',                                zh: '基因（分子层面）' },
  { key: 'HER',  en: 'Heredity',                            zh: '遗传学' },
  { key: 'RPH',  en: 'Respiration and Photosynthesis',      zh: '呼吸与光合作用' },
  { key: 'GTE',  en: 'Genetic Technology',                  zh: '基因技术' },
  { key: 'BCC',  en: 'Biochemistry and Cell Communication', zh: '生物化学与细胞通讯' },
  { key: 'APH',  en: 'Animal Physiology',                   zh: '动物生理学' },
  { key: 'PLA',  en: 'Plant Anatomy',                       zh: '植物解剖学' },
  { key: 'TAX',  en: 'Taxonomy',                            zh: '分类学' },
  { key: 'VIR',  en: 'Virus',                               zh: '病毒' },
  { key: 'MIT',  en: 'Mitosis and Meiosis',                 zh: '有丝分裂与减数分裂' },
];

'''


if __name__ == '__main__':
    main()
