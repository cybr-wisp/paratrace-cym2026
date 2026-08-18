# MemoryMirror

**Quantifying How AI Text Processing Erases Linguistic Markers of Cognitive Decline**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Conference: CYM 2026](https://img.shields.io/badge/Conference-CYM%202026-green.svg)](https://cymottawa.com)

## Architecture

![ParaTrace system architecture](docs/paratrace-architecture.png)

> *If AI makes everyone sound better, could it accidentally hide signs of diseases like Alzheimer's?*

---

## The Problem

People with early cognitive decline talk differently. They repeat
themselves, use simpler words, lose their train of thought, and struggle
to find the right word. Researchers can train ML models to detect these
patterns and flag potential cognitive impairment from speech alone -- no
brain scan, no blood test, just language.

But AI is now embedded in the communication pipeline between patients and
clinicians. AI scribes listen to doctor visits and write the notes. Voice
assistants talk to elderly people daily. Apps clean up emails and messages.
These tools "fix" language by default: they remove repetition, enrich
vocabulary, smooth out incoherence, and impose structure.

**MemoryMirror asks: when AI "fixes" someone's speech, does it accidentally
erase the evidence that something is wrong with their brain?**

---

## Why This Matters Now

### Canada's Dementia Crisis

| Metric | Value | Source |
|--------|-------|--------|
| Canadians living with dementia (2025) | 771,939 | [Alzheimer Society of Canada](https://alzheimer.ca/en/about-dementia/what-dementia/dementia-numbers-canada) |
| New diagnoses per day | 414+ (17 per hour) | Alzheimer Society of Canada |
| Projected by 2030 | ~1 million (65% increase from 2020) | [Alzheimer Society Landmark Study](https://clearalzheimers.ca/dementia-in-canada/) |
| Projected by 2050 | 1.7 million (187% increase) | Alzheimer Society Landmark Study |
| Total affected over 30 years | 6.3 million Canadians | Alzheimer Society Landmark Study |
| Annual economic burden (2020) | $40.1 billion | [CANCEA](https://www.cancea.ca/wp-content/uploads/2023/07/CANCEA-Economic-Impact-of-Dementia-in-Canada-2023-01-08.pdf) |
| Projected care costs by 2038 | $153 billion | [Frontiers in Public Health](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2025.1631676/full) |
| Ontario alone, annual cost | $30 billion+ | [Alzheimer Society of Ontario](https://alzheimer.ca/on/sites/on/files/documents/ODCA%202025%20Recommendations%202025-02-05%202.pdf) |
| Informal caregiver burden | $25 billion (54% of total) | CANCEA |
| Canadians who know someone with dementia | 74% | [NIA](https://niageing.ca/reports/addressing-dementia-in-canada-current-trends-challenges-and-opportunities-in-improving-public-awareness-reducing-the-risk-and-challenging-stigma-related-to-dementia/) |
| Dementia deaths (2022) | 25,994 (3x since 2000) | [Statistics Canada](https://www.statcan.gc.ca/o1/en/plus/5374-alzheimers-awareness-month) |

Canada's national dementia strategy (2019) explicitly prioritizes early
detection and screening. Speech-based cognitive assessment is one of the
most promising non-invasive approaches to meeting that goal.

### AI Is Already Rewriting Patient Language in Canada

| Deployment | Status | Source |
|------------|--------|--------|
| Ontario AI Scribe Program | 18 vendors approved, provincial rollout | [OntarioMD Practice Hub](https://omdpracticehub.com/learn/ai-scribe-program/) |
| The Ottawa Hospital | Active DAX Copilot pilot | [Ottawa Hospital Newsroom](https://www.ottawahospital.on.ca/en/newsroom/less-time-charting-means-more-time-patients-how-ottawa-hospital-using-ai-support-patient) |
| Sunnybrook Health Sciences Centre | Emergency dept AI scribe trial | [Policy Options](https://policyoptions.irpp.org/2026/04/ai-scribes-health-care-canada-privacy-safety-risks/) |
| Hamilton Health Sciences | Active AI scribe deployment | Policy Options |
| Ontario privacy guidance | IPC released AI scribe rules, Jan 2026 | [Baker McKenzie](https://www.bakermckenzie.com/en/insight/publications/2026/03/canada-ontario-ai-scribe-guidance-signals-emerging-regulatory-baseline) |
| National health AI platform (Vital) | 160+ hospitals across ON, AB, QC | [Medscape](https://www.medscape.com/viewarticle/national-ai-initiative-holds-promise-canadian-healthcare-2026a1000lvj) |
| Public Health Ontario | AI scribe pilot for public health investigations | [PHO](https://www.publichealthontario.ca/en/Education-and-Events/Events-and-Presentations/2026/02/Efficiency-AI-Scribe) |
| Canadian physicians using AI (2026) | 81% (up from 38% in 2023) | [OMA](https://www.oma.org/news/2026/april/ai-in-medicine-a-primer-for-ontario-physicians/) |

These tools use large language models to convert raw patient-clinician
conversation into structured medical notes. A patient's hesitations,
repetitions, and word-finding struggles are processed through an LLM before
a single character reaches the medical record.

### The Regulatory Blind Spot

Ontario's IPC guidance, PHIPA compliance frameworks, and the OntarioMD
procurement program all focus on **privacy, consent, and data governance.**

None of them ask whether AI processing preserves the **diagnostically
relevant linguistic features** that early cognitive screening depends on.

```
Canada's National Dementia Strategy (2019)
  Goal: Early detection and screening
            |
Ontario AI Scribe Program (2026)
  18 approved vendors, provincial rollout
  Ottawa Hospital: active DAX Copilot deployment
            |
MemoryMirror (this research)
  Question nobody asked: Does the second
  goal undermine the first?
```

**MemoryMirror fills that gap.**

---

## What MemoryMirror Does

### The Experiment

1. **Baseline classification**: Train ML classifiers to distinguish Healthy,
   MCI, and Alzheimer's speech using the
   [DementiaBank Pitt Corpus](https://dementia.talkbank.org/) across 8
   categories of validated linguistic biomarkers

2. **Progressive AI rewriting**: Process each clinical transcript through
   four levels of LLM intervention:
   - Level 1: Grammar correction only
   - Level 2: Light paraphrasing
   - Level 3: Moderate rewriting
   - Level 4: Full reformulation

3. **Cross-architecture validation**: Apply each rewriting level using two
   commercially distinct LLM backends (OpenAI GPT-4o and Anthropic Claude)
   to test whether biomarker erasure is model-specific or systematic

4. **Measure the damage**: Quantify per-biomarker degradation, track
   classification accuracy across intervention levels, and identify which
   features are most vulnerable to AI-induced erasure

### The Key Hypothesis

AI processing preserves *what* a speaker communicates (semantic content)
while systematically erasing *how* they communicate it (clinically
informative linguistic patterns). If confirmed, this means AI is selectively
destroying the channel that carries diagnostic information while leaving the
message intact.

### The Linguistic Biomarkers

| # | Biomarker | What It Captures | Why AI Threatens It |
|---|-----------|-----------------|-------------------|
| 1 | **Lexical Diversity** (TTR, MTLD, vocd-D) | Vocabulary variety | LLMs artificially inflate word variety |
| 2 | **Repetition Frequency** (n-gram overlap) | Perseveration patterns | LLMs eliminate repetition by design |
| 3 | **Semantic Coherence** (embedding similarity) | Logical flow between sentences | LLMs impose artificial coherence |
| 4 | **Syntactic Complexity** (parse depth, clause density) | Sentence structure sophistication | LLMs produce well-formed complex sentences |
| 5 | **Propositional Density** (idea density) | Information packed per utterance | LLMs may inflate apparent idea density |
| 6 | **Word-Finding Markers** (filler rate, incomplete words) | Anomia indicators | LLMs remove all fillers and hesitations |
| 7 | **Vocabulary Sophistication** (Brunet's W, Honore's R) | Word frequency / rarity | LLMs introduce lower-frequency synonyms |
| 8 | **Content Information Units** (CIU ratio) | Informative vs. empty speech | LLMs clarify and specify vague language |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     DATA LAYER                           │
│  DementiaBank Pitt Corpus (.cha files)                   │
│  Labels: Healthy / MCI / Dementia                        │
└─────────────────────────┬────────────────────────────────┘
                          │
                          v
┌──────────────────────────────────────────────────────────┐
│                  PREPROCESSING                           │
│  Parse .cha -> clean transcripts -> normalize            │
│  Preserve disfluencies for feature extraction            │
└─────────────────────────┬────────────────────────────────┘
                          │
                 ┌────────┴────────┐
                 v                 v
┌────────────────────┐  ┌─────────────────────────────────┐
│   FEATURE          │  │   AI REWRITING PIPELINE         │
│   EXTRACTION       │  │                                 │
│                    │  │   Level 0: Original              │
│  8 biomarker       │  │   Level 1: Grammar correction    │
│  categories        │  │   Level 2: Light paraphrase      │
│  ~20 features      │  │   Level 3: Moderate rewrite      │
│                    │  │   Level 4: Full reformulation    │
│                    │  │                                 │
│                    │  │   x2 backends (GPT-4o, Claude)   │
└────────┬───────────┘  └──────────────┬──────────────────┘
         │                             │
         └──────────┬──────────────────┘
                    v
┌──────────────────────────────────────────────────────────┐
│                  ANALYSIS ENGINE                         │
│                                                          │
│  - Classification accuracy at each intervention level    │
│  - Per-biomarker degradation (paired Wilcoxon tests)     │
│  - Effect sizes (Cohen's d) for group separation         │
│  - Cross-LLM consistency analysis                        │
│  - Confusion matrices (H vs MCI vs AD per level)         │
└─────────────────────────┬────────────────────────────────┘
                          │
                          v
┌──────────────────────────────────────────────────────────┐
│                 PRESENTATION LAYER                       │
│                                                          │
│  FastAPI backend    React dashboard    RPi kiosk demo    │
│  /analyze           Radar chart        7" touchscreen    │
│  /rewrite           Degradation bars   USB microphone    │
│  /compare           Transcript diff    Chromium kiosk    │
│  /classify          Confidence gauge                     │
└──────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
memorymirror/
├── README.md
├── requirements.txt
├── .env.example
├── .gitignore
├── LICENSE
│
├── src/
│   ├── data/
│   │   ├── parse_corpus.py         # Parse .cha files from DementiaBank
│   │   ├── preprocess.py           # Clean and normalize transcripts
│   │   └── dataset.py              # DataFrame construction and splitting
│   │
│   ├── features/
│   │   ├── extractor.py            # Main feature extraction engine
│   │   ├── lexical.py              # Lexical diversity metrics
│   │   ├── repetition.py           # Repetition frequency analysis
│   │   ├── coherence.py            # Semantic coherence (embeddings)
│   │   ├── syntax.py               # Syntactic complexity metrics
│   │   ├── density.py              # Propositional density
│   │   ├── word_finding.py         # Word-finding difficulty markers
│   │   ├── vocabulary.py           # Vocabulary sophistication
│   │   └── ciu.py                  # Content information units
│   │
│   ├── rewriting/
│   │   ├── rewriter.py             # Multi-level LLM rewriting pipeline
│   │   ├── prompts.py              # Intervention level prompt templates
│   │   └── backends.py             # OpenAI / Anthropic API wrappers
│   │
│   ├── classification/
│   │   ├── classifier.py           # Train and evaluate ML classifiers
│   │   ├── evaluate.py             # Cross-level evaluation pipeline
│   │   └── feature_importance.py   # Feature importance and selection
│   │
│   ├── analysis/
│   │   ├── degradation.py          # Per-biomarker degradation analysis
│   │   ├── statistics.py           # Statistical tests and effect sizes
│   │   └── visualization.py        # Generate result figures
│   │
│   └── api/
│       ├── main.py                 # FastAPI application
│       ├── routes.py               # API endpoints
│       └── schemas.py              # Pydantic models
│
├── frontend/                       # React + Tailwind dashboard
├── hardware/                       # Raspberry Pi kiosk setup
├── notebooks/                      # Jupyter experiment notebooks
├── docs/                           # Abstract, research context, biomarkers
└── tests/
```

---

## Quick Start

```bash
git clone https://github.com/cybr-wisp/memorymirror.git
cd memorymirror

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

cp .env.example .env
# Add your OpenAI and Anthropic API keys

# Run the pipeline
python -m src.data.parse_corpus --input ./pitt_corpus/ --output ./data/parsed.csv
python -m src.features.extractor --input ./data/parsed.csv --output ./data/features.csv
python -m src.rewriting.rewriter --input ./data/parsed.csv --output ./data/rewritten/
python -m src.classification.classifier --features ./data/features.csv --output ./results/

# Launch API + frontend
uvicorn src.api.main:app --reload --port 8000
cd frontend && npm install && npm run dev
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11+ |
| Data parsing | pylangacq (CHAT format) |
| NLP | spaCy, NLTK, lexicalrichness |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| ML | scikit-learn (Random Forest, GBM, Logistic Regression) |
| Statistics | scipy.stats, pingouin |
| LLM rewriting | OpenAI API (GPT-4o), Anthropic API (Claude Sonnet) |
| Backend | FastAPI + Uvicorn |
| Frontend | React + Tailwind CSS + Recharts |
| Speech-to-text | OpenAI Whisper |
| Demo hardware | Raspberry Pi 4, 7" touchscreen, USB microphone |

---

## References

### Canadian Dementia Data
1. Alzheimer Society of Canada. "Dementia numbers in Canada." 2025. [Link](https://alzheimer.ca/en/about-dementia/what-dementia/dementia-numbers-canada)
2. Clear Alzheimer's. "Dementia in Canada: What the projections tell us." June 2026. [Link](https://clearalzheimers.ca/dementia-in-canada/)
3. Statistics Canada. "Alzheimer's Awareness Month." [Link](https://www.statcan.gc.ca/o1/en/plus/5374-alzheimers-awareness-month)
4. CANCEA. "Economic Burden of Dementia in Canada 2020-2050." July 2023. [PDF](https://www.cancea.ca/wp-content/uploads/2023/07/CANCEA-Economic-Impact-of-Dementia-in-Canada-2023-01-08.pdf)
5. Fereshtehnejad et al. "Economic evaluation of a digital health intervention for preventing dementia in Canadians with MCI." *Frontiers in Public Health*, April 2026. [Link](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2025.1631676/full)
6. NIA. "Addressing Dementia in Canada." January 2026. [Link](https://niageing.ca/reports/addressing-dementia-in-canada-current-trends-challenges-and-opportunities-in-improving-public-awareness-reducing-the-risk-and-challenging-stigma-related-to-dementia/)

### Canadian AI Healthcare Deployment
7. Policy Options / IRPP. "AI scribes in Canada's health system pose privacy and safety risks." April 2026. [Link](https://policyoptions.irpp.org/2026/04/ai-scribes-health-care-canada-privacy-safety-risks/)
8. Aird & Berlis LLP. "The Rise of AI Scribes: Balancing Efficiency With Privacy in Canadian Health Care." February 2026. [Link](https://www.airdberlis.com/insights/publications/publication/the-rise-of-ai-scribes--balancing-efficiency-with-privacy-in-canadian-health-care)
9. Baker McKenzie. "Canada: Ontario AI Scribe Guidance." March 2026. [Link](https://www.bakermckenzie.com/en/insight/publications/2026/03/canada-ontario-ai-scribe-guidance-signals-emerging-regulatory-baseline)
10. OMA. "AI in medicine: A primer for Ontario physicians." April 2026. [Link](https://www.oma.org/news/2026/april/ai-in-medicine-a-primer-for-ontario-physicians/)
11. The Ottawa Hospital. "Using AI to support patient care." June 2025. [Link](https://www.ottawahospital.on.ca/en/newsroom/less-time-charting-means-more-time-patients-how-ottawa-hospital-using-ai-support-patient)
12. Medscape. "National AI Initiative Holds Promise for Canadian Healthcare." June 2026. [Link](https://www.medscape.com/viewarticle/national-ai-initiative-holds-promise-canadian-healthcare-2026a1000lvj)
13. CSA Group. "Generative AI's role in Canadian Healthcare in 2026." April 2026. [Link](https://www.csagroup.org/article/public-policy/a-complement-not-a-substitute-generative-ais-role-in-canadian-healthcare-in-2026/)
14. Public Health Ontario. "Efficiency Using AI Scribe." February 2026. [Link](https://www.publichealthontario.ca/en/Education-and-Events/Events-and-Presentations/2026/02/Efficiency-AI-Scribe)

### Global AI Healthcare Adoption
15. Ona Health. "AI in Medical Practices: Adoption Statistics 2026." [Link](https://ona.health/blog/post/ai-medical-practice-statistics)
16. University of Michigan. "Older adults and AI: National Poll on Healthy Aging." July 2025. [Link](https://news.umich.edu/older-adults-and-ai-u-m-poll-suggests-a-wary-welcome/)
17. SQ Magazine. "AI Tools Usage Statistics 2026." [Link](https://sqmagazine.co.uk/ai-tools-usage-statistics/)

---

## Conference

Developed for [Connecting Young Minds (CYM) 2026](https://cymottawa.com),
University of Ottawa, September 26, 2026.

## License

MIT License. See [LICENSE](LICENSE) for details.