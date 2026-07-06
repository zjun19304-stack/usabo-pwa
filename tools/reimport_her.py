#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reimport_her.py — 重新导入 HER 板块题目
1. 从 questions.js 中删除所有 HER_ 题目
2. 从更新版 docx 解析新题目（修复 AB/AC/AD 选项问题）
3. 从 HER_001 开始重新编号导入
"""

import re
import os
import sys
import json
import zipfile
from docx import Document
from docx.table import Table

DOCX_PATH = sys.argv[1] if len(sys.argv) > 1 else 'F:/PBL项目学习/小程序开发/USABO第七讲MeiosisandHereditaryLaw题目修改0705更新.docx'
QS_PATH = sys.argv[2] if len(sys.argv) > 2 else '../questions.js'

OPTION_PATTERN = re.compile(r'^([A-Fa-f])[\.、\)]\s*(.*)')
TWO_LETTER_OPT = re.compile(r'^([A-Fa-f]){2}[\.\、\)]\s*(.*)')  # AB. AC. AD. etc.

# Unicode superscript digits for converting Word superscripts
SUPERSCRIPT_MAP = str.maketrans('0123456789+-=()', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾')


def cell_text_with_superscript(cell):
    """Extract cell text, preserving superscripts as Unicode chars."""
    parts = []
    for para in cell.paragraphs:
        para_parts = []
        for run in para.runs:
            txt = run.text or ''
            if run.font.superscript:
                txt = txt.translate(SUPERSCRIPT_MAP)
            para_parts.append(txt)
        parts.append(''.join(para_parts))
    return '\n'.join(parts)


def extract_lines_from_docx(filepath):
    """Extract lines from docx, skipping two-letter option labels (AB. AC. etc.)"""
    doc = Document(filepath)
    lines = []
    
    for child in doc.element.body:
        tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
        
        if tag == 'p':
            text = ''.join(n.text or '' for n in child.iter() if n.tag.endswith('}t'))
            lines.append(text)
        
        elif tag == 'tbl':
            tbl = Table(child, doc)
            for row in tbl.rows:
                cells = [cell_text_with_superscript(c).strip() for c in row.cells]
                if len(cells) >= 2:
                    label = cells[0]
                    value = cells[1]
                    
                    if label in ('字段', '必填', '说明', ''):
                        continue
                    
                    # Skip two-letter option labels (AB. AC. AD. — table artifacts)
                    if TWO_LETTER_OPT.match(label):
                        continue
                    
                    if not (label.startswith('【') or label.startswith('[') or
                            label.startswith('---') or OPTION_PATTERN.match(label)):
                        if not label.startswith('A') and label not in ('---',):
                            continue
                    
                    if label == '---':
                        lines.append('---')
                    elif OPTION_PATTERN.match(label):
                        m = OPTION_PATTERN.match(label)
                        lines.append(f'{m.group(1)}. {value}')
                    else:
                        lines.append(f'{label}{value}')
                elif len(cells) == 1 and cells[0]:
                    lines.append(cells[0])
    
    return lines


def split_into_blocks(lines):
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


def parse_one_question(lines):
    """Parse a question block, skipping two-letter option lines."""
    q = {
        'topic': None, 'difficulty': 2, 'stem': None, 'image': None,
        'options': [], 'answer': [], 'explain': '', 'source': '',
    }
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip two-letter option lines (AB. AC. AD.)
        if TWO_LETTER_OPT.match(line):
            i += 1
            continue
        
        def extract_val(line):
            if '】' in line:
                return line.split('】', 1)[-1].strip()
            elif ']' in line:
                return line.split(']', 1)[-1].strip()
            return ''
        
        if line.startswith('【板块】') or line.startswith('[板块]'):
            q['topic'] = extract_val(line).upper()
        
        elif line.startswith('【难度】') or line.startswith('[难度]'):
            try:
                q['difficulty'] = int(extract_val(line))
            except ValueError:
                q['difficulty'] = 2
        
        elif line.startswith('【题干】') or line.startswith('[题干]'):
            val = extract_val(line)
            stem_lines = [val] if val else []
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if TWO_LETTER_OPT.match(next_line):
                    j += 1
                    continue
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
            val = extract_val(line)
            # Only set image if it's a real path (not empty, not "（无）")
            if val and val != '（无）' and val != '(无)' and val.startswith('images/'):
                q['image'] = val
            else:
                q['image'] = None
        
        elif line.startswith('【答案】') or line.startswith('[答案]'):
            val = extract_val(line)
            # Parse answer: support "B", "A,C", "AB", "T,F,T"
            tf_list = re.findall(r'\b[TF]\b', val.upper())
            letter_list = re.findall(r'[A-F]', val.upper())
            
            if tf_list and all(x in ('T', 'F') for x in re.split(r'[,\s]+', val.upper().strip()) if x):
                q['answer'] = tf_list
            else:
                # Special handling: if answer is "AB" and there's no option "AB",
                # check if it means "Answer: B" (A is table prefix)
                if val.upper().strip() == 'AB' and len(q['options']) > 0:
                    # If we have options A-E and no option labeled "AB",
                    # "AB" likely means the answer is B (A is a table label prefix)
                    option_keys = [o['key'] for o in q['options']]
                    if 'AB' not in option_keys and 'B' in option_keys:
                        # Check if explanation mentions a single answer
                        q['answer'] = ['B']
                    else:
                        q['answer'] = letter_list
                else:
                    q['answer'] = letter_list
        
        elif line.startswith('【解析】') or line.startswith('[解析]'):
            val = extract_val(line)
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
            q['source'] = extract_val(line)
        
        else:
            m = OPTION_PATTERN.match(line)
            if m and not TWO_LETTER_OPT.match(line):
                key = m.group(1).upper()
                text = m.group(2).strip()
                j = i + 1
                while j < len(lines):
                    next_line = lines[j].strip()
                    if TWO_LETTER_OPT.match(next_line):
                        j += 1
                        continue
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
    
    # Infer question type
    if isinstance(q['answer'], list):
        if all(a in ('T', 'F') for a in q['answer']):
            q['type'] = 'tf'
        elif len(q['answer']) > 1:
            q['type'] = 'multiple'
        else:
            q['type'] = 'single'
    else:
        q['type'] = 'single'
    
    # Validate
    errors = []
    if not q['topic']:
        errors.append('缺少【板块】')
    if not q['stem']:
        errors.append('缺少【题干】')
    if not q['options']:
        errors.append('缺少选项')
    if not q['answer']:
        errors.append('缺少【答案】')
    
    if errors:
        return None, errors
    return q, []


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


def remove_her_block(content):
    """Remove all HER_ questions from questions.js content."""
    # Match individual question objects with HER_ IDs
    # Pattern: { id: 'HER_XXX', ... },
    pattern = re.compile(
        r'  \{ id: \'HER_\d+\'.*?\n  \},?\n',
        re.DOTALL
    )
    # Count matches
    matches = pattern.findall(content)
    print(f"   找到 {len(matches)} 个旧 HER 题目")
    
    # Remove them
    new_content = pattern.sub('', content)
    # Clean up any double blank lines
    new_content = re.sub(r'\n{3,}', '\n\n', new_content)
    
    return new_content, len(matches)


def main():
    print(f"📖 读取文件: {DOCX_PATH}")
    lines = extract_lines_from_docx(DOCX_PATH)
    print(f"   共 {len(lines)} 行")
    
    blocks = split_into_blocks(lines)
    print(f"   检测到 {len(blocks)} 个题目块")
    
    parsed = []
    errors_summary = []
    for idx, block in enumerate(blocks, 1):
        q, errs = parse_one_question(block)
        if q:
            if q['topic'] == 'HER':
                parsed.append(q)
        else:
            errors_summary.append((idx, errs, block[:3]))
    
    print(f"\n✅ 成功解析: {len(parsed)} 道题")
    if errors_summary:
        print(f"⚠️  跳过了 {len(errors_summary)} 个块:")
        for idx, errs, preview in errors_summary:
            print(f"   第 {idx} 块: {'; '.join(errs)}")
            print(f"   预览: {' | '.join(p.strip() for p in preview if p.strip())}")
    
    if not parsed:
        print("没有成功解析的题目，退出。")
        return
    
    # Type stats
    type_counts = {}
    for q in parsed:
        type_counts[q['type']] = type_counts.get(q['type'], 0) + 1
    type_names = {'single': '单选题', 'multiple': '多选题', 'tf': 'T/F判断题'}
    print(f"\n🔍 题型分布:")
    for t, c in sorted(type_counts.items()):
        print(f"   {type_names.get(t, t)}: {c} 题")
    
    # Image stats
    image_questions = [(i+1, q) for i, q in enumerate(parsed) if q['image']]
    print(f"\n🖼️ 含图片题目: {len(image_questions)} 题")
    for idx, q in image_questions:
        print(f"   第{idx}题: {q['image']} | {q['stem'][:50]}...")
    
    # Render questions starting from HER_001
    rendered = []
    for i, q in enumerate(parsed):
        qid = f"HER_{i+1:03d}"
        rendered.append((qid, render_question_js(q, qid)))
    
    print(f"\n📊 新 HER 题目 ID: HER_001 ~ HER_{len(parsed):03d}")
    
    # Read existing questions.js
    with open(QS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove old HER block
    print(f"\n🗑️ 正在从 {QS_PATH} 删除旧 HER 题目...")
    content, removed_count = remove_her_block(content)
    print(f"   已删除 {removed_count} 个旧 HER 题目")
    
    # Find insertion point (before the closing ];)
    insert_marker = content.rfind('];')
    if insert_marker == -1:
        print("错误: 找不到 questions.js 中的 ]; 结尾")
        return
    
    # Insert new HER questions
    new_entries = ',\n'.join(js for _, js in rendered)
    before = content[:insert_marker].rstrip()
    if not before.endswith(','):
        before += ','
    
    new_content = (
        before + '\n'
        '  // ── HER 板块题目（第七讲 Meiosis and Hereditary Law）──\n'
        + new_entries + '\n'
        + content[insert_marker:]
    )
    
    with open(QS_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"\n✅ 已写入 {len(rendered)} 道新 HER 题目 → {QS_PATH}")
    
    # Verify total question count
    total = len(re.findall(r"id: '[A-Z]{3}_\d+'", new_content))
    print(f"\n📊 questions.js 总题目数: {total}")
    
    # Verify images exist
    print(f"\n🔍 验证图片文件:")
    images_dir = os.path.join(os.path.dirname(QS_PATH), 'images')
    all_image_refs = re.findall(r'image:\s*"images/([^"]+)"', new_content)
    missing_images = []
    for img_ref in set(all_image_refs):
        img_path = os.path.join(images_dir, img_ref)
        if not os.path.exists(img_path):
            missing_images.append(img_ref)
    
    if missing_images:
        print(f"   ⚠️ 缺少 {len(missing_images)} 个图片文件:")
        for img in sorted(missing_images):
            print(f"      images/{img}")
    else:
        print(f"   ✅ 所有 {len(set(all_image_refs))} 个引用的图片文件都存在")
    
    print(f"\n🎉 完成!")


if __name__ == '__main__':
    main()
