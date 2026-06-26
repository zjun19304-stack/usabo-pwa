#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 USABO 题目整理模板文件 (questions_template.docx)
运行：python make_template.py
"""

from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# ── 标题 ─────────────────────────────────────────────────────────────────────
title = doc.add_heading('USABO 题目整理模板', level=1)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

doc.add_paragraph('📌 使用说明：每道题按下面的格式填写，题目之间用 --- 分隔。')
doc.add_paragraph('支持的板块：ECO / ANB / GEN / HER / RPH / GTE / BCC / APH / PLA / TAX / VIR / MIT')
doc.add_paragraph('')

# ── 示例题 1（单选，无图片）─────────────────────────────────────────────────
doc.add_heading('示例题 1 — 单选题，无图片', level=2)

lines_q1 = [
    '【板块】ECO',
    '【类型】single',
    '【难度】2',
    '【题干】Which of the following best describes the role of decomposers in an ecosystem?',
    'A. They convert solar energy into chemical energy',
    'B. They break down organic matter and return nutrients to the soil',
    'C. They occupy the highest trophic level in a food chain',
    'D. They compete with producers for available light',
    '【答案】B',
    '【解析】Decomposers (bacteria and fungi) break down dead organic matter, releasing nutrients back into the environment for producers to use. This completes the nutrient cycle.',
    '【来源】USABO Open Exam 2022',
    '---',
]
for line in lines_q1:
    p = doc.add_paragraph(line)
    if line == '---':
        run = p.runs[0] if p.runs else p.add_run()
        run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

# ── 示例题 2（多选，有图片）─────────────────────────────────────────────────
doc.add_heading('示例题 2 — 多选题，有图片', level=2)

lines_q2 = [
    '【板块】GEN',
    '【类型】multiple',
    '【难度】3',
    '【题干】Which of the following are true regarding DNA replication in eukaryotes? (Select all that apply)',
    '【图片】images/gen_replication.png',
    'A. Replication occurs in the 5\' to 3\' direction',
    'B. Okazaki fragments are formed on the leading strand',
    'C. Multiple origins of replication are used simultaneously',
    'D. DNA polymerase can initiate new strands without a primer',
    '【答案】A,C',
    '【解析】DNA is synthesized in the 5\' to 3\' direction (A is correct). Okazaki fragments form on the lagging strand, not the leading strand (B is wrong). Eukaryotes use multiple origins of replication (C is correct). DNA polymerase requires a primer to initiate synthesis (D is wrong).',
    '【来源】USABO Invitational 2023',
    '---',
]
for line in lines_q2:
    p = doc.add_paragraph(line)
    if line == '---':
        run = p.runs[0] if p.runs else p.add_run()
        run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

# ── 示例题 3（你来填的空白模板）─────────────────────────────────────────────
doc.add_heading('空白模板（复制此格式填入你的题目）', level=2)

blank = [
    '【板块】（填写板块缩写，如 ECO）',
    '【类型】single',
    '【难度】2',
    '【题干】（在此填写题目题干）',
    '（如有图片，加下面一行；无图片则删掉这行）',
    '【图片】images/图片文件名.png',
    'A. （选项A）',
    'B. （选项B）',
    'C. （选项C）',
    'D. （选项D）',
    '【答案】（填写正确答案字母，多选用逗号隔开，如 A,C）',
    '【解析】（可选，填写解析内容）',
    '【来源】（可选，填写题目来源）',
    '---',
]
for line in blank:
    p = doc.add_paragraph(line)
    if '（' in line:
        for run in p.runs:
            run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

# ── 保存 ──────────────────────────────────────────────────────────────────────
out_path = 'questions_template.docx'
doc.save(out_path)
print(f"✅ 模板已生成：{out_path}")
print("请用 Word 打开此文件，按照示例格式填入你的题目。")
print("填完后运行：python doc_to_questions.py questions_template.docx --append")
