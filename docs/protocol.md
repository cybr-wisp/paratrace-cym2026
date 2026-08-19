

# ParaTrace -- Experimental Protocol

**Frozen: August 18, 2026**
**Do not modify hypotheses after results are observed.**

---

## Research Question

When LLMs rewrite clinical speech transcripts at progressive intervention
levels, which cognitive-linguistic biomarkers survive, which are erased,
and does the erasure degrade downstream diagnostic classification?

## Dataset

- DementiaBank Pitt Corpus, Cookie Theft picture description task
- 552 transcripts: 243 Control, 309 Dementia
- Binary classification (Healthy vs Dementia)
- Chance level: 50%

## Experimental Variables

**Independent variable:** AI rewrite intervention level
- L0: Original (baseline, no modification)
- L1: Grammar correction (fix spelling/grammar only, preserve all disfluencies)
- L2: Light paraphrase (remove fillers, smooth phrasing, keep vocabulary level)
- L3: Moderate rewrite (restructure, improve vocabulary, remove repetition)
- L4: Full reformulation (complete professional rewrite)

**LLM backends:** GPT-4o-mini (OpenAI), Claude Sonnet 4.6 (Anthropic)
**Temperature:** 0.3 (low, for consistency)

**Dependent variables:**
- 20 linguistic biomarker features across 8 categories
- Binary classification accuracy (Healthy vs Dementia)
- Biomarker Retention Ratio (BRR) per feature per level

## Biomarker Categories (8 categories, 20 features)

1. Lexical diversity: TTR, MTLD, MATTR
2. Repetition frequency: content word repetition rate, bigram repetition rate, unique word ratio
3. Semantic coherence: local coherence, global coherence, coherence variance
4. Syntactic complexity: mean parse depth, mean sentence length, clause density
5. Propositional density: idea density
6. Word-finding difficulty: filler rate, incomplete word rate, mean utterance length
7. Vocabulary sophistication: Brunet's W, Honore's R
8. Content information units: CIU ratio, pronoun-to-noun ratio

## Hypotheses

**H1 -- Monotonic degradation:**
Lexical and syntactic biomarker values will shift monotonically from L0
to L4, with each successive level producing greater deviation from
original values.

**H2 -- What vs How gap:**
Semantic content similarity between original and rewritten transcripts
will remain above 0.90 at all levels, while diagnostic classification
accuracy will drop below 0.60 by L3-L4. AI preserves what someone says
while erasing how they say it.

**H3 -- Classifier degradation:**
A classifier trained on L0 (original) features will show monotonically
decreasing accuracy when evaluated on L1-L4 features. At L4, accuracy
will approach chance (50% for binary classification).

**H4 -- Differential vulnerability:**
Word-finding difficulty markers (filler rate, incomplete word rate) and
repetition frequency will be the most vulnerable biomarker families,
showing significant degradation even at L1. Semantic coherence and
content information units will be the most resilient, surviving until
L3-L4.

**H5 -- Cross-architecture consistency:**
The biomarker erasure pattern will be consistent across both LLM
backends (GPT-4o-mini and Claude Sonnet), indicating this is a
structural property of LLM text generation, not a vendor-specific
artifact.

## Classification Methodology

- Models: Random Forest (200 trees), Gradient Boosting (150 trees), Logistic Regression
- Evaluation: Stratified 5-fold cross-validation
- Split unit: participant ID (never split sentences from the same participant across folds)
- Metrics: accuracy, macro F1, balanced accuracy, confusion matrix
- Key experiment: train on L0, evaluate on L1-L4

## Statistical Tests

- Wilcoxon signed-rank test: per-feature shift from L0 to each level
- Cohen's d: effect size of shift
- Biomarker Retention Ratio (BRR): d_level / d_original per feature
- Multiple comparison correction where appropriate

## Proposed Solution

Pre-extraction architecture: extract biomarkers from raw speech BEFORE
AI rewriting, not after. The clinical record stores three artifacts:
1. Raw transcript (archived, not shown to clinician)
2. AI-polished clinical note (what the clinician reads)
3. Biomarker profile (extracted pre-rewrite, 100% signal preserved)

This experiment provides the evidence base for why this architecture
is necessary.

## Ethical Considerations

- DementiaBank data is access-controlled; no raw transcripts in the public repo
- This project audits AI safety, not builds a diagnostic tool
- No clinical claims beyond what the dataset and experiment support
- Aggregate results only in public outputs; no individual re-identification risk