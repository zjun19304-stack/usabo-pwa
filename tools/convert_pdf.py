#!/usr/bin/env python3
"""
USABO PDF 题目批量提取工具
=============================
功能：
  1. 从 PDF 中提取所有文字
  2. 提取 PDF 中的所有图片，保存到 images/ 目录
  3. 自动尝试解析题目格式，输出为 questions_generated.js

用法：
  python tools/convert_pdf.py "你的PDF文件.pdf" --topic ECO --dataset "Campbell"

输出：
  - usabo-pwa/images/img_001.png, img_002.png  ... 提取出的图片
  - usabo-pwa/questions_generated.js               自动生成的题目数据

作者注：
  PDF 格式千差万别，自动解析不可能 100% 准确。
  生成后请人工校对一遍，尤其检查：题目边界、选项归属、图片对应关系。
"""

import sys
import os
import re
import json
from pathlib import Path

# ── 项目根目录（脚本在 tools/ 里，项目根在上一级） ──
ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "images"

# ── 板块映射 ──
TOPIC_MAP = {
    "ECO": "Ecology",
    "ANB": "Animal Behavior",
    "GEN": "Gene",
    "HER": "Heredity",
    "RPH": "Respiration and Photosynthesis",
    "GTE": "Genetic Technology",
    "BCC": "Biochemistry and Cell Communication",
    "APH": "Animal Physiology",
    "PLA": "Plant Anatomy",
    "TAX": "Taxonomy",
    "VIR": "Virus",
    "MIT": "Mitosis and Meiosis",
}

# ── 编号计数器（每个板块独立） ──
COUNTERS = {k: 1 for k in TOPIC_MAP}


def extract_text(pdf_path: str) -> str:
    """用 pdfplumber 提取 PDF 全部文字"""
    print(f"📖 正在读取 PDF: {pdf_path}")
    import pdfplumber
    all_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text:
                all_text.append(f"=== PAGE {i} ===\n{text}")
            print(f"   第 {i}/{len(pdf.pages)} 页 ...")
    full_text = "\n\n".join(all_text)
    print(f"✅ 文字提取完成，共 {len(full_text):,} 字符")
    return full_text


def extract_images(pdf_path: str) -> dict:
    """用 PyMuPDF 提取 PDF 中所有图片，保存到 images/，返回 {页码: [图片路径列表]}"""
    print(f"\n🖼️  正在提取图片（保存到 {IMAGES_DIR}）...")
    import fitz  # PyMuPDF
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    page_images = {}
    img_count = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)
        page_paths = []

        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            base_image = doc.extract_image(xref)
            img_bytes = base_image["image"]
            ext = base_image["ext"]  # png, jpeg, jpg

            if ext == "jpeg":
                ext = "jpg"

            img_count += 1
            filename = f"img_{img_count:04d}.{ext}"
            filepath = IMAGES_DIR / filename
            filepath.write_bytes(img_bytes)

            page_paths.append(f"images/{filename}")
            print(f"   第 {page_num + 1} 页 → {filename}")

        if page_paths:
            page_images[page_num + 1] = page_paths

    doc.close()
    print(f"✅ 提取了 {img_count} 张图片到 {IMAGES_DIR}/")
    return page_images


def try_auto_parse(text: str, default_topic: str, default_dataset: str) -> list:
    """
    尝试自动识别题目格式。

    支持的格式（按优先级）：
    1. 数字+点 开头:  "1. Which of the following..."
    2. (A) (B) (C) (D) 选项
    3. Answer: B  或 答案：B

    返回题目对象列表
    """
    print(f"\n🔍 正在尝试自动解析题目（板块: {default_topic}）...")

    questions = []
    lines = text.split("\n")

    # ── 策略：按行扫描，寻找题目开始标志 ──
    in_question = False
    current_q = None
    in_options = False

    # 题目序号正则（匹配 "1.", "1）", "(1)", "Q1." 等）
    q_num_re = re.compile(r"^\s*\(?(\d+)\)?[\.\、\），)]\s*(.*)")
    # 选项正则（匹配 "A.", "(A)", "A)", "A）" 等）
    opt_re = re.compile(r"^\s*\(?([A-Ea-e])\)?[\.\、\）)]\s*(.*)")
    # 答案正则
    ans_re = re.compile(r"(?:Answer|答案|Correct|Key)[\s:：]*\s*([A-Ea-e,、，\s]+)", re.IGNORECASE)

    for line in lines:
        line = line.strip()
        if not line or line.startswith("==="):
            continue

        # 检测新题目开始
        q_match = q_num_re.match(line)
        if q_match:
            # 保存上一题
            if current_q and current_q.get("stem"):
                questions.append(current_q)

            q_text = q_match.group(2).strip()
            if len(q_text) > 10:  # 序号后面有实质内容
                current_q = {
                    "topic": default_topic,
                    "type": "single",
                    "stem": q_text,
                    "options": [],
                    "answer": [],
                    "explain": "",
                    "source": default_dataset,
                }
                in_question = True
                in_options = False
            continue

        if not in_question or not current_q:
            continue

        # 检测选项
        opt_match = opt_re.match(line)
        if opt_match:
            in_options = True
            key = opt_match.group(1).upper()
            text = opt_match.group(2).strip()
            current_q["options"].append({"key": key, "text": text})
            continue

        # 检测答案行
        ans_match = ans_re.search(line)
        if ans_match and in_options:
            ans_str = ans_match.group(1).strip()
            # 解析 "A, B, C" 或 "ABC"
            if "," in ans_str or "、" in ans_str:
                current_q["answer"] = [c.strip() for c in re.split(r"[,\、]", ans_str) if c.strip()]
            else:
                current_q["answer"] = list(ans_str.replace(" ", ""))
            current_q["type"] = "multiple" if len(current_q["answer"]) > 1 else "single"
            current_q["explain"] = "(解析待补充)"
            continue

        # 如果还在题目正文（还没到选项区），追加到 stem
        if not in_options and current_q["stem"]:
            current_q["stem"] += " " + line

    # 保存最后一题
    if current_q and current_q.get("stem") and current_q.get("options"):
        questions.append(current_q)

    print(f"✅ 自动识别出 {len(questions)} 道题目")
    return questions


def generate_js(questions: list, output_path: str = None) -> str:
    """将题目列表生成为 questions_generated.js 文件"""
    if output_path is None:
        output_path = str(ROOT / "questions_generated.js")

    lines = [
        "/* ════════════════════════════════════════════════════════",
        "   自动生成的题目数据（从 PDF 提取）",
        "   ⚠️ 请人工校对以下内容：",
        "      - 题目边界是否正确",
        "      - 选项字母是否对应",
        "      - 答案是否正确",
        "      - 解析是否完整",
        "   ════════════════════════════════════════════════════════ */",
        "",
        "// 复制下面所有题目对象，粘贴到 questions.js 的 QUESTIONS 数组末尾",
        "// 注意：需要手动给每道题补充 id（格式：板块缩写_编号），如 ECO_005",
        "",
        "const GENERATED_QUESTIONS = [",
    ]

    for i, q in enumerate(questions):
        topic = q.get("topic", "???")
        qtype = q.get("type", "single")
        stem = json.dumps(q.get("stem", ""), ensure_ascii=False)
        answer = json.dumps(q.get("answer", []), ensure_ascii=False)
        explain = json.dumps(q.get("explain", "(解析待补充)"), ensure_ascii=False)
        source = json.dumps(q.get("source", "PDF导入"), ensure_ascii=False)
        image = json.dumps(q.get("image", None))

        opts_str = ",\n    ".join([
            f'{{ key: {json.dumps(o["key"], ensure_ascii=False)}, text: {json.dumps(o["text"], ensure_ascii=False)} }}'
            for o in q.get("options", [])
        ])

        lines.append(f"  {{  // 题号 {i + 1}，请手动设置 id 为 {topic}_XXX")
        lines.append(f"    id: '{topic}_P{COUNTERS.get(topic, i+1):03d}',   // TODO: 手动修改为正确编号")
        lines.append(f"    topic: '{topic}',")
        lines.append(f"    type: '{qtype}',")
        lines.append(f"    stem: {stem},")
        if q.get("image"):
            lines.append(f"    image: {image},")
        lines.append(f"    options: [")
        lines.append(f"      {opts_str}")
        lines.append(f"    ],")
        lines.append(f"    answer: {answer},")
        lines.append(f"    explain: {explain},")
        lines.append(f"    source: {source},")
        lines.append(f"  }},")
        lines.append("")

    lines.append("];")

    content = "\n".join(lines)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"\n📄 已生成: {output_path}")
    print(f"   包含 {len(questions)} 道题目")
    print(f"\n👉 下一步：")
    print(f"   1. 打开 {output_path}")
    print(f"   2. 手动校对每道题（尤其答案和解析）")
    print(f"   3. 把 GENERATED_QUESTIONS 数组里的对象复制到 questions.js 的 QUESTIONS 数组末尾")
    print(f"   4. 更新每个 id 为正确的编号（如 ECO_005）")

    return content


def manual_mode(pdf_path: str, default_topic: str, default_dataset: str):
    """
    手动模式：把 PDF 文字存为 .txt，由教师手动整理后再用 markdown 转。
    这是最可靠的方案。
    """
    text = extract_text(pdf_path)
    txt_path = str(ROOT / "pdf_extracted.txt")

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"\n📝 PDF 文字已保存到: {txt_path}")
    print(f"   共 {len(text):,} 字符")
    print(f"\n👉 下一步（手动方案，推荐使用）：")
    print(f"   1. 打开 {txt_path}")
    print(f"   2. 按以下格式整理题目（每组之间空一行）：")
    print(f"")
    print(f"      Q: 题目题干文字...")
    print(f"      A: 选项A内容")
    print(f"      B: 选项B内容")
    print(f"      C: 选项C内容")
    print(f"      D: 选项D内容")
    print(f"      KEY: B")
    print(f"      EXP: 解析文字...")
    print(f"")
    print(f"   3. 保存后运行: python tools/txt_to_questions.py pdf_extracted.txt --topic {default_topic}")
    print(f"")


def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="USABO PDF 题目批量提取工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  # 自动解析（尝试自动识别题目）
  python tools/convert_pdf.py exam.pdf --topic ECO

  # 手动模式（推荐，最可靠）
  python tools/convert_pdf.py exam.pdf --manual --topic ECO

  # 指定数据集名称
  python tools/convert_pdf.py campbell_ch5.pdf --topic RPH --dataset "Campbell Ch.5"
        """
    )
    parser.add_argument("pdf_path", help="PDF 文件路径")
    parser.add_argument("--topic", default="ECO", choices=list(TOPIC_MAP.keys()),
                        help="默认板块（所有题目统一归入此板块）")
    parser.add_argument("--dataset", default="USABO PDF Import", help="题目来源标注")
    parser.add_argument("--manual", action="store_true",
                        help="手动模式：只提取文字和图片，不做自动解析（推荐）")
    parser.add_argument("--auto", action="store_true",
                        help="自动解析模式：尝试自动识别题目格式（结果需要人工校对）")

    args = parser.parse_args()

    if not os.path.exists(args.pdf_path):
        print(f"❌ 文件不存在: {args.pdf_path}")
        sys.exit(1)

    print("╔══════════════════════════════════════════╗")
    print("║   USABO PDF → 题库 转换工具              ║")
    print("╚══════════════════════════════════════════╝")
    print(f"   PDF: {args.pdf_path}")
    print(f"   板块: {args.topic} ({TOPIC_MAP[args.topic]})")
    print(f"   来源: {args.dataset}")
    print()

    # 提取图片
    try:
        page_images = extract_images(args.pdf_path)
        print(f"   📸 图片按页码分布: { {p: len(imgs) for p, imgs in page_images.items()} }")
    except Exception as e:
        print(f"   ⚠️ 图片提取失败（不影响文字提取）: {e}")
        page_images = {}

    if args.manual or not args.auto:
        # 手动模式：导出文字，让人工整理
        manual_mode(args.pdf_path, args.topic, args.dataset)

        # 也尝试自动解析，作为辅助参考
        try:
            text = extract_text(args.pdf_path)
            questions = try_auto_parse(text, args.topic, args.dataset)
            if questions:
                generate_js(questions)
        except Exception as e:
            print(f"\n⚠️ 自动解析辅助失败（可忽略）: {e}")

        print("\n✅ 所有流程完成！")
        print("   请优先使用手动方案（pdf_extracted.txt）整理题目，")
        print("   自动解析结果（questions_generated.js）仅供参考。")
    else:
        # 纯自动模式
        text = extract_text(args.pdf_path)
        questions = try_auto_parse(text, args.topic, args.dataset)
        if questions:
            generate_js(questions)
        else:
            print("\n⚠️ 未能自动识别任何题目，请改用 --manual 模式")
            manual_mode(args.pdf_path, args.topic, args.dataset)


if __name__ == "__main__":
    main()
