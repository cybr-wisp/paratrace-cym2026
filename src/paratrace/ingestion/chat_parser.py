"""
cha_parser.py -- DementiaBank Pitt Corpus ingestion layer.

Reads .cha (CHAT-format) transcripts, extracts participant speech only,
preserves all disfluency markers, maps each file to its clinical
diagnosis from the corpus directory structure, and outputs a tidy CSV.

Usage:
    python cha_parser.py --corpus-dir ./data/raw/cookie_only --output ./data/processed/transcripts.csv
"""

import argparse
import csv
import json
import logging
import re
from pathlib import Path

import pylangacq

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Diagnosis label mapping ────────────────────────────────────────────
LABEL_MAP: dict[str, str] = {
    "control":  "Control",
    "healthy":  "Control",
    "dementia": "Dementia",
    "mci":      "MCI",
}


def resolve_label(filepath: Path) -> str | None:
    for parent in filepath.parents:
        key = parent.name.lower().strip()
        if key in LABEL_MAP:
            return LABEL_MAP[key]
    return None


# ── Disfluency-preserving cleaning ─────────────────────────────────────

_CHAT_NOISE = re.compile(
    r"""
    \[%[^\]]*\]       |  # dependent-tier annotations
    \[\+[^\]]*\]      |  # postcodes
    \[\*[^\]]*\]      |  # error codes
    \[=![^\]]*\]      |  # paralinguistic
    \[=\?[^\]]*\]     |  # best guess
    \[=\s[^\]]*\]     |  # replacement
    <[^>]*>\s*\[//\]  |  # retraced material
    \[/\]             |  # retrace marker
    \[//\]            |  # correction marker
    @s:\w+            |  # language markers
    @l                |  # letter markers
    @o                |  # onomatopoeia markers
    \x15[^\x15]*\x15  |  # timing marks
    [‡†]              |  # special terminators
    \[<\d*\]          |  # overlap markers
    \[>\d*\]          |  # overlap markers
    \d+_\d+           |  # timestamps
    \+/\.             |  # interruption terminator
    \+\.\.\.             # trailing-off terminator
    """,
    re.VERBOSE,
)

_FILLED_PAUSE = re.compile(r"&-(\w+)")
_FRAGMENT = re.compile(r"&\+(\w+)")
_SHORTENING = re.compile(r"\((\w+)\)")
_MULTI_SPACE = re.compile(r"\s{2,}")
_TERMINATORS = re.compile(r"[.!?]+$")


def clean_utterance(raw: str) -> str:
    """Remove CHAT annotation while preserving disfluencies."""
    text = _CHAT_NOISE.sub(" ", raw)
    text = _FILLED_PAUSE.sub(r"\1", text)
    text = _FRAGMENT.sub(r"\1-", text)
    text = _SHORTENING.sub(r"\1", text)
    text = _TERMINATORS.sub("", text)
    text = _MULTI_SPACE.sub(" ", text).strip()
    return text


def _utterance_to_text(utt) -> str:
    """Extract the raw text from a pylangacq Utterance object.

    pylangacq 0.23 returns Utterance objects with a .tokens list.
    Each token has a .word attribute. We join them to reconstruct
    the spoken text.
    """
    # If it's already a string, return it
    if isinstance(utt, str):
        return utt

    # Try to get text from tokens
    try:
        tokens = utt.tokens
        if tokens:
            words = []
            for tok in tokens:
                # Token objects have a .word attribute
                try:
                    w = tok.word
                except AttributeError:
                    w = str(tok)
                if w:
                    words.append(w)
            return " ".join(words)
    except AttributeError:
        pass

    # Try .tiers attribute
    try:
        if hasattr(utt, "tiers") and utt.tiers:
            return str(utt.tiers)
    except Exception:
        pass

    # Last resort: stringify, but this gives the repr we don't want
    return ""


# ── Participant speech extraction ──────────────────────────────────────

def extract_participant_speech(
    reader: pylangacq.Reader,
) -> tuple[list[str], str]:
    """Return (utterances, joined_text) for the *PAR participant only."""
    raw_utts: list[str] = []

    try:
        all_utts = reader.utterances()
    except Exception:
        return [], ""

    # Flatten: utterances() returns list of lists (one per file)
    flat_utts = []
    for item in all_utts:
        if isinstance(item, list):
            flat_utts.extend(item)
        else:
            flat_utts.append(item)

    for utt in flat_utts:
        # Filter: only PAR (participant), not INV (investigator)
        participant = None
        try:
            participant = utt.participant
        except AttributeError:
            pass

        # Skip investigator utterances
        if participant and participant.upper() == "INV":
            continue

        # Only keep PAR utterances (or unknown if no participant attr)
        if participant and not participant.upper().startswith("PAR"):
            continue

        text = _utterance_to_text(utt)
        cleaned = clean_utterance(text)
        if cleaned:
            raw_utts.append(cleaned)

    full_text = " ".join(raw_utts)
    return raw_utts, full_text


# ── Corpus-level ingestion ─────────────────────────────────────────────

def parse_corpus(corpus_dir: str | Path) -> list[dict]:
    corpus_dir = Path(corpus_dir).resolve()
    cha_files = sorted(corpus_dir.rglob("*.cha"))
    log.info("Found %d .cha files under %s", len(cha_files), corpus_dir)

    records: list[dict] = []
    skipped = 0

    for fpath in cha_files:
        label = resolve_label(fpath)
        if label is None:
            log.warning("Skipping %s -- cannot infer diagnosis", fpath)
            skipped += 1
            continue

        try:
            reader = pylangacq.read_chat(str(fpath))
        except Exception as exc:
            log.warning("Failed to parse %s: %s", fpath, exc)
            skipped += 1
            continue

        utterances, full_text = extract_participant_speech(reader)

        if not utterances:
            log.warning("No participant speech in %s", fpath)
            skipped += 1
            continue

        records.append(
            {
                "file": str(fpath.relative_to(corpus_dir)),
                "diagnosis": label,
                "text": full_text,
                "utterances": json.dumps(utterances),
                "n_utts": len(utterances),
            }
        )

    log.info(
        "Parsed %d transcripts (%d skipped). Distribution: %s",
        len(records),
        skipped,
        _label_counts(records),
    )
    return records


def _label_counts(records: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for r in records:
        counts[r["diagnosis"]] = counts.get(r["diagnosis"], 0) + 1
    return counts


FIELDNAMES = ["file", "diagnosis", "text", "utterances", "n_utts"]


def write_csv(records: list[dict], output_path: str | Path) -> None:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(records)
    log.info("Wrote %d rows to %s", len(records), output_path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse DementiaBank Pitt Corpus .cha files into a CSV."
    )
    parser.add_argument("--corpus-dir", required=True)
    parser.add_argument("--output", default="data/processed/transcripts.csv")
    args = parser.parse_args()

    records = parse_corpus(args.corpus_dir)
    if not records:
        log.error("No records produced.")
        raise SystemExit(1)
    write_csv(records, args.output)


if __name__ == "__main__":
    main()