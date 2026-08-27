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
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
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


def load_features_for_cv(path: str) -> pd.DataFrame:
    """Load features for CV without fitting preprocessing on held-out rows."""
    df = pd.read_csv(path)
    for col in FEATURE_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def participant_id_from_file(file_path: str) -> str:
    """Extract Pitt participant ID from names such as 002-3.cha -> 002."""
    stem = Path(file_path).stem
    if "-" not in stem:
        raise ValueError(f"Cannot extract participant ID from filename: {file_path}")
    participant_id, _visit = stem.rsplit("-", 1)
    if not participant_id:
        raise ValueError(f"Empty participant ID extracted from filename: {file_path}")
    return participant_id


def get_participant_groups(df: pd.DataFrame) -> np.ndarray:
    """Return one participant identifier per transcript row."""
    if "file" not in df.columns:
        raise ValueError(
            "Feature CSV must contain a 'file' column for participant-grouped CV."
        )
    groups = df["file"].map(participant_id_from_file).to_numpy()
    log.info(
        "Participant grouping: %d transcripts from %d unique participants",
        len(groups),
        len(set(groups)),
    )
    return groups


def assert_no_group_leakage(
    groups: np.ndarray,
    train_idx: np.ndarray,
    test_idx: np.ndarray,
) -> None:
    """Fail immediately if any participant appears in both train and test."""
    overlap = set(groups[train_idx]) & set(groups[test_idx])
    if overlap:
        raise RuntimeError(f"Participant leakage detected: {sorted(overlap)}")


# ── Baseline: train and evaluate on L0 ─────────────────────────────────

def run_baseline(features_path: str) -> dict:
    """Train all models with participant-grouped stratified 5-fold CV on L0."""
    df = load_features_for_cv(features_path)
    X = df[FEATURE_COLS].values
    le = LabelEncoder()
    y = le.fit_transform(df["diagnosis"])
    groups = get_participant_groups(df)

    log.info("Classes: %s", list(le.classes_))
    log.info("Samples: %d (%s)", len(y), dict(zip(le.classes_, np.bincount(y))))
    log.info("Unique participants: %d", len(set(groups)))

    cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    folds = list(cv.split(X, y, groups=groups))
    results = {}

    for fold, (train_idx, test_idx) in enumerate(folds, start=1):
        assert_no_group_leakage(groups, train_idx, test_idx)
        log.info(
            "Fold %d: %d train transcripts / %d test transcripts, "
            "%d train participants / %d test participants",
            fold,
            len(train_idx),
            len(test_idx),
            len(set(groups[train_idx])),
            len(set(groups[test_idx])),
        )

    for name, model in MODELS.items():
        fold_acc, fold_f1, fold_bal = [], [], []

        for train_idx, test_idx in folds:
            imputer = SimpleImputer(strategy="median")
            scaler = StandardScaler()

            X_train = imputer.fit_transform(X[train_idx])
            X_test = imputer.transform(X[test_idx])
            X_train = scaler.fit_transform(X_train)
            X_test = scaler.transform(X_test)
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
        imputer = SimpleImputer(strategy="median")
        scaler = StandardScaler()
        X_full = imputer.fit_transform(X)
        X_scaled = scaler.fit_transform(X_full)
        MODELS[best].fit(X_scaled, y)
        importances = MODELS[best].feature_importances_
        ranked = sorted(zip(FEATURE_COLS, importances), key=lambda x: -x[1])
        log.info("Feature importance ranking:")
        for feat, imp in ranked:
            log.info("    %-30s %.4f", feat, imp)

    return results


# ── Degradation: CV-aligned evaluation across L0-L4 ─────────────────

def run_degradation(features_dir: str, output_dir: str) -> dict:
    """Measure diagnostic accuracy at each rewrite level using cross-validation.

    Uses the same participant-grouped stratified 5-fold split for every level:
    each fold trains on L0 visits from the training participants and evaluates
    the exact same held-out participants at L0 and at every available rewrite
    level. Preprocessing is fitted only on L0 training data for each fold.
    """
    features_dir = Path(features_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load L0 without global imputation
    df_l0 = load_features_for_cv(str(features_dir / "features_L0.csv"))
    X_l0 = df_l0[FEATURE_COLS].values
    le = LabelEncoder()
    y = le.fit_transform(df_l0["diagnosis"])
    groups = get_participant_groups(df_l0)

    log.info("Classes: %s", list(le.classes_))
    log.info("Samples: %d", len(y))
    log.info("Unique participants: %d", len(set(groups)))

    # Pre-load rewrite-level feature matrices and align them to L0 by file.
    l0_files = df_l0["file"].tolist()
    rewrite_data: dict[str, np.ndarray] = {}

    for level in range(1, 5):
        for backend in ["anthropic", "openai"]:
            feat_file = features_dir / f"features_L{level}_{backend}.csv"
            if not feat_file.exists():
                log.warning("  Missing: %s", feat_file)
                continue

            df_lx = load_features_for_cv(str(feat_file))
            if "file" not in df_lx.columns:
                raise ValueError(f"{feat_file} does not contain a 'file' column")

            if df_lx["file"].duplicated().any():
                duplicates = df_lx.loc[df_lx["file"].duplicated(), "file"].tolist()
                raise ValueError(f"Duplicate files in {feat_file}: {duplicates[:10]}")

            indexed = df_lx.set_index("file")
            missing = [file_name for file_name in l0_files if file_name not in indexed.index]
            if missing:
                raise ValueError(
                    f"{feat_file} is missing {len(missing)} L0 transcripts. "
                    f"Examples: {missing[:5]}"
                )

            aligned = indexed.loc[l0_files]
            if not np.array_equal(
                aligned["diagnosis"].to_numpy(),
                df_l0["diagnosis"].to_numpy(),
            ):
                raise ValueError(f"Diagnosis alignment mismatch in {feat_file}")

            rewrite_data[f"L{level}_{backend}"] = aligned[FEATURE_COLS].to_numpy()

    # Collect out-of-fold predictions per level
    # key -> list of (y_true, y_pred) across all folds
    all_preds: dict[str, tuple[list, list]] = {"L0": ([], [])}
    for key in rewrite_data:
        all_preds[key] = ([], [])

    cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    folds = list(cv.split(X_l0, y, groups=groups))

    for fold, (train_idx, test_idx) in enumerate(folds, start=1):
        assert_no_group_leakage(groups, train_idx, test_idx)

        imputer = SimpleImputer(strategy="median")
        scaler = StandardScaler()

        X_train = imputer.fit_transform(X_l0[train_idx])
        X_train = scaler.fit_transform(X_train)
        y_train = y[train_idx]

        model = RandomForestClassifier(
            n_estimators=200, max_depth=10, random_state=42,
            class_weight="balanced",
        )
        model.fit(X_train, y_train)

        # Evaluate held-out L0 rows
        X_test_l0 = imputer.transform(X_l0[test_idx])
        X_test_l0 = scaler.transform(X_test_l0)
        preds_l0 = model.predict(X_test_l0)
        all_preds["L0"][0].extend(y[test_idx].tolist())
        all_preds["L0"][1].extend(preds_l0.tolist())

        # Evaluate the same held-out participants at each rewrite level
        for key, X_full in rewrite_data.items():
            X_test_lx = imputer.transform(X_full[test_idx])
            X_test_lx = scaler.transform(X_test_lx)
            preds_lx = model.predict(X_test_lx)
            all_preds[key][0].extend(y[test_idx].tolist())
            all_preds[key][1].extend(preds_lx.tolist())

        log.info("  Fold %d complete", fold)

    # Aggregate results
    level_results = {}
    for key, (y_true, y_pred) in all_preds.items():
        y_true_arr = np.array(y_true)
        y_pred_arr = np.array(y_pred)
        level_results[key] = {
            "accuracy": float(accuracy_score(y_true_arr, y_pred_arr)),
            "macro_f1": float(f1_score(y_true_arr, y_pred_arr, average="macro")),
            "balanced_acc": float(balanced_accuracy_score(y_true_arr, y_pred_arr)),
            "confusion_matrix": confusion_matrix(y_true_arr, y_pred_arr).tolist(),
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

def _benjamini_hochberg(p_values: list[float], alpha: float = 0.05) -> list[bool]:
    """Benjamini-Hochberg FDR correction. Returns a boolean mask of which
    tests remain significant after controlling the false discovery rate."""
    n = len(p_values)
    if n == 0:
        return []
    indexed = sorted(enumerate(p_values), key=lambda x: x[1])
    significant = [False] * n
    # Walk from largest to smallest p-value, tracking the running threshold
    prev_significant = False
    for rank_minus_1 in range(n - 1, -1, -1):
        orig_idx, pval = indexed[rank_minus_1]
        rank = rank_minus_1 + 1
        threshold = (rank / n) * alpha
        if pval <= threshold or prev_significant:
            significant[orig_idx] = True
            prev_significant = True
    return significant


def run_stats(features_dir: str, output_dir: str) -> dict:
    """Wilcoxon signed-rank tests and Cohen's d for each feature
    comparing L0 to each rewrite level.

    Applies Benjamini-Hochberg FDR correction across all tests within
    each level-backend group (20 features) to control for multiple
    comparisons. Both the raw p-value and the FDR-corrected significance
    flag are reported.
    """
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

            # First pass: compute raw p-values and effect sizes
            raw_results = []
            for feat in FEATURE_COLS:
                orig = df_l0[feat].values
                rewr = df_lx[feat].values

                # Paired Wilcoxon
                diff = orig - rewr
                if np.allclose(diff, 0.0):
                    # Wilcoxon is undefined when every paired difference is zero.
                    stat, pval = 0.0, 1.0
                else:
                    try:
                        stat, pval = stats.wilcoxon(orig, rewr)
                        if not np.isfinite(pval):
                            stat, pval = 0.0, 1.0
                    except Exception:
                        stat, pval = 0.0, 1.0

                # Cohen's d (paired)
                d = np.mean(diff) / np.std(diff) if np.std(diff) > 0 else 0

                # Percentage change
                orig_mean = np.mean(orig)
                rewr_mean = np.mean(rewr)
                pct = ((rewr_mean - orig_mean) / abs(orig_mean) * 100) if orig_mean != 0 else 0

                raw_results.append({
                    "feat": feat,
                    "pct_change": round(float(pct), 2),
                    "cohens_d": round(float(d), 3),
                    # Keep full precision internally for hypothesis testing.
                    "p_value": float(pval),
                    "significant_raw": bool(pval < 0.05),
                })

            # Second pass: apply Benjamini-Hochberg correction to unrounded p-values.
            p_values = [r["p_value"] for r in raw_results]
            bh_mask = _benjamini_hochberg(p_values, alpha=0.05)

            results[key] = {}
            for r, sig_bh in zip(raw_results, bh_mask):
                results[key][r["feat"]] = {
                    "pct_change": r["pct_change"],
                    "cohens_d": r["cohens_d"],
                    # Round only for serialized output, after BH correction.
                    "p_value": round(r["p_value"], 6),
                    "significant_raw": r["significant_raw"],
                    "significant": bool(sig_bh),  # FDR-corrected
                }

            sig_raw = sum(1 for r in raw_results if r["significant_raw"])
            sig_bh = sum(1 for s in bh_mask if s)
            log.info("  %s: %d / %d significant (raw), %d / %d (BH-corrected)",
                     key, sig_raw, len(FEATURE_COLS), sig_bh, len(FEATURE_COLS))

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