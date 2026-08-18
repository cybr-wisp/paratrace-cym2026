"""
extractor.py -- Linguistic biomarker feature extraction engine.

Takes a transcript (text + utterances) and returns 20 numerical features
across 8 biomarker categories. Three library calls (spaCy, sentence-
transformers, lexicalrichness), then arithmetic.

Usage:
    python extractor.py --input data/processed/transcripts.csv --output data/processed/features_L0.csv
"""

import argparse
import csv
import json
import logging
import math
import re
from collections import Counter
from pathlib import Path

import numpy as np
import spacy
from lexicalrichness import LexicalRichness
from scipy.spatial.distance import cosine
from sentence_transformers import SentenceTransformer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Load models once ───────────────────────────────────────────────────
log.info("Loading spaCy model...")
nlp = spacy.load("en_core_web_sm")

log.info("Loading sentence-transformers model...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

FEATURE_NAMES = [
    # Lexical diversity (3)
    "ttr", "mtld", "mattr",
    # Repetition (3)
    "content_word_repetition_rate", "bigram_repetition_rate", "unique_word_ratio",
    # Semantic coherence (3)
    "local_coherence", "global_coherence", "coherence_variance",
    # Syntactic complexity (3)
    "mean_parse_depth", "mean_sentence_length", "clause_density",
    # Idea density (1)
    "idea_density",
    # Word-finding difficulty (3)
    "filler_rate", "incomplete_word_rate", "mean_utterance_length",
    # Vocabulary sophistication (2)
    "brunets_w", "honores_r",
    # Content information units (2)
    "ciu_ratio", "pronoun_noun_ratio",
]


# ── Biomarker 1: Lexical Diversity ─────────────────────────────────────

def lexical_diversity(text: str) -> dict:
    """TTR, MTLD, MATTR from raw text."""
    words = text.split()
    if len(words) < 5:
        return {"ttr": None, "mtld": None, "mattr": None}

    try:
        lex = LexicalRichness(text)
        ttr = lex.ttr
        mtld = lex.mtld(threshold=0.72)
        mattr = lex.mattr(window_size=25) if len(words) > 25 else ttr
    except Exception:
        return {"ttr": None, "mtld": None, "mattr": None}

    return {"ttr": ttr, "mtld": mtld, "mattr": mattr}


# ── Biomarker 2: Repetition Frequency ──────────────────────────────────

def repetition(doc) -> dict:
    """Content word repetition rate, bigram repetition, unique word ratio."""
    # Content words: nouns, verbs, adjectives (not stop words)
    content_words = [
        t.text.lower() for t in doc
        if t.pos_ in ("NOUN", "VERB", "ADJ") and not t.is_stop and t.is_alpha
    ]
    all_words = [t.text.lower() for t in doc if t.is_alpha]

    if not content_words or not all_words:
        return {
            "content_word_repetition_rate": None,
            "bigram_repetition_rate": None,
            "unique_word_ratio": None,
        }

    # Proportion of content words appearing more than once
    content_counts = Counter(content_words)
    repeated = sum(1 for w, c in content_counts.items() if c > 1)
    total_unique_content = len(content_counts) if content_counts else 1

    # Bigram repetition
    bigrams = list(zip(all_words[:-1], all_words[1:]))
    bigram_counts = Counter(bigrams)
    repeated_bigrams = sum(1 for b, c in bigram_counts.items() if c > 1)

    return {
        "content_word_repetition_rate": repeated / max(total_unique_content, 1),
        "bigram_repetition_rate": repeated_bigrams / max(len(bigram_counts), 1),
        "unique_word_ratio": len(set(all_words)) / max(len(all_words), 1),
    }


# ── Biomarker 3: Semantic Coherence ────────────────────────────────────

def semantic_coherence(sentences: list[str]) -> dict:
    """Local/global coherence and variance from sentence embeddings."""
    if len(sentences) < 2:
        return {
            "local_coherence": None,
            "global_coherence": None,
            "coherence_variance": None,
        }

    embeddings = embedder.encode(sentences)

    # Local: mean cosine similarity between consecutive sentences
    local_sims = []
    for i in range(len(embeddings) - 1):
        sim = 1 - cosine(embeddings[i], embeddings[i + 1])
        if not np.isnan(sim):
            local_sims.append(sim)

    # Global: each sentence vs mean embedding (topic centroid)
    mean_emb = np.mean(embeddings, axis=0)
    global_sims = []
    for emb in embeddings:
        sim = 1 - cosine(emb, mean_emb)
        if not np.isnan(sim):
            global_sims.append(sim)

    return {
        "local_coherence": float(np.mean(local_sims)) if local_sims else None,
        "global_coherence": float(np.mean(global_sims)) if global_sims else None,
        "coherence_variance": float(np.var(local_sims)) if local_sims else None,
    }


# ── Biomarker 4: Syntactic Complexity ──────────────────────────────────

def syntactic_complexity(doc) -> dict:
    """Parse tree depth, sentence length, clause density."""
    sentences = list(doc.sents)
    if not sentences:
        return {
            "mean_parse_depth": None,
            "mean_sentence_length": None,
            "clause_density": None,
        }

    def tree_depth(token):
        depth = 0
        while token.head != token:
            depth += 1
            token = token.head
        return depth

    depths = []
    lengths = []
    for sent in sentences:
        tokens = list(sent)
        if tokens:
            max_depth = max(tree_depth(t) for t in tokens)
            depths.append(max_depth)
            lengths.append(len(tokens))

    # Clause density: subordinate clause markers per sentence
    clause_labels = {"advcl", "relcl", "ccomp", "xcomp", "acl"}
    clause_count = sum(1 for t in doc if t.dep_ in clause_labels)

    return {
        "mean_parse_depth": float(np.mean(depths)) if depths else None,
        "mean_sentence_length": float(np.mean(lengths)) if lengths else None,
        "clause_density": clause_count / max(len(sentences), 1),
    }


# ── Biomarker 5: Idea Density ─────────────────────────────────────────

def idea_density(doc) -> dict:
    """Ratio of open-class words to total words."""
    open_class = sum(
        1 for t in doc
        if t.pos_ in ("NOUN", "VERB", "ADJ", "ADV") and not t.is_stop
    )
    total = sum(1 for t in doc if t.is_alpha)
    return {"idea_density": open_class / max(total, 1)}


# ── Biomarker 6: Word-Finding Difficulty ──────────────────────────────

def word_finding_difficulty(text: str, utterances: list[str]) -> dict:
    """Filler rate, incomplete word rate, mean utterance length."""
    words = text.split()
    total = max(len(words), 1)

    # Fillers
    filler_pattern = r"\b(um|uh|er|ah|hm|hmm|mhm|like|you know|I mean)\b"
    fillers = len(re.findall(filler_pattern, text, re.IGNORECASE))

    # Incomplete words (fragments marked with trailing hyphen by parser)
    incomplete = sum(1 for w in words if w.endswith("-"))

    # Mean utterance length
    utt_lengths = [len(u.split()) for u in utterances if u.strip()]
    mean_utt_len = float(np.mean(utt_lengths)) if utt_lengths else 0.0

    return {
        "filler_rate": fillers / total,
        "incomplete_word_rate": incomplete / total,
        "mean_utterance_length": mean_utt_len,
    }


# ── Biomarker 7: Vocabulary Sophistication ────────────────────────────

def vocab_sophistication(doc) -> dict:
    """Brunet's W and Honore's R."""
    words = [t.text.lower() for t in doc if t.is_alpha and not t.is_stop]
    n = len(words)
    v = len(set(words))

    if n < 5 or v < 2:
        return {"brunets_w": None, "honores_r": None}

    # Brunet's W: N^(V^-0.172) -- lower = richer
    brunets_w = n ** (v ** -0.172)

    # Honore's R: 100 * log(N) / (1 - V1/V)
    # V1 = words appearing exactly once (hapax legomena)
    counts = Counter(words)
    v1 = sum(1 for w, c in counts.items() if c == 1)

    if v1 >= v:
        # All words are unique, formula breaks down
        honores_r = 0.0
    else:
        honores_r = 100 * math.log(n) / max(1 - (v1 / v), 0.001)

    return {"brunets_w": brunets_w, "honores_r": honores_r}


# ── Biomarker 8: Content Information Units ────────────────────────────

def content_units(doc) -> dict:
    """CIU ratio and pronoun-to-noun ratio."""
    content = sum(
        1 for t in doc
        if t.pos_ in ("NOUN", "VERB", "ADJ", "ADV", "PROPN")
        and not t.is_stop
    )
    total = sum(1 for t in doc if t.is_alpha)

    nouns = sum(1 for t in doc if t.pos_ in ("NOUN", "PROPN"))
    pronouns = sum(1 for t in doc if t.pos_ == "PRON")

    return {
        "ciu_ratio": content / max(total, 1),
        "pronoun_noun_ratio": pronouns / max(nouns, 1),
    }


# ── Main extraction function ──────────────────────────────────────────

def extract_all(text: str, utterances: list[str]) -> dict:
    """Extract all 20 biomarker features from one transcript.

    Three library calls, then arithmetic:
        1. spaCy parse (POS, deps, sentences)
        2. sentence-transformers embeddings (coherence)
        3. lexicalrichness (TTR, MTLD, MATTR)
    """
    # Call 1: spaCy
    # Add periods between utterances so spaCy finds sentence boundaries
    text_with_periods = ". ".join(utterances) + "."
    doc = nlp(text_with_periods)
    sentences = [s.text.strip() for s in doc.sents if s.text.strip()]

    # Build feature dict
    features = {}
    features.update(lexical_diversity(text))                    # 3
    features.update(repetition(doc))                            # 3
    features.update(semantic_coherence(sentences))              # 3
    features.update(syntactic_complexity(doc))                  # 3
    features.update(idea_density(doc))                          # 1
    features.update(word_finding_difficulty(text, utterances))  # 3
    features.update(vocab_sophistication(doc))                  # 2
    features.update(content_units(doc))                         # 2

    return features  # 20 features


# ── Batch processing ──────────────────────────────────────────────────

def process_corpus(input_csv: str, output_csv: str) -> None:
    """Read transcripts.csv, extract features for each row, write features CSV."""
    input_path = Path(input_csv)
    output_path = Path(output_csv)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Read transcripts
    with input_path.open("r", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        rows = list(reader)

    log.info("Processing %d transcripts...", len(rows))

    results = []
    for i, row in enumerate(rows):
        text = row["text"]
        utterances = json.loads(row["utterances"])

        features = extract_all(text, utterances)

        # Add metadata columns
        record = {
            "file": row["file"],
            "diagnosis": row["diagnosis"],
        }
        record.update(features)
        results.append(record)

        if (i + 1) % 50 == 0:
            log.info("  %d / %d done", i + 1, len(rows))

    # Write output
    fieldnames = ["file", "diagnosis"] + FEATURE_NAMES
    with output_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    log.info("Wrote %d rows to %s", len(results), output_path)


# ── CLI ────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract linguistic biomarker features from parsed transcripts."
    )
    parser.add_argument(
        "--input",
        default="data/processed/transcripts.csv",
        help="Input CSV from the parser",
    )
    parser.add_argument(
        "--output",
        default="data/processed/features_L0.csv",
        help="Output CSV with 20 features per transcript",
    )
    args = parser.parse_args()
    process_corpus(args.input, args.output)


if __name__ == "__main__":
    main()