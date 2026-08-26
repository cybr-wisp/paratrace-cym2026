
<div align="center">
# ParaTrace
 
### Measuring Linguistic Biomarker Degradation Under LLM Rewriting of Clinical Speech
 
**A controlled computational study evaluating whether language-model rewriting preserves linguistic features used in cognitive-status classification.**
 
![Python](https://img.shields.io/badge/python-3.11+-blue?logo=python&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Conference](https://img.shields.io/badge/Conference-CYM%202026-orange)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?logo=scikit-learn&logoColor=white)
![spaCy](https://img.shields.io/badge/spaCy-09A3D5?logo=spacy&logoColor=white)
![Sentence Transformers](https://img.shields.io/badge/Sentence%20Transformers-FFD43B?logo=huggingface&logoColor=black)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-191919?logo=anthropic&logoColor=white)
 
</div>
---
 
## The Problem
 
Healthcare systems are deploying **AI clinical scribes** (18 vendors approved in Ontario, DAX Copilot piloting at The Ottawa Hospital) to transform spontaneous patient speech into polished clinical documentation. At the same time, Canada's National Dementia Strategy prioritizes **early detection through computational speech analysis**.
 
These two priorities are on a collision course. AI scribes are designed to normalize the exact speech patterns -- fillers, repetitions, syntactic hesitations, reduced coherence -- that computational screening uses to detect cognitive decline. **No existing study has tested whether they are compatible.**
 
> **A language model rewrite can preserve *what* a patient says while systematically erasing *how* they say it.**
 
If downstream diagnostic algorithms evaluate rewritten notes rather than raw transcripts, semantic fidelity alone is insufficient to retain predictive signal. ParaTrace measures this failure mode by treating LLM rewriting as a controlled source of distribution shift across clinically validated linguistic biomarkers.
 
---
 
## Research Question
 
> **When LLMs rewrite clinical speech transcripts across progressive intervention levels, which cognitive-linguistic biomarkers are preserved, which are altered, and how severely does this alteration degrade downstream cognitive-status classification?**
 
---
 
## Pre-Specified Hypotheses
 
The protocol, experimental variables, evaluation procedures, and statistical tests were frozen on **August 18, 2026**, prior to final model evaluation. The complete frozen protocol is available in [`docs/protocol.md`](docs/protocol.md).
 
- **H1: Progressive biomarker degradation** -- Increasing rewrite intensity produces monotonically increasing deviation from baseline (L0) feature representations.
- **H2: Semantic preservation with signal loss** -- Semantic embeddings maintain high similarity across rewrites while structural and syntactic biomarkers undergo significant degradation.
- **H3: Downstream classifier degradation** -- Classifiers trained on baseline (L0) distributions suffer catastrophic performance drops when evaluated on rewritten (L1-L4) feature spaces.
- **H4: Differential biomarker vulnerability** -- Fluency, repetition, and word-finding markers degrade at lower intervention thresholds (L1-L2) than global discourse coherence markers (L3-L4).
- **H5: Cross-backend consistency** -- Biomarker erasure behavior remains consistent across distinct LLM architectures and providers.
---

---

## Experimental Design

<img src="assets/experimental_design.png" alt="Experimental Design" width="700">

**552** clinically labeled transcripts from the [DementiaBank Pitt Corpus](https://dementia.talkbank.org/) -- **243 Control**, **309 Dementia** -- processed through two LLM backends (GPT-4o-mini, Claude 3.5 Sonnet) at four progressive intervention levels. **4,416 total rewrites.** 20 linguistic biomarkers extracted across 8 clinically grounded categories using spaCy, sentence-transformers, and lexicalrichness.

All hypotheses, variables, and statistical tests were **pre-registered before final analysis**. The complete frozen protocol is available in [`docs/protocol.md`](docs/protocol.md).

---

## System Architecture

<img src="assets/paratrace-architecture.png" alt="ParaTrace System Architecture" width="700">

---

## What We Found

### 1. Diagnostic Signal Erasure

<img src="assets/degradation_curve.png" alt="Diagnostic Signal Degradation Across Rewrite Levels" width="700">

| Level | Intervention | Description | Anthropic | OpenAI | Average |
|:------|:-------------|:------------|:---------:|:------:|:-------:|
| **L0** | Baseline | Unaltered spontaneous transcript | **73.4%** | **73.4%** | **73.4%** |
| L1 | Grammar | Punctuation and grammatical correction | 68.8% | 66.5% | 67.7% |
| L2 | Paraphrase | Filler removal, structural smoothing | 62.3% | 56.9% | 59.6% |
| **L3** | **Moderate** | **Clinical note restructuring** | **51.8%** | **52.5%** | **52.2%** |
| **L4** | **Full** | **Complete prose reformulation** | **54.2%** | **53.3%** | **53.8%** |

**Key findings:**

- **Degradation begins immediately.** Even grammar-only correction (L1) drops accuracy from 73.4% to 67.7%, confirming that disfluency markers carry diagnostic signal.
- **L3/L4 converge to chance (~50%).** Both backends independently reach coin-flip accuracy, confirming the effect is **architecture-general**, not provider-specific.
- **19 of 20 features significantly altered by L2.** Wilcoxon signed-rank tests with Benjamini-Hochberg FDR correction (p < 0.05). The single non-significant feature is incomplete-word rate.

All levels evaluated using **stratified 5-fold cross-validation on held-out data** with identical fold assignments across L0 through L4. No train-set leakage.

### 2. The "What vs. How" Gap

<img src="assets/what_vs_how.png" alt="The What vs How Gap" width="700">

While diagnostic accuracy collapses toward random chance, **semantic cosine similarity remains above 83%**. The LLM faithfully preserves semantic content ("what") while erasing diagnostic structural signatures ("how").

### 3. Feature Importance

<img src="assets/feature_importance.png" alt="Feature Importance" width="700">

**Global coherence, pronoun-to-noun ratio, and CIU ratio** are the strongest diagnostic predictors -- precisely the features AI rewriting inflates most aggressively.
 
















## The solution

We propose a **pre-extraction architecture**: capture biomarker features from raw speech *before* AI rewriting, then pass both the polished clinical note and the preserved biomarker profile to the clinician.

```
Patient speaks
      |
      v
Raw ASR transcript (archived)
      |
      +---> Biomarker extraction (pre-AI) ---> Biomarker profile (100% signal)
      |
      v
AI scribe rewrites for readability
      |
      v
Clinician receives: polished note + biomarker profile + archived raw transcript
```

Under this design, 100% of diagnostic signal is retained without sacrificing documentation readability.

## Architecture

![ParaTrace system architecture](docs/paratrace-architecture.png)

## Feature importance

<img src="docs/feature_importance.png" alt="Feature Importance" width="700">

Global coherence, pronoun-to-noun ratio, and CIU ratio are the strongest diagnostic predictors. These are precisely the features AI rewriting inflates most aggressively.

## Pipeline

| Stage | Script | Description |
|-------|--------|-------------|
| Ingestion | `src/paratrace/ingestion/chat_parser.py` | Parse DementiaBank .cha files, preserve disfluencies |
| Feature extraction | `src/paratrace/features/extractor.py` | 20 biomarkers across 8 categories via spaCy, sentence-transformers, lexicalrichness |
| LLM rewriting | `src/paratrace/rewriting/rewriting.py` | 4 intervention levels, 2 backends, full disk caching |
| Classification | `src/paratrace/modeling/classifier.py` | RF/GBT/LogReg with stratified 5-fold CV, degradation analysis, BRR, statistical tests |
| Solution demo | `src/paratrace/analysis/solution.py` | Pre-extraction vs post-extraction comparison, biomarker profile generation |

## Quickstart

```bash
git clone https://github.com/cybr-wisp/paratrace-cym2026.git
cd paratrace-cym2026
python -m venv venv && source venv/bin/activate  # Windows: .\venv\Scripts\Activate

pip install pylangacq spacy scikit-learn scipy sentence-transformers lexicalrichness openai anthropic python-dotenv
python -m spacy download en_core_web_sm

cp .env.example .env  # Add your OpenAI and Anthropic API keys

# Full pipeline (requires DementiaBank access - see data/README.md)
python src/paratrace/ingestion/chat_parser.py --corpus-dir data/raw/cookie_only --output data/processed/transcripts.csv
python src/paratrace/features/extractor.py --input data/processed/transcripts.csv --output data/processed/features_L0.csv
python src/paratrace/rewriting/rewriting.py --input data/processed/transcripts.csv --output-dir data/rewrites --backend both
python src/paratrace/modeling/classifier.py --mode all --features data/processed/features_L0.csv --features-dir data/processed/ --output data/results/
```

## Data

The DementiaBank Pitt Corpus is access-controlled to protect participant privacy. See [`data/README.md`](data/README.md) for how to obtain access and reproduce results. No patient data is stored in this repository.

## References

- Becker, J.T., Boiler, F., Lopez, O.L., Saxton, J., & McGonigle, K.L. (1994). The natural history of Alzheimer's disease: Description of study cohort and accuracy of diagnosis. *Archives of Neurology*, 51(6), 585-594.
- Balabin, H., et al. (2025). Leveraging speech and NLP for cognitive decline detection. *Journal of Alzheimer's Disease*.
- Chou, H.C., et al. (2024). Linguistic biomarker classification from clinical speech transcripts. *INTERSPEECH*.
- Fraser, K.C., Meltzer, J.A., & Rudzicz, F. (2016). Linguistic features identify Alzheimer's disease in narrative speech. *Journal of Alzheimer's Disease*, 49(2), 407-422.

## Citation

```bibtex
@inproceedings{sindhu2026paratrace,
  title={ParaTrace: AI makes dementia invisible},
  author={Sindhu, Marie},
  booktitle={CYM 2026},
  year={2026},
  institution={University of Ottawa}
}
```

## [License](LICENSE)

MIT

---

<div align="center">

Built with ☕ by [Marie](https://github.com/cybr-wisp)

</div>