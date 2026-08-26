<div align="center">
# ParaTrace

</div>

### Measuring linguistic biomarker degradation under LLM rewriting of clinical speech

**A controlled computational study of whether language-model rewriting preserves linguistic features used in cognitive-status classification.**

![Python](https://img.shields.io/badge/python-3.11+-blue?logo=python&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Conference](https://img.shields.io/badge/Conference-CYM%202026-orange)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?logo=scikit-learn&logoColor=white)
![spaCy](https://img.shields.io/badge/spaCy-09A3D5?logo=spacy&logoColor=white)
![Sentence Transformers](https://img.shields.io/badge/Sentence%20Transformers-FFD43B?logo=huggingface&logoColor=black)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-191919?logo=anthropic&logoColor=white)

---

## Research question

AI-assisted documentation systems can transform spontaneous speech into cleaner, more concise text.

ParaTrace asks:

> **When LLMs rewrite clinical speech at progressively stronger intervention levels, which cognitive-linguistic biomarkers are preserved, which are altered, and how do those changes affect downstream cognitive-status classification?**

The study treats LLM rewriting as a controlled linguistic intervention. The same feature extraction and downstream evaluation pipeline is applied to the original transcript and to each rewritten condition, allowing the effect of rewrite intensity to be measured systematically.

---

## The problem

Clinical documentation systems are designed to improve readability, structure, and efficiency.

Computational cognitive assessment can depend on a very different set of properties: the structure of spontaneous speech itself.

Features such as fillers, repetitions, lexical diversity, syntactic complexity, word-finding behavior, and discourse coherence can contribute measurable signal to cognitive-status classification. These are also features that an LLM may normalize when rewriting speech into polished clinical prose.

This creates a potential information-preservation problem:

> **A rewrite can preserve what a patient says while altering how it is expressed.**

If downstream models rely on the linguistic form of the original speech, semantic fidelity alone may not be sufficient to preserve the information those models use.

ParaTrace evaluates this failure mode directly by treating LLM rewriting as a controlled source of distribution shift over clinically relevant linguistic features.

The project does **not** test whether AI scribes impair real-world clinical diagnosis. It evaluates whether controlled LLM rewriting alters a defined linguistic feature representation and whether those changes degrade a downstream cognitive-status classifier.

---

## Pre-specified hypotheses

The hypotheses, experimental variables, evaluation procedure, and statistical tests were frozen on **August 18, 2026**, before the final analysis was completed.

The complete protocol, including the original quantitative thresholds, is available in [`protocol.md`](protocol.md).

### H1: Progressive biomarker degradation

Increasing rewrite intensity was expected to produce progressively larger deviations from the linguistic feature values observed in the original transcripts.

### H2: Semantic preservation with linguistic signal loss

Semantic content was expected to remain highly similar to the original transcript while stronger rewriting progressively altered linguistic features used by the downstream classifier.

### H3: Downstream classifier degradation

A classifier trained on features extracted from original L0 transcripts was expected to lose predictive performance when evaluated on progressively rewritten L1-L4 feature distributions.

### H4: Differential biomarker vulnerability

Fluency, repetition, and word-finding features were expected to be altered at lower intervention levels than semantic coherence and content-information features.

### H5: Cross-backend consistency

Similar degradation patterns were expected across the two evaluated LLM backends, which would provide evidence that the observed effect is not unique to a single provider.

These hypotheses are reported separately from the observed results. The exact frozen wording is preserved in [`protocol.md`](protocol.md).

---

## Experimental design

**Experimental Design Diagram []**






## Research question

Clinical documentation systems can transform spontaneous patient speech into cleaner and more concise text.

For cognitive-language analysis, however, properties that make spontaneous speech less fluent can also contain measurable information. These include repetition, fillers, syntactic simplification, lexical choice, discourse coherence, and word-finding behavior.

ParaTrace asks:

> **When LLMs rewrite clinical speech transcripts at progressive intervention levels, which cognitive-linguistic biomarkers survive, which are altered, and does that alteration degrade downstream cognitive-status classification?**

The project treats LLM rewriting as a controlled linguistic perturbation and measures how that perturbation propagates through a fixed downstream analysis pipeline.


---

## The problem

Ontario is deploying AI clinical scribes across its healthcare system (18 vendors approved, DAX Copilot piloting at The Ottawa Hospital) while Canada's National Dementia Strategy simultaneously prioritizes early detection through speech-based cognitive screening. These two priorities are on a collision course: AI scribes are designed to smooth out the exact speech patterns (fillers, repetitions, syntactic simplification, reduced coherence) that computational screening uses to detect cognitive decline. **No existing study has tested whether they are compatible.**

## What we found

We ran 552 clinically labeled transcripts from the DementiaBank Pitt Corpus through two LLM backends at four progressive intervention levels (4,416 total rewrites) and measured what happened to 20 linguistic biomarkers.

<img src="docs/degradation_curve.png" alt="Diagnostic Signal Erasure" width="700">

| Level | Description | Anthropic | OpenAI | Average |
|-------|------------|-----------|--------|---------|
| L0 | Original speech | 73.4% | 73.4% | 73.4% |
| L1 | Grammar correction | 78.1% | 74.8% | 76.5% |
| L2 | Light paraphrase | 65.9% | 58.7% | 62.3% |
| L3 | Moderate rewrite | 47.6% | 53.8% | 50.7% |
| L4 | Full reformulation | 53.8% | 49.6% | 51.7% |

At Level 4, both backends independently converged to chance (50%), confirming biomarker erasure is architecture-general. Wilcoxon testing showed 19 of 20 features significantly altered (p < 0.05) by Level 2.

<img src="docs/what_vs_how.png" alt="What vs How Gap" width="700">

Semantic similarity remained above 83% even as diagnostic accuracy collapsed. The AI preserved *what* patients said while erasing *how* they said it.

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