
"""
classifier.py -- Diagnostic classification and degradation analysis.

Trains classifiers on L0 (original) features, evaluates on L0-L4
(rewritten) features, and measures how diagnostic accuracy degrades
with AI intervention level.

Usage:
    # Step 1: Train baseline on L0 and report cross-val performance
    python classifier.py --mode baseline --features data/processed/features_L0.csv

    # Step 2: After rewrites are done and features extracted, run degradation
    python classifier.py --mode degrade --features-dir data/processed/ --output data/results/

    # Step 3: Compute BRR heatmap
    python classifier.py --mode brr --features-dir data/processed/ --output data/results/
"""

import argparse
import csv
import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Feature columns (must match extractor output) ──────────────────────
FEATURE_COLS = [
    "ttr", "mtld", "mattr",
    "content_word_repetition_rate", "bigram_repetition_rate", "unique_word_ratio",
    "local_coherence", "global_coherence", "coherence_variance",
    "mean_parse_depth", "mean_sentence_length", "clause_density",
    "idea_density",
    "filler_rate", "incomplete_word_rate", "mean_utterance_length",
    "brunets_w", "honores_r",
    "ciu_ratio", "pronoun_noun_ratio",
]

MODELS = {
    "random_forest": RandomForestClassifier(
        n_estimators=200, max_depth=10, random_state=42,
        class_weight="balanced",
    ),
    "gradient_boosting": GradientBoostingClassifier(
        n_estimators=150, max_depth=5, random_state=42,
    ),
    "logistic_regression": LogisticRegression(
        max_iter=1000, class_weight="balanced", random_state=42,
    ),
}


def load_features(path: str) -> pd.DataFrame:
    """Load a features CSV and handle missing values."""
    df = pd.read_csv(path)
    # Fill NaN with column median (some transcripts may have None for coherence etc)
    for col in FEATURE_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col] = df[col].fillna(df[col].median())
    return df


# ── Baseline: train and evaluate on L0 ─────────────────────────────────

def run_baseline(features_path: str) -> dict:
    """Train all models with stratified 5-fold CV on L0 features.
    Returns performance metrics for each model."""
    df = load_features(features_path)
    X = df[FEATURE_COLS].values
    le = LabelEncoder()
    y = le.fit_transform(df["diagnosis"])

    log.info("Classes: %s", list(le.classes_))
    log.info("Samples: %d (%s)", len(y), dict(zip(le.classes_, np.bincount(y))))

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = {}

    for name, model in MODELS.items():
        fold_acc, fold_f1, fold_bal = [], [], []

        for train_idx, test_idx in skf.split(X, y):
            scaler = StandardScaler()
            X_train = scaler.fit_transform(X[train_idx])
            X_test = scaler.transform(X[test_idx])
            y_train, y_test = y[train_idx], y[test_idx]

            model.fit(X_train, y_train)
            preds = model.predict(X_test)

            fold_acc.append(accuracy_score(y_test, preds))
            fold_f1.append(f1_score(y_test, preds, average="macro"))
            fold_bal.append(balanced_accuracy_score(y_test, preds))

        results[name] = {
            "accuracy": f"{np.mean(fold_acc):.3f} +/- {np.std(fold_acc):.3f}",
            "macro_f1": f"{np.mean(fold_f1):.3f} +/- {np.std(fold_f1):.3f}",
            "balanced_acc": f"{np.mean(fold_bal):.3f} +/- {np.std(fold_bal):.3f}",
            "accuracy_mean": float(np.mean(fold_acc)),
            "f1_mean": float(np.mean(fold_f1)),
        }
        log.info("  %s: acc=%s  F1=%s", name, results[name]["accuracy"], results[name]["macro_f1"])

    # Identify best model
    best = max(results, key=lambda k: results[k]["f1_mean"])
    log.info("Best model: %s (F1=%.3f)", best, results[best]["f1_mean"])

    # Feature importance from best tree model
    if best in ("random_forest", "gradient_boosting"):
        # Retrain on full data for feature importance
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        MODELS[best].fit(X_scaled, y)
        importances = MODELS[best].feature_importances_
        ranked = sorted(zip(FEATURE_COLS, importances), key=lambda x: -x[1])
        log.info("Feature importance ranking:")
        for feat, imp in ranked:
            log.info("    %-30s %.4f", feat, imp)

    return results


# ── Degradation: train on L0, test on L1-L4 ───────────────────────────

def run_degradation(features_dir: str, output_dir: str) -> dict:
    """Train best classifier on L0, evaluate on each rewrite level.
    Produces the diagnostic degradation curve."""
    features_dir = Path(features_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load L0
    df_l0 = load_features(str(features_dir / "features_L0.csv"))
    X_l0 = df_l0[FEATURE_COLS].values
    le = LabelEncoder()
    y = le.fit_transform(df_l0["diagnosis"])

    # Train best model on full L0
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_l0)

    # Use random forest as default (usually best on tabular data)
    model = RandomForestClassifier(
        n_estimators=200, max_depth=10, random_state=42,
        class_weight="balanced",
    )
    model.fit(X_train, y)

    # Evaluate on L0 (train set, for reference)
    preds_l0 = model.predict(X_train)
    log.info("L0 (train): acc=%.3f  F1=%.3f",
             accuracy_score(y, preds_l0),
             f1_score(y, preds_l0, average="macro"))

    # Evaluate on each level
    level_results = {"L0": {
        "accuracy": float(accuracy_score(y, preds_l0)),
        "macro_f1": float(f1_score(y, preds_l0, average="macro")),
        "balanced_acc": float(balanced_accuracy_score(y, preds_l0)),
    }}

    for level in range(1, 5):
        for backend in ["anthropic", "openai"]:
            feat_file = features_dir / f"features_L{level}_{backend}.csv"
            if not feat_file.exists():
                log.warning("  Missing: %s", feat_file)
                continue

            df_lx = load_features(str(feat_file))
            X_lx = scaler.transform(df_lx[FEATURE_COLS].values)
            preds = model.predict(X_lx)

            key = f"L{level}_{backend}"
            level_results[key] = {
                "accuracy": float(accuracy_score(y, preds)),
                "macro_f1": float(f1_score(y, preds, average="macro")),
                "balanced_acc": float(balanced_accuracy_score(y, preds)),
                "confusion_matrix": confusion_matrix(y, preds).tolist(),
            }
            log.info("  %s: acc=%.3f  F1=%.3f",
                     key,
                     level_results[key]["accuracy"],
                     level_results[key]["macro_f1"])

    # Save results
    out_file = output_dir / "degradation_results.json"
    with out_file.open("w") as f:
        json.dump(level_results, f, indent=2)
    log.info("Saved degradation results to %s", out_file)

    return level_results


# ── BRR: Biomarker Retention Ratio ─────────────────────────────────────

def compute_brr(features_dir: str, output_dir: str) -> dict:
    """Compute Biomarker Retention Ratio for each feature at each level.

    BRR = |d_level| / |d_original|
    where d is Cohen's d between Control and Dementia groups.
    BRR ~1 = signal preserved, ~0 = signal erased.
    """
    features_dir = Path(features_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    df_l0 = load_features(str(features_dir / "features_L0.csv"))

    def cohens_d(group1, group2):
        n1, n2 = len(group1), len(group2)
        var1, var2 = group1.var(), group2.var()
        pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
        if pooled_std == 0:
            return 0
        return (group1.mean() - group2.mean()) / pooled_std

    # Compute L0 effect sizes
    control_l0 = df_l0[df_l0["diagnosis"] == "Control"]
    dementia_l0 = df_l0[df_l0["diagnosis"] == "Dementia"]

    d_original = {}
    for feat in FEATURE_COLS:
        d_original[feat] = cohens_d(control_l0[feat], dementia_l0[feat])

    log.info("L0 effect sizes (Cohen's d):")
    for feat, d in sorted(d_original.items(), key=lambda x: -abs(x[1])):
        log.info("    %-30s d=%.3f", feat, d)

    # Compute BRR at each level
    brr_table = {}
    for level in range(1, 5):
        for backend in ["anthropic", "openai"]:
            feat_file = features_dir / f"features_L{level}_{backend}.csv"
            if not feat_file.exists():
                continue

            df_lx = load_features(str(feat_file))
            control_lx = df_lx[df_lx["diagnosis"] == "Control"]
            dementia_lx = df_lx[df_lx["diagnosis"] == "Dementia"]

            key = f"L{level}_{backend}"
            brr_table[key] = {}

            for feat in FEATURE_COLS:
                d_level = cohens_d(control_lx[feat], dementia_lx[feat])
                d_orig = d_original[feat]
                if abs(d_orig) < 0.01:
                    brr = 1.0  # feature didn't separate groups at baseline
                else:
                    brr = abs(d_level) / abs(d_orig)
                brr_table[key][feat] = round(brr, 3)

            log.info("  %s mean BRR: %.3f", key,
                     np.mean(list(brr_table[key].values())))

    # Save BRR table
    out_file = output_dir / "brr_heatmap.json"
    with out_file.open("w") as f:
        json.dump(brr_table, f, indent=2)
    log.info("Saved BRR heatmap to %s", out_file)

    return brr_table


# ── Per-feature statistical tests ──────────────────────────────────────

def run_stats(features_dir: str, output_dir: str) -> dict:
    """Wilcoxon signed-rank tests and Cohen's d for each feature
    comparing L0 to each rewrite level."""
    features_dir = Path(features_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    df_l0 = load_features(str(features_dir / "features_L0.csv"))
    results = {}

    for level in range(1, 5):
        for backend in ["anthropic", "openai"]:
            feat_file = features_dir / f"features_L{level}_{backend}.csv"
            if not feat_file.exists():
                continue

            df_lx = load_features(str(feat_file))
            key = f"L{level}_{backend}"
            results[key] = {}

            for feat in FEATURE_COLS:
                orig = df_l0[feat].values
                rewr = df_lx[feat].values

                # Paired Wilcoxon
                try:
                    stat, pval = stats.wilcoxon(orig, rewr)
                except Exception:
                    stat, pval = 0, 1.0

                # Cohen's d (paired)
                diff = orig - rewr
                d = np.mean(diff) / np.std(diff) if np.std(diff) > 0 else 0

                # Percentage change
                orig_mean = np.mean(orig)
                rewr_mean = np.mean(rewr)
                pct = ((rewr_mean - orig_mean) / abs(orig_mean) * 100) if orig_mean != 0 else 0

                results[key][feat] = {
                    "pct_change": round(float(pct), 2),
                    "cohens_d": round(float(d), 3),
                    "p_value": round(float(pval), 6),
                    "significant": pval < 0.05,
                }

            sig_count = sum(1 for f in results[key].values() if f["significant"])
            log.info("  %s: %d / %d features significantly changed",
                     key, sig_count, len(FEATURE_COLS))

    out_file = output_dir / "statistical_tests.json"
    with out_file.open("w") as f:
        json.dump(results, f, indent=2)
    log.info("Saved statistical tests to %s", out_file)

    return results


# ── CLI ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="ParaTrace classification and analysis pipeline."
    )
    parser.add_argument(
        "--mode",
        choices=["baseline", "degrade", "brr", "stats", "all"],
        required=True,
    )
    parser.add_argument("--features", default="data/processed/features_L0.csv")
    parser.add_argument("--features-dir", default="data/processed/")
    parser.add_argument("--output", default="data/results/")
    args = parser.parse_args()

    if args.mode == "baseline":
        results = run_baseline(args.features)
        print(json.dumps(results, indent=2))

    elif args.mode == "degrade":
        run_degradation(args.features_dir, args.output)

    elif args.mode == "brr":
        compute_brr(args.features_dir, args.output)

    elif args.mode == "stats":
        run_stats(args.features_dir, args.output)

    elif args.mode == "all":
        log.info("=== Baseline ===")
        run_baseline(args.features)
        log.info("=== Degradation ===")
        run_degradation(args.features_dir, args.output)
        log.info("=== BRR ===")
        compute_brr(args.features_dir, args.output)
        log.info("=== Stats ===")
        run_stats(args.features_dir, args.output)


if __name__ == "__main__":
    main()