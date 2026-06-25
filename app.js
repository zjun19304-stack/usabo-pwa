/* ════════════════════════════════════════════════════════
   USABO PWA — Application Logic
   ════════════════════════════════════════════════════════ */

'use strict';

// ════════════════════════════════════════════════════════
//  1. 板块定义
// ════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════
//  2. 题库数据
// ════════════════════════════════════════════════════════

const QUESTIONS = [
  // ━━━━━━━━ Ecology ━━━━━━━━
  { id: 'ECO_001', topic: 'ECO', type: 'single', difficulty: 2,
    stem: 'Which of the following best describes the concept of a "keystone species"?',
    options: [
      { key: 'A', text: 'A species that makes up the majority of biomass in an ecosystem' },
      { key: 'B', text: 'A species that has a disproportionately large effect on its ecosystem relative to its abundance' },
      { key: 'C', text: 'A species that occupies the highest trophic level in a food web' },
      { key: 'D', text: 'A species that is found only in one specific geographic location' },
    ],
    answer: ['B'],
    explain: 'A keystone species exerts a disproportionately large effect on its community relative to its biomass or abundance. Classic examples include sea otters (controlling sea urchin populations) and wolves in Yellowstone.',
    source: 'USABO Open Exam – Ecology'
  },
  { id: 'ECO_002', topic: 'ECO', type: 'single', difficulty: 1,
    stem: 'In a food chain, the total energy available to tertiary consumers compared to producers is approximately:',
    options: [
      { key: 'A', text: '10%' }, { key: 'B', text: '1%' },
      { key: 'C', text: '0.1%' }, { key: 'D', text: '50%' },
    ],
    answer: ['C'],
    explain: 'Using the 10% rule: Energy passes from producers → primary consumers (10%) → secondary consumers (1%) → tertiary consumers (0.1%). Each trophic level retains ~10% of energy received.',
    source: 'USABO Open Exam – Ecology'
  },
  { id: 'ECO_003', topic: 'ECO', type: 'single', difficulty: 2,
    stem: 'Which type of species interaction benefits one organism while neither harming nor helping the other?',
    options: [
      { key: 'A', text: 'Mutualism' }, { key: 'B', text: 'Commensalism' },
      { key: 'C', text: 'Parasitism' }, { key: 'D', text: 'Competition' },
    ],
    answer: ['B'],
    explain: 'Commensalism (+/0): one organism benefits while the other is unaffected. Example: barnacles attaching to whale skin.',
    source: 'USABO Open Exam – Ecology'
  },
  { id: 'ECO_004', topic: 'ECO', type: 'multiple', difficulty: 3,
    stem: 'Which of the following are density-dependent limiting factors that regulate population growth? (Select ALL that apply)',
    options: [
      { key: 'A', text: 'Intraspecific competition for food' },
      { key: 'B', text: 'Hurricane damage to a forest' },
      { key: 'C', text: 'Predation pressure that increases with prey density' },
      { key: 'D', text: 'Disease transmission that scales with population density' },
    ],
    answer: ['A', 'C', 'D'],
    explain: 'Density-dependent factors intensify as population density increases: intraspecific competition (A), predation (C), and disease (D). Natural disasters like hurricanes (B) are density-independent.',
    source: 'USABO Semifinal – Ecology'
  },

  // ━━━━━━━━ Animal Behavior ━━━━━━━━
  { id: 'ANB_001', topic: 'ANB', type: 'single', difficulty: 2,
    stem: 'A young bird follows the first moving object it sees after hatching and maintains proximity to it. This phenomenon is called:',
    options: [
      { key: 'A', text: 'Classical conditioning' }, { key: 'B', text: 'Imprinting' },
      { key: 'C', text: 'Habituation' }, { key: 'D', text: 'Operant conditioning' },
    ],
    answer: ['B'],
    explain: 'Imprinting is a form of learning during a critical developmental period. Konrad Lorenz\'s work with goslings demonstrated that birds imprint on the first moving stimulus after hatching.',
    source: 'USABO Open Exam – Animal Behavior'
  },
  { id: 'ANB_002', topic: 'ANB', type: 'single', difficulty: 2,
    stem: 'The waggle dance of honeybees communicates:',
    options: [
      { key: 'A', text: 'The identity of the flower species to visit' },
      { key: 'B', text: 'The distance and direction of a food source relative to the sun' },
      { key: 'C', text: 'A warning signal to defend the hive' },
      { key: 'D', text: 'The quality of a new nesting site' },
    ],
    answer: ['B'],
    explain: 'The waggle dance encodes both distance (duration of waggle run ∝ distance) and direction (angle of run relative to vertical = angle of food source relative to sun) of a food source.',
    source: 'USABO Open Exam – Animal Behavior'
  },
  { id: 'ANB_003', topic: 'ANB', type: 'single', difficulty: 3,
    stem: "In the context of kin selection, Hamilton's rule states that altruistic behavior evolves when:",
    options: [
      { key: 'A', text: 'rb > c' }, { key: 'B', text: 'rc > b' },
      { key: 'C', text: 'r + b > c' }, { key: 'D', text: 'b > c only, regardless of relatedness' },
    ],
    answer: ['A'],
    explain: "Hamilton's rule: rB > C, where r = coefficient of relatedness, B = benefit to recipient, C = cost to actor. Altruism is favored when inclusive fitness gain exceeds the cost.",
    source: 'USABO Semifinal – Animal Behavior'
  },

  // ━━━━━━━━ Gene ━━━━━━━━
  { id: 'GEN_001', topic: 'GEN', type: 'single', difficulty: 2,
    stem: 'Which of the following best describes the role of RNA polymerase during transcription?',
    options: [
      { key: 'A', text: 'It unwinds the DNA double helix and synthesizes a complementary DNA strand' },
      { key: 'B', text: "It synthesizes an RNA strand complementary to the template DNA strand in the 5' to 3' direction" },
      { key: 'C', text: 'It translates mRNA codons into amino acid sequences' },
      { key: 'D', text: "It adds a poly-A tail to the 5' end of mRNA" },
    ],
    answer: ['B'],
    explain: "RNA polymerase reads the template DNA strand (3'→5') and synthesizes a complementary RNA strand (5'→3'). It does not require a primer, unlike DNA polymerase.",
    source: 'USABO Open Exam – Gene'
  },
  { id: 'GEN_002', topic: 'GEN', type: 'single', difficulty: 2,
    stem: 'The lac operon in E. coli is an example of:',
    options: [
      { key: 'A', text: 'A constitutively expressed gene system' },
      { key: 'B', text: 'Negative regulation by a repressor that is inactivated by allolactose' },
      { key: 'C', text: 'Positive regulation only, independent of substrate presence' },
      { key: 'D', text: 'Epigenetic silencing through DNA methylation' },
    ],
    answer: ['B'],
    explain: 'The lac operon is controlled by a repressor protein. When allolactose is present, it binds the repressor, causing it to dissociate from the operator, allowing transcription. This is negative inducible regulation.',
    source: 'USABO Open Exam – Gene'
  },
  { id: 'GEN_003', topic: 'GEN', type: 'single', difficulty: 3,
    stem: "In eukaryotes, which modification occurs at the 5' end of pre-mRNA during RNA processing?",
    options: [
      { key: 'A', text: 'Addition of a poly-A tail' },
      { key: 'B', text: 'Addition of a 7-methylguanosine cap' },
      { key: 'C', text: 'Removal of introns' },
      { key: 'D', text: 'Addition of a signal recognition sequence' },
    ],
    answer: ['B'],
    explain: "The 5' cap (7-methylguanosine cap, m7G) is added co-transcriptionally. It protects mRNA from degradation, facilitates nuclear export, and is recognized by ribosomes during translation initiation.",
    source: 'USABO Semifinal – Gene'
  },

  // ━━━━━━━━ Heredity ━━━━━━━━
  { id: 'HER_001', topic: 'HER', type: 'single', difficulty: 1,
    stem: 'In a monohybrid cross between two heterozygous individuals (Aa × Aa), what is the probability of producing a homozygous recessive offspring?',
    options: [
      { key: 'A', text: '1/4' }, { key: 'B', text: '1/2' },
      { key: 'C', text: '3/4' }, { key: 'D', text: '1/16' },
    ],
    answer: ['A'],
    explain: 'From Aa × Aa: genotype ratio = 1 AA : 2 Aa : 1 aa. The probability of aa (homozygous recessive) = 1/4 = 25%.',
    source: 'USABO Open Exam – Heredity'
  },
  { id: 'HER_002', topic: 'HER', type: 'single', difficulty: 2,
    stem: 'A woman who is a carrier for color blindness (X^B X^b) has children with a color-blind man (X^b Y). What fraction of their daughters will be color blind?',
    options: [
      { key: 'A', text: '0' }, { key: 'B', text: '1/4' },
      { key: 'C', text: '1/2' }, { key: 'D', text: 'All daughters' },
    ],
    answer: ['C'],
    explain: 'Cross: X^B X^b × X^b Y → daughters: X^B X^b (carrier, normal) and X^b X^b (color blind) in equal proportions → 1/2 of daughters are color blind.',
    source: 'USABO Open Exam – Heredity'
  },
  { id: 'HER_003', topic: 'HER', type: 'single', difficulty: 3,
    stem: 'Two genes show a recombination frequency of 32 map units. This means:',
    options: [
      { key: 'A', text: 'The genes are on different chromosomes' },
      { key: 'B', text: 'The genes are linked and 32% of offspring result from crossing over between them' },
      { key: 'C', text: 'The genes cannot be mapped because 32% exceeds 50%' },
      { key: 'D', text: 'They exhibit complete linkage' },
    ],
    answer: ['B'],
    explain: '1 map unit (centimorgan) = 1% recombination frequency. 32 cM means the genes are linked and 32% of gametes are recombinant. Values ≤ 50 cM indicate linkage.',
    source: 'USABO Semifinal – Heredity'
  },

  // ━━━━━━━━ Respiration and Photosynthesis ━━━━━━━━
  { id: 'RPH_001', topic: 'RPH', type: 'single', difficulty: 1,
    stem: 'In the light-dependent reactions of photosynthesis, water molecules are split to release:',
    options: [
      { key: 'A', text: 'CO₂, ATP, and electrons' },
      { key: 'B', text: 'O₂, protons (H⁺), and electrons' },
      { key: 'C', text: 'Glucose, NADPH, and O₂' },
      { key: 'D', text: 'ADP, Pi, and NADP⁺' },
    ],
    answer: ['B'],
    explain: 'Photolysis of water (2H₂O → O₂ + 4H⁺ + 4e⁻) occurs at Photosystem II. The electrons replace those lost by P680, protons contribute to the proton gradient for ATP synthesis, and O₂ is released as a byproduct.',
    source: 'USABO Open Exam – Respiration and Photosynthesis'
  },
  { id: 'RPH_002', topic: 'RPH', type: 'single', difficulty: 2,
    stem: 'During aerobic respiration, the net yield of ATP from one molecule of glucose via substrate-level phosphorylation in glycolysis is:',
    options: [
      { key: 'A', text: '2 ATP' }, { key: 'B', text: '4 ATP' },
      { key: 'C', text: '32 ATP' }, { key: 'D', text: '38 ATP' },
    ],
    answer: ['A'],
    explain: 'Glycolysis produces 4 ATP (substrate-level) but consumes 2 ATP for activation, giving a net gain of 2 ATP per glucose. The 2 NADH produced are also important for subsequent steps.',
    source: 'USABO Open Exam – Respiration and Photosynthesis'
  },
  { id: 'RPH_003', topic: 'RPH', type: 'single', difficulty: 3,
    stem: 'In the Calvin cycle, the enzyme responsible for fixing CO₂ is:',
    options: [
      { key: 'A', text: 'PEP carboxylase' }, { key: 'B', text: 'RuBisCO' },
      { key: 'C', text: 'Phosphofructokinase' }, { key: 'D', text: 'Pyruvate kinase' },
    ],
    answer: ['B'],
    explain: 'RuBisCO (ribulose-1,5-bisphosphate carboxylase/oxygenase) catalyzes the fixation of CO₂ onto RuBP (5C) to form two molecules of 3-phosphoglycerate (3C each). It is the most abundant enzyme on Earth.',
    source: 'USABO Open Exam – Respiration and Photosynthesis'
  },

  // ━━━━━━━━ Genetic Technology ━━━━━━━━
  { id: 'GTE_001', topic: 'GTE', type: 'single', difficulty: 2,
    stem: 'In the CRISPR-Cas9 system, which component directly recognizes and binds to the target DNA sequence?',
    options: [
      { key: 'A', text: 'Cas9 protein alone' },
      { key: 'B', text: 'The guide RNA (gRNA) via complementary base pairing' },
      { key: 'C', text: 'A restriction endonuclease' },
      { key: 'D', text: 'Telomerase' },
    ],
    answer: ['B'],
    explain: 'The guide RNA (gRNA) contains a ~20-nt spacer sequence complementary to the target DNA. The gRNA-Cas9 complex scans DNA for a PAM sequence, and base pairing directs Cas9 to cut.',
    source: 'USABO Semifinal – Genetic Technology'
  },
  { id: 'GTE_002', topic: 'GTE', type: 'single', difficulty: 2,
    stem: 'Southern blotting is used to detect:',
    options: [
      { key: 'A', text: 'Specific RNA sequences' },
      { key: 'B', text: 'Specific proteins using antibodies' },
      { key: 'C', text: 'Specific DNA sequences using a labeled probe' },
      { key: 'D', text: 'Chromosome karyotypes' },
    ],
    answer: ['C'],
    explain: 'Southern blotting: DNA is restriction-digested, separated by gel electrophoresis, transferred to a membrane, and hybridized with a labeled complementary DNA probe. (Northern = RNA, Western = protein)',
    source: 'USABO Open Exam – Genetic Technology'
  },
  { id: 'GTE_003', topic: 'GTE', type: 'single', difficulty: 3,
    stem: 'In PCR, what is the purpose of the denaturation step?',
    options: [
      { key: 'A', text: 'To allow primers to anneal to the template strands' },
      { key: 'B', text: 'To separate the double-stranded DNA into two single strands' },
      { key: 'C', text: 'To extend new DNA strands using Taq polymerase' },
      { key: 'D', text: 'To add dNTPs to the reaction mixture' },
    ],
    answer: ['B'],
    explain: 'The denaturation step (~95°C) breaks hydrogen bonds between complementary base pairs, separating dsDNA into two ssDNA templates. This allows primers to subsequently bind during the annealing step.',
    source: 'USABO Open Exam – Genetic Technology'
  },

  // ━━━━━━━━ Biochemistry and Cell Communication ━━━━━━━━
  { id: 'BCC_001', topic: 'BCC', type: 'single', difficulty: 2,
    stem: "Which of the following best describes a competitive inhibitor's effect on enzyme kinetics?",
    options: [
      { key: 'A', text: 'Increases Km, Vmax unchanged' },
      { key: 'B', text: 'Decreases Km, Vmax unchanged' },
      { key: 'C', text: 'Km unchanged, Vmax decreased' },
      { key: 'D', text: 'Both Km and Vmax are decreased' },
    ],
    answer: ['A'],
    explain: 'Competitive inhibitors compete with the substrate for the active site. The apparent Km increases (lower apparent affinity) because the inhibitor must be outcompeted, but Vmax remains the same.',
    source: 'USABO Open Exam – Biochemistry'
  },
  { id: 'BCC_002', topic: 'BCC', type: 'single', difficulty: 2,
    stem: 'Which second messenger is produced when adenylyl cyclase is activated by a G protein?',
    options: [
      { key: 'A', text: 'cGMP' }, { key: 'B', text: 'cAMP' },
      { key: 'C', text: 'IP₃' }, { key: 'D', text: 'DAG' },
    ],
    answer: ['B'],
    explain: 'Adenylyl cyclase catalyzes the conversion of ATP to cyclic AMP (cAMP). cAMP activates Protein Kinase A (PKA), which phosphorylates downstream target proteins.',
    source: 'USABO Open Exam – Cell Communication'
  },
  { id: 'BCC_003', topic: 'BCC', type: 'single', difficulty: 3,
    stem: 'Receptor tyrosine kinases (RTKs) are activated by:',
    options: [
      { key: 'A', text: 'Binding of a ligand causing receptor dimerization and autophosphorylation' },
      { key: 'B', text: 'G protein coupling and second messenger release' },
      { key: 'C', text: 'Direct ion channel opening upon ligand binding' },
      { key: 'D', text: 'Nuclear translocation and DNA binding' },
    ],
    answer: ['A'],
    explain: 'RTKs (e.g., insulin receptor, EGF receptor) dimerize upon ligand binding. Each receptor in the dimer phosphorylates the other (autophosphorylation) on tyrosine residues, creating docking sites for signaling proteins.',
    source: 'USABO Semifinal – Cell Communication'
  },

  // ━━━━━━━━ Animal Physiology ━━━━━━━━
  { id: 'APH_001', topic: 'APH', type: 'single', difficulty: 1,
    stem: 'Which chamber of the human heart pumps oxygenated blood to the systemic circulation?',
    options: [
      { key: 'A', text: 'Right atrium' }, { key: 'B', text: 'Right ventricle' },
      { key: 'C', text: 'Left atrium' }, { key: 'D', text: 'Left ventricle' },
    ],
    answer: ['D'],
    explain: 'The left ventricle pumps oxygenated blood (received from the left atrium via pulmonary veins) through the aortic valve into the aorta for systemic circulation.',
    source: 'USABO Open Exam – Animal Physiology'
  },
  { id: 'APH_002', topic: 'APH', type: 'single', difficulty: 2,
    stem: 'The countercurrent exchange system in fish gills maximizes oxygen uptake because:',
    options: [
      { key: 'A', text: 'Blood and water flow in the same direction' },
      { key: 'B', text: 'Blood and water flow in opposite directions, maintaining a constant diffusion gradient' },
      { key: 'C', text: 'The gills produce hemoglobin on their surface' },
      { key: 'D', text: 'Water temperature is higher than blood temperature' },
    ],
    answer: ['B'],
    explain: 'In countercurrent exchange, blood flows opposite to water flow. This ensures a diffusion gradient throughout the gill, allowing up to 80-90% O₂ extraction (vs ~50% with parallel flow).',
    source: 'USABO Open Exam – Animal Physiology'
  },
  { id: 'APH_003', topic: 'APH', type: 'single', difficulty: 3,
    stem: 'The Bohr effect describes which change in hemoglobin oxygen affinity?',
    options: [
      { key: 'A', text: 'Increased O₂ affinity at high CO₂ / low pH' },
      { key: 'B', text: 'Decreased O₂ affinity at high CO₂ / low pH' },
      { key: 'C', text: 'Increased O₂ affinity at high temperature' },
      { key: 'D', text: 'Constant O₂ affinity regardless of pH' },
    ],
    answer: ['B'],
    explain: 'The Bohr effect: high CO₂ and/or low pH (as in metabolically active tissues) causes conformational changes in hemoglobin that reduce its oxygen affinity, promoting O₂ release where needed.',
    source: 'USABO Semifinal – Animal Physiology'
  },

  // ━━━━━━━━ Plant Anatomy ━━━━━━━━
  { id: 'PLA_001', topic: 'PLA', type: 'single', difficulty: 1,
    stem: 'Which tissue in plants is primarily responsible for transporting water and dissolved minerals from roots to leaves?',
    options: [
      { key: 'A', text: 'Phloem' }, { key: 'B', text: 'Xylem' },
      { key: 'C', text: 'Parenchyma' }, { key: 'D', text: 'Collenchyma' },
    ],
    answer: ['B'],
    explain: 'Xylem conducts water and dissolved minerals upward from roots, driven primarily by transpiration pull (cohesion-tension theory). Phloem transports photosynthetic products bidirectionally.',
    source: 'USABO Open Exam – Plant Anatomy'
  },
  { id: 'PLA_002', topic: 'PLA', type: 'single', difficulty: 2,
    stem: 'The Casparian strip in the root endodermis functions to:',
    options: [
      { key: 'A', text: 'Absorb water directly from the soil' },
      { key: 'B', text: 'Force water to pass through the cytoplasm (symplast) into the vascular cylinder' },
      { key: 'C', text: 'Conduct sugars from leaves to roots' },
      { key: 'D', text: 'Provide mechanical support to the root' },
    ],
    answer: ['B'],
    explain: 'The Casparian strip (suberin-impregnated band) blocks apoplastic water flow through endodermal cell walls. Water must enter endodermal cells (symplast pathway), where transport proteins selectively regulate mineral uptake.',
    source: 'USABO Open Exam – Plant Anatomy'
  },

  // ━━━━━━━━ Taxonomy ━━━━━━━━
  { id: 'TAX_001', topic: 'TAX', type: 'single', difficulty: 1,
    stem: 'In binomial nomenclature, the scientific name Homo sapiens refers to which two taxonomic levels?',
    options: [
      { key: 'A', text: 'Kingdom and Phylum' }, { key: 'B', text: 'Order and Family' },
      { key: 'C', text: 'Genus and species' }, { key: 'D', text: 'Class and Order' },
    ],
    answer: ['C'],
    explain: 'Binomial nomenclature (Linnaean system): the first word is the genus (capitalized), the second is the specific epithet (lowercase). Both are italicized. "Homo sapiens" = genus Homo, species sapiens.',
    source: 'USABO Open Exam – Taxonomy'
  },
  { id: 'TAX_002', topic: 'TAX', type: 'single', difficulty: 2,
    stem: 'Which of the following is the correct taxonomic hierarchy from broadest to most specific?',
    options: [
      { key: 'A', text: 'Domain → Kingdom → Phylum → Class → Order → Family → Genus → Species' },
      { key: 'B', text: 'Kingdom → Domain → Phylum → Class → Order → Family → Genus → Species' },
      { key: 'C', text: 'Domain → Phylum → Kingdom → Class → Order → Family → Genus → Species' },
      { key: 'D', text: 'Domain → Kingdom → Class → Phylum → Order → Family → Genus → Species' },
    ],
    answer: ['A'],
    explain: 'The modern 8-rank hierarchy: Domain > Kingdom > Phylum > Class > Order > Family > Genus > species. Mnemonic: "Dear King Philip Came Over For Good Soup".',
    source: 'USABO Open Exam – Taxonomy'
  },

  // ━━━━━━━━ Virus ━━━━━━━━
  { id: 'VIR_001', topic: 'VIR', type: 'single', difficulty: 2,
    stem: 'What is the key difference between the lytic and lysogenic cycles of a bacteriophage?',
    options: [
      { key: 'A', text: 'In the lytic cycle, viral DNA integrates into the host genome; in lysogenic, the cell is immediately lysed' },
      { key: 'B', text: 'In the lytic cycle, the host cell is immediately lysed to release new phages; in lysogenic, viral DNA integrates and replicates with the host' },
      { key: 'C', text: 'The lytic cycle occurs only in eukaryotes; the lysogenic cycle occurs only in prokaryotes' },
      { key: 'D', text: 'There is no significant difference between the two cycles' },
    ],
    answer: ['B'],
    explain: 'Lytic cycle: phage injects DNA → replicates → produces new phages → lyses host. Lysogenic cycle: viral DNA (prophage) integrates into host chromosome → replicates with host before potentially entering the lytic cycle.',
    source: 'USABO Open Exam – Virus'
  },
  { id: 'VIR_002', topic: 'VIR', type: 'single', difficulty: 3,
    stem: 'HIV is a retrovirus. After infecting a host cell, which enzyme converts its RNA genome into DNA?',
    options: [
      { key: 'A', text: 'DNA polymerase' }, { key: 'B', text: 'RNA polymerase' },
      { key: 'C', text: 'Reverse transcriptase' }, { key: 'D', text: 'Integrase alone' },
    ],
    answer: ['C'],
    explain: 'Retroviruses use reverse transcriptase (RNA-dependent DNA polymerase) to transcribe their RNA genome into double-stranded DNA. This DNA is then inserted into the host genome by the viral integrase.',
    source: 'USABO Semifinal – Virus'
  },

  // ━━━━━━━━ Mitosis and Meiosis ━━━━━━━━
  { id: 'MIT_001', topic: 'MIT', type: 'single', difficulty: 1,
    stem: 'During which phase of mitosis do sister chromatids separate and move toward opposite poles?',
    options: [
      { key: 'A', text: 'Prophase' }, { key: 'B', text: 'Metaphase' },
      { key: 'C', text: 'Anaphase' }, { key: 'D', text: 'Telophase' },
    ],
    answer: ['C'],
    explain: 'Anaphase: cohesins holding sister chromatids are cleaved by separase. Sister chromatids separate and are pulled to opposite poles by shortening kinetochore microtubules.',
    source: 'USABO Open Exam – Mitosis and Meiosis'
  },
  { id: 'MIT_002', topic: 'MIT', type: 'single', difficulty: 2,
    stem: 'Crossing over (homologous recombination) during meiosis occurs during:',
    options: [
      { key: 'A', text: 'Metaphase I' }, { key: 'B', text: 'Prophase I' },
      { key: 'C', text: 'Anaphase II' }, { key: 'D', text: 'Telophase I' },
    ],
    answer: ['B'],
    explain: 'Crossing over occurs during Prophase I of meiosis, at the tetrad (bivalent) stage when homologous chromosomes are paired in synapsis. Recombination at chiasmata generates genetic diversity.',
    source: 'USABO Open Exam – Mitosis and Meiosis'
  },
  { id: 'MIT_003', topic: 'MIT', type: 'single', difficulty: 2,
    stem: 'A human somatic cell has 46 chromosomes. How many chromosomes are found in a secondary oocyte?',
    options: [
      { key: 'A', text: '46' }, { key: 'B', text: '23' },
      { key: 'C', text: '92' }, { key: 'D', text: '12' },
    ],
    answer: ['B'],
    explain: 'After Meiosis I, each cell (secondary oocyte and first polar body) has 23 chromosomes (each still consisting of 2 sister chromatids). Meiosis II separates sister chromatids, giving haploid cells with 23 single chromatids.',
    source: 'USABO Open Exam – Mitosis and Meiosis'
  },
  { id: 'MIT_004', topic: 'MIT', type: 'multiple', difficulty: 3,
    stem: 'Which of the following events occur ONLY in meiosis and NOT in mitosis? (Select ALL that apply)',
    options: [
      { key: 'A', text: 'Synapsis of homologous chromosomes' },
      { key: 'B', text: 'Crossing over between homologs' },
      { key: 'C', text: 'Separation of sister chromatids' },
      { key: 'D', text: 'Independent assortment of homologous chromosome pairs' },
    ],
    answer: ['A', 'B', 'D'],
    explain: 'Synapsis (A) and crossing over (B) are unique to Prophase I of meiosis. Independent assortment (D) occurs at Metaphase I. Sister chromatid separation (C) occurs in Anaphase of mitosis AND Anaphase II of meiosis.',
    source: 'USABO Semifinal – Mitosis and Meiosis'
  },
];

// ════════════════════════════════════════════════════════
//  3. 工具函数
// ════════════════════════════════════════════════════════

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getTopicInfo(key) {
  return TOPICS.find(t => t.key === key) || { en: key, zh: key };
}

function getQuestionsByTopics(topicKeys) {
  return QUESTIONS.filter(q => topicKeys.includes(q.topic));
}

// ════════════════════════════════════════════════════════
//  4. 存储层 (localStorage)
// ════════════════════════════════════════════════════════

const Storage = {
  KEYS: {
    wrong: 'usabo_wrong_answers',
    history: 'usabo_practice_history',
    session: 'usabo_current_session',
    settings: 'usabo_settings',
  },

  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },

  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },

  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },

  // ── 错题本 ──
  getWrong() { return this.get(this.KEYS.wrong, []); },
  saveWrong(arr) { this.set(this.KEYS.wrong, arr); },
  addWrong(question, selected) {
    const wrong = this.getWrong();
    if (!wrong.find(w => w.id === question.id)) {
      wrong.push({
        id: question.id,
        topic: question.topic,
        type: question.type,
        stem: question.stem,
        options: question.options,
        answer: question.answer,
        explain: question.explain,
        source: question.source,
        yourAnswer: selected,
        addedAt: Date.now(),
      });
      this.saveWrong(wrong);
    }
  },
  removeWrong(id) {
    const wrong = this.getWrong().filter(w => w.id !== id);
    this.saveWrong(wrong);
  },

  // ── 历史记录 ──
  getHistory() { return this.get(this.KEYS.history, []); },
  addHistory(record) {
    const h = this.getHistory();
    h.unshift(record);
    if (h.length > 100) h.length = 100;
    this.set(this.KEYS.history, h);
  },

  // ── 会话进度 ──
  getSession() { return this.get(this.KEYS.session, null); },
  saveSession(s) { this.set(this.KEYS.session, s); },
  clearSession() { this.remove(this.KEYS.session); },
};

// ════════════════════════════════════════════════════════
//  5. 应用状态
// ════════════════════════════════════════════════════════

const State = {
  selectedTopics: [],
  questionCount: 20,
  useTimer: false,

  // 练习中
  practiceQuestions: [],
  currentIndex: 0,
  selectedOptions: [],
  confirmed: false,
  answers: [],          // [{ questionId, selected, correct }]
  timerInterval: null,
  timeLeft: 60,
  startTime: 0,

  // 错题重练
  isWrongRetry: false,
  wrongFilter: 'all',
};

// ════════════════════════════════════════════════════════
//  6. 路由
// ════════════════════════════════════════════════════════

const Router = {
  routes: {
    '': 'view-home',
    '#/': 'view-home',
    '#/practice': 'view-practice',
    '#/result': 'view-result',
    '#/wrong': 'view-wrong',
  },

  navigate(hash) {
    if (location.hash !== hash) {
      location.hash = hash;
    } else {
      this.render(hash);
    }
  },

  render(hash) {
    hash = hash || location.hash || '';
    const viewId = this.routes[hash] || 'view-home';

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');

    window.scrollTo(0, 0);

    // 页面特定初始化
    if (viewId === 'view-home') HomeView.render();
    else if (viewId === 'view-practice') PracticeView.render();
    else if (viewId === 'view-result') ResultView.render();
    else if (viewId === 'view-wrong') WrongView.render();
  },

  init() {
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }
};

// ════════════════════════════════════════════════════════
//  7. 首页视图
// ════════════════════════════════════════════════════════

const HomeView = {
  render() {
    this.renderTopics();
    this.renderStats();
    this.bindEvents();
  },

  renderTopics() {
    const grid = document.getElementById('topic-grid');
    grid.innerHTML = '';

    TOPICS.forEach(topic => {
      const count = QUESTIONS.filter(q => q.topic === topic.key).length;
      const isSelected = State.selectedTopics.includes(topic.key);

      const card = document.createElement('div');
      card.className = 'topic-card' + (isSelected ? ' selected' : '');
      card.dataset.topic = topic.key;
      card.innerHTML = `
        <div class="topic-en">${topic.en}</div>
        <div class="topic-zh">${topic.zh}</div>
        <div class="topic-count">${count} 题</div>
      `;
      card.addEventListener('click', () => this.toggleTopic(topic.key));
      grid.appendChild(card);
    });
  },

  toggleTopic(key) {
    const idx = State.selectedTopics.indexOf(key);
    if (idx > -1) {
      State.selectedTopics.splice(idx, 1);
    } else {
      State.selectedTopics.push(key);
    }
    this.renderTopics();
  },

  renderStats() {
    const history = Storage.getHistory();
    const wrong = Storage.getWrong();

    const totalPracticed = history.reduce((s, h) => s + h.total, 0);
    const totalCorrect = history.reduce((s, h) => s + h.correct, 0);
    const avgAccuracy = totalPracticed > 0
      ? Math.round((totalCorrect / totalPracticed) * 100) : 0;

    document.getElementById('stat-total').textContent = totalPracticed;
    document.getElementById('stat-accuracy').textContent = avgAccuracy + '%';
    document.getElementById('stat-wrong').textContent = wrong.length;
  },

  bindEvents() {
    // 全选
    document.getElementById('btn-select-all').onclick = () => {
      if (State.selectedTopics.length === TOPICS.length) {
        State.selectedTopics = [];
        document.getElementById('btn-select-all').textContent = '全选';
      } else {
        State.selectedTopics = TOPICS.map(t => t.key);
        document.getElementById('btn-select-all').textContent = '取消全选';
      }
      this.renderTopics();
    };

    // 题量
    document.querySelectorAll('.count-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.questionCount = parseInt(btn.dataset.count);
      };
    });

    // 倒计时开关
    document.getElementById('toggle-timer').onchange = (e) => {
      State.useTimer = e.target.checked;
    };

    // 开始练习
    document.getElementById('btn-start').onclick = () => this.startPractice();

    // 错题本
    document.getElementById('btn-wrong-book').onclick = () => {
      Router.navigate('#/wrong');
    };
  },

  startPractice() {
    if (State.selectedTopics.length === 0) {
      this.toast('请至少选择一个板块');
      return;
    }

    const pool = getQuestionsByTopics(State.selectedTopics);
    if (pool.length === 0) {
      this.toast('所选板块暂无题目');
      return;
    }

    // 随机抽题
    const shuffled = shuffle(pool);
    const count = Math.min(State.questionCount, shuffled.length);
    State.practiceQuestions = shuffled.slice(0, count);
    State.currentIndex = 0;
    State.selectedOptions = [];
    State.confirmed = false;
    State.answers = [];
    State.isWrongRetry = false;
    State.startTime = Date.now();

    Router.navigate('#/practice');
  },

  toast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;z-index:9999;pointer-events:none;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }
};

// ════════════════════════════════════════════════════════
//  8. 练习页视图
// ════════════════════════════════════════════════════════

const PracticeView = {
  render() {
    // 恢复会话
    const saved = Storage.getSession();
    if (saved && saved.practiceQuestions && saved.practiceQuestions.length > 0) {
      State.practiceQuestions = saved.practiceQuestions;
      State.currentIndex = saved.currentIndex || 0;
      State.answers = saved.answers || [];
      State.isWrongRetry = saved.isWrongRetry || false;
      State.startTime = saved.startTime || Date.now();
    }

    if (State.practiceQuestions.length === 0) {
      Router.navigate('#/');
      return;
    }

    State.selectedOptions = [];
    State.confirmed = false;
    this.showQuestion();
    this.bindEvents();
  },

  showQuestion() {
    const q = State.practiceQuestions[State.currentIndex];
    if (!q) { this.finishPractice(); return; }

    const topic = getTopicInfo(q.topic);
    const total = State.practiceQuestions.length;
    const idx = State.currentIndex + 1;

    // 进度
    document.getElementById('progress-text').textContent = `第 ${idx}/${total} 题`;
    document.getElementById('progress-fill').style.width = `${(idx / total) * 100}%`;

    // 标签
    document.getElementById('q-topic-tag').textContent = topic.en;
    const typeTag = document.getElementById('q-type-tag');
    typeTag.textContent = q.type === 'multiple' ? '多选' : '单选';
    typeTag.className = 'type-tag ' + (q.type === 'multiple' ? '' : 'single');

    // 题干
    document.getElementById('q-stem').textContent = q.stem;

    // 选项
    const optionsList = document.getElementById('q-options');
    optionsList.innerHTML = '';
    q.options.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'option-item';
      item.dataset.key = opt.key;
      item.innerHTML = `
        <div class="option-key">${opt.key}</div>
        <div class="option-text">${opt.text}</div>
        <div class="option-icon"></div>
      `;
      item.addEventListener('click', () => this.selectOption(opt.key));
      optionsList.appendChild(item);
    });

    // 重置按钮与解析
    document.getElementById('explanation-box').style.display = 'none';
    document.getElementById('btn-confirm').classList.remove('hidden');
    document.getElementById('btn-confirm').disabled = true;
    document.getElementById('btn-next').classList.add('hidden');

    // 倒计时
    if (State.useTimer) {
      this.startTimer();
    } else {
      document.getElementById('timer-display').style.display = 'none';
    }

    // 保存会话
    this.saveSession();
  },

  selectOption(key) {
    if (State.confirmed) return;

    const q = State.practiceQuestions[State.currentIndex];
    if (q.type === 'single') {
      State.selectedOptions = [key];
    } else {
      const idx = State.selectedOptions.indexOf(key);
      if (idx > -1) {
        State.selectedOptions.splice(idx, 1);
      } else {
        State.selectedOptions.push(key);
      }
    }

    // 更新 UI
    document.querySelectorAll('.option-item').forEach(item => {
      if (State.selectedOptions.includes(item.dataset.key)) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });

    document.getElementById('btn-confirm').disabled = State.selectedOptions.length === 0;
  },

  confirmAnswer() {
    if (State.selectedOptions.length === 0) return;

    State.confirmed = true;
    this.stopTimer();

    const q = State.practiceQuestions[State.currentIndex];
    const correctSet = new Set(q.answer);
    const selectedSet = new Set(State.selectedOptions);
    const isCorrect = q.answer.length === selectedSet.size &&
      [...selectedSet].every(k => correctSet.has(k));

    // 锁定选项并高亮
    document.querySelectorAll('.option-item').forEach(item => {
      const key = item.dataset.key;
      item.classList.add('locked');
      item.classList.remove('selected');

      const iconEl = item.querySelector('.option-icon');
      if (correctSet.has(key) && selectedSet.has(key)) {
        item.classList.add('correct');
        iconEl.textContent = '✓';
      } else if (selectedSet.has(key) && !correctSet.has(key)) {
        item.classList.add('wrong');
        iconEl.textContent = '✗';
      } else if (correctSet.has(key) && !selectedSet.has(key)) {
        item.classList.add('missed');
        iconEl.textContent = '✓';
      }
    });

    // 显示解析
    const expBox = document.getElementById('explanation-box');
    expBox.style.display = 'block';
    const header = document.getElementById('exp-header');
    const icon = document.getElementById('exp-icon');
    const title = document.getElementById('exp-title');
    header.className = 'explanation-header ' + (isCorrect ? 'correct-header' : 'wrong-header');
    icon.textContent = isCorrect ? '✓ ' : '✗ ';
    title.textContent = isCorrect ? '回答正确！' : '回答错误';
    document.getElementById('exp-correct').textContent = '正确答案：' + q.answer.join('、');
    document.getElementById('exp-text').textContent = q.explain;
    document.getElementById('exp-source').textContent = q.source || '';

    // 记录答案
    State.answers.push({
      questionId: q.id,
      topic: q.topic,
      stem: q.stem,
      options: q.options,
      answer: q.answer,
      explain: q.explain,
      source: q.source,
      type: q.type,
      selected: [...State.selectedOptions],
      correct: isCorrect,
    });

    // 错题加入错题本
    if (!isCorrect) {
      Storage.addWrong(q, [...State.selectedOptions]);
    }

    // 切换按钮
    document.getElementById('btn-confirm').classList.add('hidden');
    const nextBtn = document.getElementById('btn-next');
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = State.currentIndex === State.practiceQuestions.length - 1
      ? '查看结果' : '下一题';

    this.saveSession();
  },

  nextQuestion() {
    State.currentIndex++;
    State.selectedOptions = [];
    State.confirmed = false;

    if (State.currentIndex >= State.practiceQuestions.length) {
      this.finishPractice();
    } else {
      this.showQuestion();
    }
  },

  finishPractice() {
    this.stopTimer();
    const correct = State.answers.filter(a => a.correct).length;
    const total = State.answers.length;
    const timeUsed = Math.round((Date.now() - State.startTime) / 1000);

    Storage.addHistory({
      date: Date.now(),
      correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      timeUsed,
      topics: [...new Set(State.practiceQuestions.map(q => q.topic))],
      isWrongRetry: State.isWrongRetry,
    });

    Storage.clearSession();
    Router.navigate('#/result');
  },

  startTimer() {
    State.timeLeft = 60;
    const display = document.getElementById('timer-display');
    display.style.display = 'inline';
    display.textContent = State.timeLeft + 's';

    this.stopTimer();
    State.timerInterval = setInterval(() => {
      State.timeLeft--;
      display.textContent = State.timeLeft + 's';
      if (State.timeLeft <= 10) {
        display.style.color = '#dc2626';
      }
      if (State.timeLeft <= 0) {
        this.stopTimer();
        if (!State.confirmed) {
          this.confirmAnswer();
        }
      }
    }, 1000);
  },

  stopTimer() {
    if (State.timerInterval) {
      clearInterval(State.timerInterval);
      State.timerInterval = null;
    }
    const display = document.getElementById('timer-display');
    if (display) display.style.color = '';
  },

  saveSession() {
    Storage.saveSession({
      practiceQuestions: State.practiceQuestions,
      currentIndex: State.currentIndex,
      answers: State.answers,
      isWrongRetry: State.isWrongRetry,
      startTime: State.startTime,
    });
  },

  bindEvents() {
    document.getElementById('btn-confirm').onclick = () => this.confirmAnswer();
    document.getElementById('btn-next').onclick = () => this.nextQuestion();

    document.getElementById('practice-back').onclick = () => {
      if (confirm('退出练习？当前进度已保存，下次进入可继续。')) {
        this.stopTimer();
        Router.navigate('#/');
      }
    };
  },
};

// ════════════════════════════════════════════════════════
//  9. 结果页视图
// ════════════════════════════════════════════════════════

const ResultView = {
  render() {
    const answers = State.answers;
    if (answers.length === 0) {
      Router.navigate('#/');
      return;
    }

    const correct = answers.filter(a => a.correct).length;
    const total = answers.length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    // 圆环动画
    const ring = document.getElementById('ring-fill');
    const circumference = 2 * Math.PI * 85;
    const offset = circumference * (1 - percent / 100);
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference;
    setTimeout(() => {
      ring.style.strokeDashoffset = offset;
    }, 100);

    document.getElementById('result-percent').textContent = percent + '%';
    document.getElementById('result-score').textContent = `${correct}/${total}`;

    // 评语
    let comment;
    if (percent >= 90) comment = '🏆 出色！你已具备 USABO 冲奖实力！';
    else if (percent >= 75) comment = '👏 优秀！继续保持，冲击半决赛！';
    else if (percent >= 60) comment = '💪 不错的成绩，错题再练一定会更好！';
    else if (percent >= 40) comment = '📚 继续加油，多刷错题是关键！';
    else comment = '🦾 别灰心，反复练习就是进步的开始！';
    document.getElementById('result-comment').textContent = comment;

    // 汇总
    document.getElementById('summary-correct').textContent = `${correct} 题正确`;
    document.getElementById('summary-wrong').textContent = `${total - correct} 题错误`;

    // 时间
    const timeUsed = Math.round((Date.now() - State.startTime) / 1000);
    const min = Math.floor(timeUsed / 60);
    const sec = timeUsed % 60;
    document.getElementById('summary-time').textContent = `用时 ${min}分${sec}秒`;
    document.getElementById('summary-time-wrap').style.display = 'flex';

    // 回顾列表
    this.renderReview(answers);
    this.bindEvents();
  },

  renderReview(answers) {
    const list = document.getElementById('review-list');
    list.innerHTML = '';

    answers.forEach((a, i) => {
      const topic = getTopicInfo(a.topic);
      const item = document.createElement('div');
      item.className = 'review-item ' + (a.correct ? 'correct-item' : 'wrong-item');
      item.innerHTML = `
        <div class="review-header">
          <span class="review-status ${a.correct ? 'correct' : 'wrong'}">${a.correct ? '✓' : '✗'}</span>
          <span class="review-topic">${topic.en}</span>
        </div>
        <div class="review-stem">${i + 1}. ${a.stem}</div>
        <div class="review-answers">
          <span class="your-answer ${a.correct ? '' : 'wrong'}">你的答案：${a.selected.join('、') || '未作答'}</span>
          <span class="right-answer">正确答案：${a.answer.join('、')}</span>
        </div>
        <div class="review-explain">${a.explain}</div>
        <button class="review-toggle">查看解析</button>
      `;
      item.querySelector('.review-toggle').onclick = () => {
        item.classList.toggle('expanded');
        item.querySelector('.review-toggle').textContent =
          item.classList.contains('expanded') ? '收起解析' : '查看解析';
      };
      list.appendChild(item);
    });
  },

  bindEvents() {
    document.getElementById('btn-back-home').onclick = () => Router.navigate('#/');

    document.getElementById('btn-retry-wrong').onclick = () => {
      const wrongAnswers = State.answers.filter(a => !a.correct);
      if (wrongAnswers.length === 0) {
        HomeView.toast('本次没有错题，无需重练！');
        return;
      }
      // 从错题中构建练习
      State.practiceQuestions = wrongAnswers.map(a => ({
        id: a.questionId,
        topic: a.topic,
        type: a.type,
        stem: a.stem,
        options: a.options,
        answer: a.answer,
        explain: a.explain,
        source: a.source,
      }));
      State.currentIndex = 0;
      State.selectedOptions = [];
      State.confirmed = false;
      State.answers = [];
      State.isWrongRetry = true;
      State.startTime = Date.now();
      Router.navigate('#/practice');
    };
  },
};

// ════════════════════════════════════════════════════════
//  10. 错题本视图
// ════════════════════════════════════════════════════════

const WrongView = {
  render() {
    this.renderFilterBar();
    this.renderList();
    this.bindEvents();
  },

  renderFilterBar() {
    const bar = document.getElementById('wrong-filter-bar');
    const wrong = Storage.getWrong();
    const topicsInWrong = [...new Set(wrong.map(w => w.topic))];

    bar.innerHTML = `<button class="filter-chip ${State.wrongFilter === 'all' ? 'active' : ''}" data-filter="all">全部 (${wrong.length})</button>`;

    TOPICS.filter(t => topicsInWrong.includes(t.key)).forEach(t => {
      const count = wrong.filter(w => w.topic === t.key).length;
      const chip = document.createElement('button');
      chip.className = 'filter-chip' + (State.wrongFilter === t.key ? ' active' : '');
      chip.dataset.filter = t.key;
      chip.textContent = `${t.en} (${count})`;
      bar.appendChild(chip);
    });
  },

  renderList() {
    const wrong = Storage.getWrong();
    const filtered = State.wrongFilter === 'all'
      ? wrong : wrong.filter(w => w.topic === State.wrongFilter);

    const list = document.getElementById('wrong-list');
    const empty = document.getElementById('wrong-empty');
    const actions = document.getElementById('wrong-actions');

    if (filtered.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      actions.style.display = 'none';
      return;
    }

    empty.classList.add('hidden');
    actions.style.display = 'flex';

    list.innerHTML = '';
    filtered.forEach((w, i) => {
      const topic = getTopicInfo(w.topic);
      const card = document.createElement('div');
      card.className = 'wrong-card';
      card.innerHTML = `
        <div class="wrong-card-header">
          <div class="wrong-card-tags">
            <span class="topic-tag">${topic.en}</span>
            <span class="type-tag ${w.type === 'multiple' ? '' : 'single'}">${w.type === 'multiple' ? '多选' : '单选'}</span>
          </div>
          <span class="wrong-card-meta">${new Date(w.addedAt).toLocaleDateString('zh-CN')}</span>
        </div>
        <div class="wrong-stem">${i + 1}. ${w.stem}</div>
        <div class="wrong-answers">
          <span class="your-answer">你的答案：${(w.yourAnswer || []).join('、') || '未作答'}</span>
          <span class="right-answer">正确答案：${w.answer.join('、')}</span>
        </div>
        <div class="wrong-explain">${w.explain}</div>
        <div class="wrong-card-actions">
          <button class="btn-mini danger" data-action="remove" data-id="${w.id}">已掌握，移除</button>
        </div>
      `;

      // 点击题干展开/收起
      card.querySelector('.wrong-stem').onclick = () => {
        card.classList.toggle('expanded');
      };

      // 移除按钮
      card.querySelector('[data-action="remove"]').onclick = (e) => {
        e.stopPropagation();
        Storage.removeWrong(w.id);
        this.renderFilterBar();
        this.renderList();
      };

      list.appendChild(card);
    });
  },

  bindEvents() {
    document.getElementById('wrong-back').onclick = () => Router.navigate('#/');

    document.getElementById('wrong-filter-bar').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      State.wrongFilter = chip.dataset.filter;
      this.renderFilterBar();
      this.renderList();
    });

    document.getElementById('btn-practice-wrong').onclick = () => {
      const wrong = Storage.getWrong();
      const filtered = State.wrongFilter === 'all'
        ? wrong : wrong.filter(w => w.topic === State.wrongFilter);

      if (filtered.length === 0) {
        HomeView.toast('没有可练习的错题');
        return;
      }

      State.practiceQuestions = filtered.map(w => ({
        id: w.id,
        topic: w.topic,
        type: w.type,
        stem: w.stem,
        options: w.options,
        answer: w.answer,
        explain: w.explain,
        source: w.source,
      }));
      State.currentIndex = 0;
      State.selectedOptions = [];
      State.confirmed = false;
      State.answers = [];
      State.isWrongRetry = true;
      State.startTime = Date.now();
      Router.navigate('#/practice');
    };
  },
};

// ════════════════════════════════════════════════════════
//  11. PWA 安装
// ════════════════════════════════════════════════════════

const PWA = {
  deferredPrompt: null,

  init() {
    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('SW registration failed:', err);
      });
    }

    // 监听安装提示
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBanner();
    });

    // 安装按钮
    const installBtn = document.getElementById('btn-install');
    if (installBtn) {
      installBtn.onclick = () => this.promptInstall();
    }

    const dismissBtn = document.getElementById('btn-dismiss');
    if (dismissBtn) {
      dismissBtn.onclick = () => this.hideInstallBanner();
    }

    // 已安装
    window.addEventListener('appinstalled', () => {
      this.hideInstallBanner();
    });
  },

  showInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('hidden');
  },

  hideInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
  },

  async promptInstall() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.hideInstallBanner();
  },
};

// ════════════════════════════════════════════════════════
//  12. 初始化
// ════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  PWA.init();
  Router.init();
});
