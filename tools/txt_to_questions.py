#!/usr/bin/env python3
"""
手工整理 txt → questions.js 转换器
==================================
当 PDF 自动解析不准确时，用这个工具配合手动整理的 txt 文件精确生成题目。

输入格式（每组题目之间用空行分隔）：
    Q: 题目题干文字...
    IMG: images/img_001.png          # ← 可选，图片路径
    A: 选项A内容
    B: 选项B内容
    C: 选项C内容
    D: 选项D内容
    KEY: B                           # 单选写一个字母，多选用逗号隔开: A,C,D
    EXP: 详细解析文字...
    SRC: 题目来源
    
用法：
    python tools/txt_to_questions.py pdf_extracted.txt --topic ECO --output questions_new.js
"""

import sys
import os
import re
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOPIC_MAP = {
    "ECO": "Ecology", "ANB": "Animal Behavior", "GEN": "Gene",
    "HER": "Heredity", "RPH": "Respiration and Photosynthesis",
    "GTE": "Genetic Technology", "BCC": "Biochemistry and Cell Communication",
    "APH": "Animal Physiology", "PLA": "Plant Anatomy",
    "TAX": "Taxonomy", "VIR": "Virus", "MIT": "Mitosis and Meiosis",
}


def parse_txt(filepath: str, default_topic: str) -> list:
    """解析手工整理的题库文本"""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 按空行分割题目组
    blocks = re.split(r"\n\s*\n", content.strip())
    questions = []

    for block in blocks:
        lines = block.strip().split("\n")
        q = {
            "topic": default_topic,
            "type": "single",
            "stem": "",
            "image": None,
            "options": [],
            "answer": [],
            "explain": "",
            "source": "Manual Import",
        }

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 题干: Q: ... 或 题目: ...
            if re.match(r"^(Q|题目|题干)[\s:：]+", line, re.IGNORECASE):
                q["stem"] = re.sub(r"^(Q|题目|题干)[\s:：]+", "", line, flags=re.IGNORECASE).strip()

            # 图片: IMG: ... 或 图片: ...
            elif re.match(r"^(IMG|图片|Image|图)[\s:：]+", line, re.IGNORECASE):
                q["image"] = re.sub(r"^(IMG|图片|Image|图)[\s:：]+", "", line, flags=re.IGNORECASE).strip()

            # 选项: A: ...  B: ... 等
            elif re.match(r"^[A-Ea-e][\s:：]+", line):
                key = line[0].upper()
                text = re.sub(r"^[A-Ea-e][\s:：]+", "", line).strip()
                q["options"].append({"key": key, "text": text})

            # 答案: KEY: ... 或 答案: ...
            elif re.match(r"^(KEY|答案|Answer|Correct)[\s:：]+", line, re.IGNORECASE):
                ans_str = re.sub(r"^(KEY|答案|Answer|Correct)[\s:：]+", "", line, flags=re.IGNORECASE).strip()
                if "," in ans_str or "、" in ans_str:
                    q["answer"] = [c.strip().upper() for c in re.split(r"[,\、]", ans_str) if c.strip()]
                else:
                    q["answer"] = list(ans_str.replace(" ", "").upper())
                q["type"] = "multiple" if len(q["answer"]) > 1 else "single"

            # 解析: EXP: ... 或 解析: ...
            elif re.match(r"^(EXP|解析|Explain|Explanation)[\s:：]+", line, re.IGNORECASE):
                q["explain"] = re.sub(r"^(EXP|解析|Explain|Explanation)[\s:：]+", "", line, flags=re.IGNORECASE).strip()

            # 来源: SRC: ... 或 来源: ...
            elif re.match(r"^(SRC|来源|Source|Dataset)[\s:：]+", line, re.IGNORECASE):
                q["source"] = re.sub(r"^(SRC|来源|Source|Dataset)[\s:：]+", "", line, flags=re.IGNORECASE).strip()

            # 多行题干：跟在 Q: 后面的非标记行自动追加到 stem
            elif q["stem"] and not any(
                re.match(p, line)
                for p in [r"^(Q|题目|IMG|图片|[A-E][\s:])", r"^(KEY|答案|EXP|解析|SRC|来源)"]
            ):
                q["stem"] += " " + line

        # 验证
        if q["stem"] and q["options"] and q["answer"]:
            questions.append(q)

    return questions


def generate_js(questions: list, output_path: str):
    """生成 JavaScript 文件"""
    lines = [
        "/* ═══════════════════════════════════════",
        "   手工整理的题目数据",
        f"   共 {len(questions)} 道题目",
        "   请复制到 questions.js 的 QUESTIONS 数组末尾",
        "   ═══════════════════════════════════════ */",
        "",
    ]

    for i, q in enumerate(questions):
        topic = q["topic"]
        stem = json.dumps(q["stem"], ensure_ascii=False)
        explain = json.dumps(q["explain"], ensure_ascii=False)
        source = json.dumps(q["source"], ensure_ascii=False)
        qtype = q["type"]
        answer = json.dumps(q["answer"], ensure_ascii=False)

        opts_str = ",\n    ".join([
            f'{{ key: {json.dumps(o["key"], ensure_ascii=False)}, text: {json.dumps(o["text"], ensure_ascii=False)} }}'
            for o in q["options"]
        ])

        lines.append(f"  {{  // 第 {i + 1} 题 — 请修改 id")
        lines.append(f"    id: '{topic}_NEW{i+1:03d}',   // TODO: 改成正确编号")
        lines.append(f"    topic: '{topic}',")
        lines.append(f"    type: '{qtype}',")
        lines.append(f"    stem: {stem},")
        if q.get("image"):
            lines.append(f"    image: {json.dumps(q['image'], ensure_ascii=False)},")
        lines.append(f"    options: [")
        lines.append(f"      {opts_str}")
        lines.append(f"    ],")
        lines.append(f"    answer: {answer},")
        lines.append(f"    explain: {explain},")
        lines.append(f"    source: {source},")
        lines.append(f"  }},")
        lines.append("")

    content = "\n".join(lines)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ 已生成: {output_path}（{len(questions)} 道题目）")
    return content


def main():
    import argparse
    parser = argparse.ArgumentParser(description="手工整理 txt → questions.js")
    parser.add_argument("txt_path", help="手工整理的 txt 文件路径")
    parser.add_argument("--topic", default="ECO", choices=list(TOPIC_MAP.keys()),
                        help="默认板块")
    parser.add_argument("--output", default=None, help="输出文件路径（默认 questions_new.js）")

    args = parser.parse_args()
    output = args.output or str(ROOT / "questions_new.js")

    if not os.path.exists(args.txt_path):
        print(f"❌ 文件不存在: {args.txt_path}")
        sys.exit(1)

    print(f"📝 解析: {args.txt_path}")
    print(f"   板块: {args.topic} ({TOPIC_MAP[args.topic]})")

    questions = parse_txt(args.txt_path, args.topic)

    if not questions:
        print("⚠️ 未识别到任何题目！")
        print("   请检查格式是否正确。示例格式：")
        print()
        print("   Q: 题目题干")
        print("   A: 选项A")
        print("   B: 选项B")
        print("   C: 选项C")
        print("   D: 选项D")
        print("   KEY: B")
        print("   EXP: 解析")
        print()
        sys.exit(1)

    generate_js(questions, output)

    print(f"\n👉 下一步：打开 {output}，复制里面的题目对象到 questions.js")


if __name__ == "__main__":
    main()
