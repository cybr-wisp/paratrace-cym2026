# Cohere Embedding Evaluation

Evaluates [Cohere's `embed-english-v3.0`](https://docs.cohere.com/docs/cohere-embed) as a
drop-in replacement for `sentence-transformers/all-MiniLM-L6-v2` in the ParaTrace diagnostic
pipeline.

## What this tests

The ParaTrace pipeline uses sentence embeddings for 3 of its 20 biomarker features
(local coherence, global coherence, coherence variance). This experiment swaps the
embedding backend from the open-source MiniLM model to Cohere's production Embed API
and measures whether diagnostic classification accuracy changes.

Two comparisons:

1. **Classification probe**: Same 20 features, same Random Forest, same stratified
   5-fold CV. Only the 3 coherence features differ (Cohere vs MiniLM embeddings).
   If Cohere embeddings capture richer inter-sentence relationships, diagnostic
   accuracy on L0 (original transcripts) should improve.

2. **Semantic similarity across rewriting levels**: Embed original and rewritten
   transcripts with Cohere, compute pairwise cosine similarity. This tests whether
   Cohere's model agrees with MiniLM that semantic content is preserved (>83%
   similarity) even as diagnostic accuracy collapses.

## Setup

```bash
pip install cohere python-dotenv

# Add to .env:
echo "COHERE_API_KEY=your_key_here" >> .env
```

## Run

```bash
python experiments/cohere_eval.py \
    --transcripts data/processed/transcripts.csv \
    --features-dir data/processed \
    --rewrites-dir data/rewrites \
    --output data/results/cohere_eval_results.json
```

## Expected output

```json
{
  "embedding_model": "embed-english-v3.0",
  "baseline_model": "sentence-transformers/all-MiniLM-L6-v2",
  "classification_L0_cohere": {
    "accuracy": 0.734,
    "macro_f1": 0.731
  },
  "semantic_similarity_cohere": {
    "L1_anthropic": { "mean_similarity": 0.92 },
    "L4_anthropic": { "mean_similarity": 0.84 }
  }
}
```

The key finding to watch: does Cohere's model also show >83% semantic similarity
at L4 while diagnostic accuracy is at chance? If yes, it confirms that the
"what vs how" gap is embedding-architecture-general, not an artifact of MiniLM.
