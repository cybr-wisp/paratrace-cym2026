"""
cohere_eval.py -- Evaluate Cohere embed-english-v3.0 as an embedding backend
for ParaTrace diagnostic classification.

Replaces sentence-transformers/all-MiniLM-L6-v2 with Cohere's Embed API
for the semantic coherence features, then re-runs the diagnostic classifier
to measure whether Cohere embeddings preserve more (or less) diagnostic
signal across LLM rewriting levels.

Usage:
    python experiments/cohere_eval.py \
        --transcripts data/processed/transcripts.csv \
        --rewrites-dir data/rewrites \
        --features-dir data/processed \
        --output data/results/cohere_eval_results.json

Requires:
    pip install cohere scikit-learn numpy pandas scipy python-dotenv
    COHERE_API_KEY in .env or environment
"""

import argparse
import csv
import json
import logging
import os
import time
from pathlib import Path

import cohere
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from scipy.spatial.distance import cosine
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, balanced_accuracy_score
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Cohere client ─────────────────────────────────────────────────────

co = cohere.ClientV2(api_key=os.getenv("COHERE_API_KEY"))
EMBED_MODEL = "embed-english-v3.0"

# ── Feature columns from the existing pipeline ───────────────────────

BASELINE_FEATURE_COLS = [
    "ttr", "mtld", "mattr",
    "content_word_repetition_rate", "bigram_repetition_rate", "unique_word_ratio",
    "local_coherence", "global_coherence", "coherence_variance",
    "mean_parse_depth", "mean_sentence_length", "clause_density",
    "idea_density",
    "filler_rate", "incomplete_word_rate", "mean_utterance_length",
    "brunets_w", "honores_r",
    "ciu_ratio", "pronoun_noun_ratio",
]

# The 3 coherence features we're replacing with Cohere embeddings
COHERENCE_COLS = ["local_coherence", "global_coherence", "coherence_variance"]


# ── Cohere embedding helpers ──────────────────────────────────────────

def embed_texts(texts: list[str], input_type: str = "search_document") -> np.ndarray:
    """Embed a batch of texts using Cohere embed-english-v3.0.

    Cohere's batch limit is 96 texts per call, so we chunk if needed.
    Rate-limits are handled with simple backoff.
    """
    all_embeddings = []
    batch_size = 96

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        # Filter empty strings (Cohere rejects them)
        batch = [t if t.strip() else "." for t in batch]

        for attempt in range(3):
            try:
                response = co.embed(
                    texts=batch,
                    model=EMBED_MODEL,
                    input_type=input_type,
                    embedding_types=["float"],
                )
                all_embeddings.extend(response.embeddings.float_)
                break
            except Exception as e:
                if attempt < 2:
                    wait = 2 ** (attempt + 1)
                    log.warning("Cohere API error: %s. Retrying in %ds...", e, wait)
                    time.sleep(wait)
                else:
                    raise

        if i + batch_size < len(texts):
            time.sleep(0.5)  # Respect rate limits

    return np.array(all_embeddings)


def cohere_coherence(sentences: list[str]) -> dict:
    """Compute local/global coherence using Cohere embeddings.

    Drop-in replacement for extractor.semantic_coherence() but
    using Cohere embed-english-v3.0 instead of all-MiniLM-L6-v2.
    """
    if len(sentences) < 2:
        return {
            "cohere_local_coherence": None,
            "cohere_global_coherence": None,
            "cohere_coherence_variance": None,
        }

    embeddings = embed_texts(sentences)

    # Local: mean cosine similarity between consecutive sentences
    local_sims = []
    for i in range(len(embeddings) - 1):
        sim = 1 - cosine(embeddings[i], embeddings[i + 1])
        if not np.isnan(sim):
            local_sims.append(sim)

    # Global: each sentence vs centroid
    mean_emb = np.mean(embeddings, axis=0)
    global_sims = []
    for emb in embeddings:
        sim = 1 - cosine(emb, mean_emb)
        if not np.isnan(sim):
            global_sims.append(sim)

    return {
        "cohere_local_coherence": float(np.mean(local_sims)) if local_sims else None,
        "cohere_global_coherence": float(np.mean(global_sims)) if global_sims else None,
        "cohere_coherence_variance": float(np.var(local_sims)) if local_sims else None,
    }


# ── Semantic similarity between original and rewrite ──────────────────

def compute_semantic_similarity(originals: list[str], rewrites: list[str]) -> list[float]:
    """Embed originals and rewrites with Cohere, return pairwise cosine similarities."""
    log.info("Embedding %d originals...", len(originals))
    orig_embs = embed_texts(originals, input_type="search_document")

    log.info("Embedding %d rewrites...", len(rewrites))
    rewrite_embs = embed_texts(rewrites, input_type="search_document")

    sims = []
    for o, r in zip(orig_embs, rewrite_embs):
        sim = 1 - cosine(o, r)
        sims.append(float(sim) if not np.isnan(sim) else 0.0)

    return sims


# ── Classification with swapped coherence features ───────────────────

def classify_with_cohere_features(
    features_path: str,
    transcripts_path: str,
) -> dict:
    """Re-run the diagnostic classifier after replacing sentence-transformers
    coherence features with Cohere-derived ones.

    Returns accuracy, F1, balanced accuracy for comparison against baseline.
    """
    df = pd.read_csv(features_path)

    # Load transcripts to recompute coherence with Cohere
    transcripts = pd.read_csv(transcripts_path)

    log.info("Recomputing coherence features with Cohere for %d transcripts...", len(transcripts))

    cohere_features = []
    for i, row in transcripts.iterrows():
        utterances = json.loads(row["utterances"])
        # Use utterances as sentences for coherence
        sentences = [u.strip() for u in utterances if u.strip()]
        feat = cohere_coherence(sentences)
        cohere_features.append(feat)

        if (i + 1) % 50 == 0:
            log.info("  %d / %d done", i + 1, len(transcripts))

    cohere_df = pd.DataFrame(cohere_features)

    # Replace the 3 coherence columns with Cohere versions
    feature_cols = BASELINE_FEATURE_COLS.copy()
    for old, new in [
        ("local_coherence", "cohere_local_coherence"),
        ("global_coherence", "cohere_global_coherence"),
        ("coherence_variance", "cohere_coherence_variance"),
    ]:
        df[old] = cohere_df[new].values
        # Keep the same column name so the classifier code stays identical

    # Prepare X, y
    for col in feature_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    X = df[feature_cols].values
    y = LabelEncoder().fit_transform(df["diagnosis"])

    # Impute + scale
    imputer = SimpleImputer(strategy="median")
    X = imputer.fit_transform(X)
    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    # Stratified 5-fold CV with Random Forest (matches existing pipeline)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    clf = RandomForestClassifier(
        n_estimators=200, max_depth=10, random_state=42, class_weight="balanced"
    )

    accs, f1s, bal_accs = [], [], []
    for train_idx, test_idx in skf.split(X, y):
        clf.fit(X[train_idx], y[train_idx])
        preds = clf.predict(X[test_idx])
        accs.append(accuracy_score(y[test_idx], preds))
        f1s.append(f1_score(y[test_idx], preds, average="macro"))
        bal_accs.append(balanced_accuracy_score(y[test_idx], preds))

    return {
        "accuracy": float(np.mean(accs)),
        "accuracy_std": float(np.std(accs)),
        "macro_f1": float(np.mean(f1s)),
        "macro_f1_std": float(np.std(f1s)),
        "balanced_acc": float(np.mean(bal_accs)),
        "balanced_acc_std": float(np.std(bal_accs)),
    }


# ── Main ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Evaluate Cohere embeddings as a drop-in replacement for "
                    "sentence-transformers in the ParaTrace diagnostic pipeline."
    )
    parser.add_argument(
        "--transcripts",
        default="data/processed/transcripts.csv",
        help="Original transcripts CSV (file, diagnosis, text, utterances)",
    )
    parser.add_argument(
        "--features-dir",
        default="data/processed",
        help="Directory containing features_L0.csv through features_L4_*.csv",
    )
    parser.add_argument(
        "--rewrites-dir",
        default="data/rewrites",
        help="Directory containing rewritten transcript CSVs",
    )
    parser.add_argument(
        "--output",
        default="data/results/cohere_eval_results.json",
        help="Output JSON with comparison results",
    )
    args = parser.parse_args()

    results = {
        "embedding_model": EMBED_MODEL,
        "baseline_model": "sentence-transformers/all-MiniLM-L6-v2",
        "description": (
            "Comparison of Cohere embed-english-v3.0 vs all-MiniLM-L6-v2 "
            "as the coherence embedding backend for ParaTrace diagnostic "
            "classification. Same 20 biomarker features, same RF classifier, "
            "same stratified 5-fold CV -- only the 3 coherence features differ."
        ),
    }

    transcripts_path = Path(args.transcripts)
    features_dir = Path(args.features_dir)

    # ── Part 1: Classification comparison on L0 ──────────────────────
    features_l0 = features_dir / "features_L0.csv"
    if features_l0.exists() and transcripts_path.exists():
        log.info("=== Part 1: Classification with Cohere coherence (L0) ===")
        cohere_results = classify_with_cohere_features(
            str(features_l0), str(transcripts_path)
        )
        results["classification_L0_cohere"] = cohere_results

        # Load baseline for comparison
        baseline_results_path = Path("data/results/paratrace_final_results.json")
        if baseline_results_path.exists():
            with open(baseline_results_path) as f:
                baseline = json.load(f)
            if "baseline_cv" in baseline:
                results["classification_L0_baseline"] = baseline["baseline_cv"]
            log.info(
                "Cohere L0 accuracy: %.1f%% vs baseline: %.1f%%",
                cohere_results["accuracy"] * 100,
                baseline.get("baseline_cv", {}).get("accuracy", 0) * 100,
            )
    else:
        log.warning(
            "Skipping classification -- missing %s or %s",
            features_l0, transcripts_path,
        )

    # ── Part 2: Semantic similarity (original vs rewrites) ───────────
    rewrites_dir = Path(args.rewrites_dir)
    if transcripts_path.exists() and rewrites_dir.exists():
        log.info("=== Part 2: Cohere semantic similarity across levels ===")
        transcripts_df = pd.read_csv(transcripts_path)
        originals = transcripts_df["text"].tolist()

        similarity_results = {}
        for rewrite_file in sorted(rewrites_dir.glob("*.csv")):
            level_name = rewrite_file.stem  # e.g., "L2_anthropic"
            rewrite_df = pd.read_csv(rewrite_file)

            if "rewritten_text" in rewrite_df.columns:
                rewrites = rewrite_df["rewritten_text"].tolist()
            elif "text" in rewrite_df.columns:
                rewrites = rewrite_df["text"].tolist()
            else:
                log.warning("No text column in %s, skipping", rewrite_file)
                continue

            if len(rewrites) != len(originals):
                log.warning(
                    "Row count mismatch for %s (%d vs %d), skipping",
                    level_name, len(rewrites), len(originals),
                )
                continue

            sims = compute_semantic_similarity(originals, rewrites)
            similarity_results[level_name] = {
                "mean_similarity": float(np.mean(sims)),
                "std_similarity": float(np.std(sims)),
                "min_similarity": float(np.min(sims)),
                "median_similarity": float(np.median(sims)),
            }
            log.info(
                "  %s: mean similarity = %.4f",
                level_name, np.mean(sims),
            )

        results["semantic_similarity_cohere"] = similarity_results
    else:
        log.warning("Skipping similarity -- missing transcripts or rewrites dir")

    # ── Save results ─────────────────────────────────────────────────
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    log.info("Results written to %s", output_path)


if __name__ == "__main__":
    main()
