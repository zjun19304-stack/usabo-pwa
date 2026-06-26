#!/usr/bin/env python3
# tools/classify_questions.py
# USABO 题目自动分类工具
# 用法：
#   python tools/classify_questions.py input.txt
#   python tools/classify_questions.py questions_extracted.js
#   python tools/classify_questions.py --interactive   （交互模式，逐题确认）

import sys
import os
import re
import json

# ════════════════════════════════════════════════════════
#  12 个板块的关键词表（扩展版，覆盖 USABO 高频词汇）
# ════════════════════════════════════════════════════════

TOPIC_KEYWORDS = {
    'ECO': {
        'en': 'Ecology',
        'zh': '生态学',
        'keywords': [
            'ecosystem', 'population', 'community', 'niche', 'keystone',
            'trophic', 'food chain', 'food web', 'biome', 'succession',
            'competition', 'predation', 'symbiosis', 'mutualism',
            'commensalism', 'parasitism', 'predator', 'prey', 'herbivore',
            'carnivore', 'omnivore', 'producer', 'consumer', 'decomposer',
            'biomass', 'carrying capacity', 'density', ' Dispersion', 'territory',
            'abiotic', 'biotic', 'habitat', 'biodiversity', 'species richness',
            'primary succession', 'secondary succession', 'climax community',
            'energy flow', 'nutrient cycle', 'nitrogen cycle', 'carbon cycle',
            'ecological pyramid', 'gross primary productivity', 'net primary productivity',
        ]
    },
    'ANB': {
        'en': 'Animal Behavior',
        'zh': '动物行为',
        'keywords': [
            'behavior', 'imprinting', 'conditioning', 'habituation',
            'operant', 'classical conditioning', 'stimulus', 'response',
            'innate', 'learned', 'migration', 'territorial', 'dominance',
            'altruism', 'kin selection', 'Hamilton', 'inclusive fitness',
            'fixed action pattern', 'FAP', 'sign stimulus', 'releaser',
            'foraging', 'optimal foraging', 'cost-benefit', 'agonistic',
            'courtship', 'mating', 'parental investment', 'social hierarchy',
            'pheromone', 'communication', 'circadian', 'biological clock',
            'taxis', 'kinesis', 'reflex', 'instinct', 'social behavior',
        ]
    },
    'GEN': {
        'en': 'Gene',
        'zh': '基因（分子层面）',
        'keywords': [
            'transcription', 'translation', 'RNA polymerase', 'promoter',
            'operator', 'lac operon', 'gene expression', 'mRNA', 'tRNA',
            'ribosome', 'codon', 'anticodon', 'intron', 'exon', 'splicing',
            '5 cap', 'poly-A tail', 'RNA processing', 'snRNP', 'spliceosome',
            'start codon', 'stop codon', 'elongation', 'termination',
            'sigma factor', 'TATA box', 'enhancer', 'silencer', 'transcription factor',
            'central dogma', 'DNA replication', 'helicase', 'primase', 'ligase',
            'leading strand', 'lagging strand', 'okazaki', 'chromatin', 'histone',
            'nucleosome', 'euchromatin', 'heterochromatin', 'gene regulation',
        ]
    },
    'HER': {
        'en': 'Heredity',
        'zh': '遗传学',
        'keywords': [
            'Mendel', 'Mendelian', 'monohybrid', 'dihybrid', 'Punnett',
            'dominant', 'recessive', 'homozygous', 'heterozygous',
            'genotype', 'phenotype', 'test cross', 'back cross',
            'linkage', 'recombination', 'mapping', 'centimorgan', 'cM',
            'pedigree', 'sex-linked', 'X-linked', 'Y-linked', 'criss-cross',
            'incomplete dominance', 'codominance', 'multiple allele',
            'epistasis', 'pleiotropy', 'polygenic', 'quantitative trait',
            'chi-square', 'hardy-weinberg', 'allele frequency', 'genetic drift',
            'gene flow', 'bottleneck', 'founder effect', 'non-disjunction',
            'trisomy', 'monosomy', 'karyotype', 'autosome', 'sex chromosome',
        ]
    },
    'RPH': {
        'en': 'Respiration and Photosynthesis',
        'zh': '呼吸与光合作用',
        'keywords': [
            'photosynthesis', 'respiration', 'chloroplast', 'thylakoid',
            'stroma', 'Calvin cycle', 'light reaction', 'photolysis',
            'ATP', 'NADH', 'FADH2', 'glycolysis', 'Krebs', 'citric acid',
            'electron transport', 'oxidative phosphorylation', 'chemiosmosis',
            'pigment', 'chlorophyll', 'carotenoid', 'accessory pigment',
            'photosystem I', 'photosystem II', 'P680', 'P700', 'plastoquinone',
            'cytochrome', 'ATP synthase', 'proton gradient', 'fermentation',
            'anaerobic', 'aerobic', 'substrate-level phosphorylation',
            'RuBisCO', 'G3P', 'PEP carboxylase', 'C3', 'C4', 'CAM',
            'mitochondria', 'matrix', 'cristae', 'inner membrane',
        ]
    },
    'GTE': {
        'en': 'Genetic Technology',
        'zh': '基因技术',
        'keywords': [
            'PCR', 'gel electrophoresis', 'CRISPR', 'Cas9', 'guide RNA',
            'vector', 'plasmid', 'transformation', 'transfection',
            'sequencing', 'clone', 'recombinant', 'Southern blot',
            'Northern blot', 'Western blot', 'restriction enzyme', 'endonuclease',
            'sticky end', 'blunt end', 'DNA ligase', 'genomic library',
            'cDNA', 'reverse transcriptase', 'primer', 'annealing', 'denaturation',
            'ELISA', 'monoclonal antibody', 'hybridoma', 'gene therapy',
            'transgenic', 'knockout', 'RNAi', 'siRNA', 'microarray',
            'genetic engineering', 'biotechnology', 'palindromic', 'BamHI', 'EcoRI',
        ]
    },
    'BCC': {
        'en': 'Biochemistry and Cell Communication',
        'zh': '生物化学与细胞通讯',
        'keywords': [
            'enzyme', 'substrate', 'inhibitor', 'allosteric', 'cooperativity',
            'second messenger', 'cAMP', 'G protein', 'receptor', 'kinase',
            'phosphorylation', 'metabolism', 'catabolism', 'anabolism',
            'active site', 'induced fit', 'Michaelis', 'Km', 'Vmax',
            'competitive inhibition', 'noncompetitive', 'uncompetitive',
            'feedback inhibition', 'allosteric site', 'effector',
            'ligand', 'receptor tyrosine kinase', 'RTK', 'dimerization',
            'signal transduction', 'cascade', 'AMP', 'ATP', 'ADP',
            'coenzyme', 'cofactor', 'vitamin', 'mineral', 'pH optimum',
            'denature', 'activation energy', 'transition state', 'catalysis',
        ]
    },
    'APH': {
        'en': 'Animal Physiology',
        'zh': '动物生理学',
        'keywords': [
            'heart', 'circulation', 'blood', 'aorta', 'ventricle', 'atrium',
            'respiration', 'lung', 'alveoli', 'bronchi', 'trachea', 'diaphragm',
            'nephron', 'kidney', 'glomerulus', 'Bowman', 'loop of Henle',
            'hormone', 'endocrine', 'insulin', 'glucagon', 'adrenaline',
            'nerve', 'neuron', 'action potential', 'depolarization', 'repolarization',
            'muscle', 'myofibril', 'sarcomere', 'actin', 'myosin', 'troponin',
            'digestion', 'stomach', 'intestine', 'enzyme', 'absorption',
            'immune', 'lymph', 'antibody', 'antigen', 'T cell', 'B cell',
            'homeostasis', 'negative feedback', 'positive feedback',
            'cardiovascular', 'respiratory', 'excretory', 'nervous system',
            'hemoglobin', 'myoglobin', 'Bohr effect', 'oxyhemoglobin',
        ]
    },
    'PLA': {
        'en': 'Plant Anatomy',
        'zh': '植物解剖学',
        'keywords': [
            'xylem', 'phloem', 'root', 'stem', 'leaf', 'stomata',
            'guard cell', 'meristem', 'apical', 'lateral', 'vascular',
            'epidermis', 'cortex', 'pith', 'parenchyma', 'collenchyma',
            'sclerenchyma', 'tracheid', 'vessel element', 'sieve tube',
            'companion cell', 'cambium', 'vascular bundle', 'vein',
            'taproot', 'fibrous root', 'root hair', 'zone of elongation',
            'gibberelin', 'auxin', 'cytokinin', 'abscisic acid', 'ethylene',
            'phototropism', 'gravitropism', 'thigmotropism',
            'casparian strip', 'endodermis', 'pericycle', 'cortex',
            'transpiration', 'cohesion-tension', 'root pressure', 'guttation',
        ]
    },
    'TAX': {
        'en': 'Taxonomy',
        'zh': '分类学',
        'keywords': [
            'domain', 'kingdom', 'phylum', 'class', 'order', 'family',
            'genus', 'species', 'binomial', 'classification', 'phylogeny',
            'clade', 'cladogram', 'cladistics', 'monophyletic', 'paraphyletic',
            'polyphyletic', 'outgroup', 'ingroup', 'synapomorphy', 'homoplasy',
            'analogous', 'homologous', 'vestigial', 'convergent evolution',
            'tree of life', 'molecular clock', '16S rRNA', 'conserved gene',
            'taxonomic rank', 'nomenclature', 'prokaryote', 'eukaryote',
            'protist', 'fungi', 'plantae', 'animalia', 'archaea', 'bacteria',
        ]
    },
    'VIR': {
        'en': 'Virus',
        'zh': '病毒',
        'keywords': [
            'virus', 'phage', 'lytic', 'lysogenic', 'prophage',
            'retrovirus', 'HIV', 'capsid', 'envelope', 'reverse transcriptase',
            'integrase', 'protease', 'vaccine', 'virion', 'bacteriophage',
            'latent', 'lysogeny', 'induction', 'attachment', 'entry',
            'viral replication', 'RNA virus', 'DNA virus', 'retroviridae',
            'influenza', 'coronavirus', 'SARS', 'MERS', 'Ebola',
            'viral vector', 'antiviral', 'antigenic drift', 'antigenic shift',
            'prion', 'viroid', 'lysis', 'burst size', 'multiplicity of infection',
        ]
    },
    'MIT': {
        'en': 'Mitosis and Meiosis',
        'zh': '有丝分裂与减数分裂',
        'keywords': [
            'mitosis', 'meiosis', 'chromosome', 'chromatid', 'centromere',
            'spindle', 'kinetochore', 'prophase', 'metaphase', 'anaphase',
            'telophase', 'cytokinesis', 'crossing over', 'synapsis', 'tetrad',
            'haploid', 'diploid', 'n', '2n', 'gamete', 'zygote',
            'homologous chromosome', 'sister chromatid', 'non-sister chromatid',
            'independent assortment', 'segregation', 'reduction division',
            'equational division', 'cleavage furrow', 'cell plate',
            'centriole', 'centrosome', 'MPF', 'cyclin', 'CDK',
            'checkpoint', 'G1', 'S', 'G2', 'M phase', 'interphase',
            'binary fission', 'karyokinesis',
        ]
    },
}

# ════════════════════════════════════════════════════════
#  分类引擎
# ════════════════════════════════════════════════════════

def classify_text(text, threshold=1):
    """
    对一段文字进行板块分类，返回 (topic_key, score, all_scores)
    threshold: 最少匹配几个关键词才认为有效
    """
    text_lower = text.lower()
    scores = {}

    for topic_key, topic_data in TOPIC_KEYWORDS.items():
        score = 0
        matched_kw = []
        for kw in topic_data['keywords']:
            # 使用词边界匹配，避免部分匹配
            pattern = r'\b' + re.escape(kw.lower()) + r'\b'
            if re.search(pattern, text_lower):
                score += 1
                matched_kw.append(kw)
        scores[topic_key] = (score, matched_kw)

    # 按分数排序
    sorted_topics = sorted(scores.items(), key=lambda x: x[1][0], reverse=True)
    best_key, (best_score, best_kw) = sorted_topics[0]

    if best_score >= threshold:
        return best_key, best_score, sorted_topics
    else:
        return None, best_score, sorted_topics


def classify_questions_from_js(js_file):
    """
    从 questions_extracted.js 或 questions.js 格式的文件读取题目并分类
    """
    with open(js_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 尝试解析 JS 数组格式
    # 找所有 { ... } 题目对象
    questions = []
    # 简单解析：按 id: 分割
    blocks = re.split(r',\s*\n\s*{\s*\n\s*id:', content)

    print(f"   ⚠  JS 解析功能有限，建议使用 --text 模式或手工整理格式")
    return []


def extract_questions_from_text(txt_file):
    """
    从 txt 文件提取题目，尝试自动分割题目
    支持格式：
      Q: 题干
      A: 选项A
      B: 选项B
      KEY: A
      EXP: 解析

    或 USABO 真题格式（题号. 题干）
    """
    with open(txt_file, 'r', encoding='utf-8') as f:
        content = f.read()

    questions = []

    # 方法1：按 Q: 格式解析
    q_pattern = re.compile(
        r'Q\s*[:：]\s*(.*?)(?=\n\s*A\s*[:：]|\n\s*B\s*[:：]|\Z)',
        re.DOTALL | re.IGNORECASE
    )
    # 更鲁棒的：按题号分割
    # 匹配 "1." "2." "3." 等开头的行
    num_pattern = re.compile(r'\n\s*(\d+)[\.\)]\s+', re.MULTILINE)

    parts = num_pattern.split('\n' + content)
    # parts[0] = 前面无关文字，parts[1]=题号，parts[2]=题目内容...

    if len(parts) > 3:
        print(f"   ✅ 检测到 { (len(parts)-1)//2 } 个可能的题目（按题号分割）")
        for i in range(1, len(parts), 2):
            q_num = parts[i]
            q_text = parts[i+1].strip() if i+1 < len(parts) else ''
            if q_text:
                questions.append({
                    'num': q_num,
                    'text': q_text[:500],  # 取前500字符用于分类
                    'full_text': q_text,
                })
    else:
        # 方法2：按空行分割成块，每块当作一道题
        blocks = re.split(r'\n\s*\n+', content)
        print(f"   ⚠  未检测到标准题号格式，按段落分割成 {len(blocks)} 块")
        for i, block in enumerate(blocks):
            block = block.strip()
            if len(block) > 50:  # 忽略太短的行
                questions.append({
                    'num': str(i+1),
                    'text': block[:500],
                    'full_text': block,
                })

    return questions


def run_classification(txt_file, output_file='questions_classified.js', interactive=False):
    """
    主函数：读取 txt，分类，输出 JS 格式
    """
    print(f"\n{'='*60}")
    print(f"  USABO 题目自动分类工具")
    print(f"{'='*60}")
    print(f"  输入文件: {txt_file}")
    print(f"  输出文件: {output_file}")
    print(f"  交互模式: {'是' if interactive else '否'}")
    print(f"{'='*60}\n")

    if not os.path.exists(txt_file):
        print(f"  ❌ 文件不存在: {txt_file}")
        return

    questions = extract_questions_from_text(txt_file)
    if not questions:
        print(f"  ❌ 未能提取到任何题目，请检查文件格式")
        return

    print(f"  提取到 {len(questions)} 个题目块，开始分类...\n")

    results = []
    topic_counts = {}

    for i, q in enumerate(questions):
        text = q['text']
        topic, score, all_scores = classify_text(text)

        if topic is None:
            topic = 'UNKNOWN'
            topic_en = '未分类'
        else:
            topic_en = TOPIC_KEYWORDS[topic]['en']

        topic_counts[topic] = topic_counts.get(topic, 0) + 1

        result = {
            'num': q['num'],
            'text_preview': text[:100],
            'topic': topic,
            'topic_en': topic_en,
            'score': score,
            'full_text': q['full_text'],
        }
        results.append(result)

        # 进度显示
        if (i+1) % 10 == 0 or i == 0:
            print(f"  [{i+1}/{len(questions)}] 题号{q['num']}: {topic_en} (匹配:{score})")

    # 输出分类报告
    print(f"\n{'='*60}")
    print(f"  分类报告")
    print(f"{'='*60}")
    print(f"  总题数: {len(questions)}")
    print(f"\n  各板块题目数量:")
    for topic_key in ['ECO','ANB','GEN','HER','RPH','GTE','BCC','APH','PLA','TAX','VIR','MIT','UNKNOWN']:
        count = topic_counts.get(topic_key, 0)
        if count > 0:
            if topic_key == 'UNKNOWN':
                print(f"    ⚠  {topic_key:6s}: {count:3d} 题（未识别，需人工检查）")
            else:
                en = TOPIC_KEYWORDS.get(topic_key, {}).get('en', topic_key)
                print(f"    ✅  {topic_key:6s}: {count:3d} 题  ({en})")
    print(f"{'='*60}\n")

    # 写入分类结果 JS 文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("// ═══════════════════════════════════════════════════════\n")
        f.write("//  自动分类结果 — 请人工校对后合并到 questions.js\n")
        f.write("// ═══════════════════════════════════════════════════════\n\n")
        f.write("// 分类报告：\n")
        for topic_key in ['ECO','ANB','GEN','HER','RPH','GTE','BCC','APH','PLA','TAX','VIR','MIT','UNKNOWN']:
            count = topic_counts.get(topic_key, 0)
            if count > 0:
                en = TOPIC_KEYWORDS.get(topic_key, {}).get('en', topic_key)
                f.write(f"//   {topic_key}: {count} 题\n")
        f.write("\nconst CLASSIFIED_QUESTIONS = [\n")

        for r in results:
            f.write(f"\n  // ══ 题号 {r['num']} │ 分类: {r['topic']} ({r['topic_en']}) │ 匹配分: {r['score']}\n")
            f.write(f"  // 原文预览: {r['text_preview']}...\n")
            f.write(f"  {{\n")
            f.write(f"    id: '{r['topic']}_{r['num'].zfill(3)}',\n")
            f.write(f"    topic: '{r['topic']}',  // ⚠  请确认板块是否正确\n")
            f.write(f"    type: 'single',        // ⚠  请确认单选/多选\n")
            f.write(f"    difficulty: 2,\n")
            f.write(f"    stem: '此处填写题干',  // ⚠  请从 full_text 中提取\n")
            f.write(f"    options: [\n")
            f.write(f"      {{ key: 'A', text: '选项A' }},\n")
            f.write(f"      {{ key: 'B', text: '选项B' }},\n")
            f.write(f"      {{ key: 'C', text: '选项C' }},\n")
            f.write(f"      {{ key: 'D', text: '选项D' }},\n")
            f.write(f"    ],\n")
            f.write(f"    answer: ['B'],          // ⚠  请填写正确答案\n")
            f.write(f"    explain: '此处填写解析', // ⚠  请填写解析\n")
            f.write(f"    source: 'USABO Exam',\n")
            f.write(f"  }},\n")

        f.write("\n];\n")

    print(f"  ✅ 分类结果已保存到: {output_file}")
    print(f"\n  ⚠  下一步：")
    print(f"     1. 打开 {output_file} 人工校对板块分类")
    print(f"     2. 补充题干、选项、答案、解析")
    print(f"     3. 将校对好的题目复制到 questions.js\n")


def main():
    import argparse
    parser = argparse.ArgumentParser(description='USABO 题目自动分类工具')
    parser.add_argument('input', nargs='?', help='输入文件（.txt 或 .js）')
    parser.add_argument('-o', '--output', default='questions_classified.js', help='输出文件')
    parser.add_argument('-i', '--interactive', action='store_true', help='交互模式（逐题确认分类）')
    parser.add_argument('--list-topics', action='store_true', help='列出所有板块和关键词')

    args = parser.parse_args()

    if args.list_topics:
        print("\nUSABO 12 个板块关键词列表：\n")
        for key, data in TOPIC_KEYWORDS.items():
            print(f"  {key} — {data['en']} ({data['zh']})")
            print(f"    关键词: {', '.join(data['keywords'][:8])}...")
            print()
        return

    if not args.input:
        print("\n用法：")
        print("  python tools/classify_questions.py extracted.txt")
        print("  python tools/classify_questions.py extracted.txt -o output.js")
        print("  python tools/classify_questions.py --list-topics")
        print("\n先用 convert_pdf.py 提取 PDF 文字，再用本工具分类。\n")
        return

    run_classification(args.input, args.output, args.interactive)


if __name__ == '__main__':
    main()
