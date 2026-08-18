"""
cha_parser.py -- DementiaBank Pitt Corpus ingestion layer.

Reads .cha (CHAT-format) transcripts, extracts participant speech only,
preserves all disfluency markers, maps each file to its clinical
diagnosis from the corpus directory structure, and outputs a tidy CSV.

Expected corpus layout:
    pitt_corpus/
        Control/
            cookie/
                001-0.cha
                002-0.cha
                ...
        Dementia/
            cookie/
                011-0.cha
                012-0.cha
                ...
        (optionally) MCI/
            cookie/
                ...

Usage:
    python cha_parser.py --corpus-dir ./pitt_corpus --output ./data/transcripts.csv
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
    """Walk up the path and return a diagnosis label if any ancestor
    directory matches a known group name."""
    for parent in filepath.parents:
        key = parent.name.lower().strip()
        if key in LABEL_MAP:
            return LABEL_MAP[key]
    return None


# ── Disfluency-preserving cleaning ─────────────────────────────────────

_CHAT_NOISE = re.compile(
    r"""
    \[%[^\]]*\]       |  # dependent-tier annotations
    \[\+[^\]]*\]      |  # postcodes  [+ gram], [+ es]
    \[\*[^\]]*\]      |  # error codes
    \[=![^\]]*\]      |  # paralinguistic  [=! laughs]
    \[=\?[^\]]*\]     |  # best guess
    \[=\s[^\]]*\]     |  # replacement
    <[^>]*>\s*\[//\]  |  # retraced material with correction
    \[/\]             |  # retrace marker
    \[//\]            |  # correction marker
    @s:\w+            |  # language markers
    @l                |  # letter markers
    @o                |  # onomatopoeia markers
    \x15[^\x15]*\x15  |  # bullet / timing marks
    [‡†]              |  # special terminators
    \[<\d*\]          |  # overlap markers
    \[>\d*\]          |  # overlap markers
    \d+_\d+           |  # timestamps
    \+/\.             |  # interruption terminator
    \+\.\.\.             # trailing-off terminator
    """,
    re.VERBOSE,
)

_FILLED_PAUSE = re.compile(r"&-(\w+)")     # &-uh -> uh
_FRAGMENT = re.compile(r"&\+(\w+)")         # &+lit -> lit-
_SHORTENING = re.compile(r"\((\w+)\)")      # (be)cause -> because
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


# ── Participant speech extraction ──────────────────────────────────────

def extract_participant_speech(
    reader: pylangacq.Reader,
) -> tuple[list[str], str]:
    """Return (utterances, joined_text) for the *PAR participant only.

    Preserves fillers, repeats, incomplete words -- everything that
    constitutes a linguistic biomarker.
    """
    raw_utts: list[str] = []

    # Try PAR first (standard Pitt Corpus code), fall back to all
    try:
        all_utts = reader.utterances(participants="PAR")
    except Exception:
        try:
            all_utts = reader.utterances()
        except Exception:
            return [], ""

    # reader.utterances() returns list of lists (one per file).
    # For a single-file reader that's one inner list.
    for item in all_utts:
        if isinstance(item, list):
            raw_utts.extend(item)
        else:
            raw_utts.append(item)

    utterances: list[str] = []
    for raw in raw_utts:
        if not isinstance(raw, str):
            raw = str(raw)
        cleaned = clean_utterance(raw)
        if cleaned:
            utterances.append(cleaned)

    full_text = " ".join(utterances)
    return utterances, full_text


# ── Corpus-level ingestion ─────────────────────────────────────────────

def parse_corpus(corpus_dir: str | Path) -> list[dict]:
    """Walk the corpus directory, parse every .cha file, and return a
    list of record dicts ready for CSV / DataFrame conversion."""
    corpus_dir = Path(corpus_dir).resolve()
    cha_files = sorted(corpus_dir.rglob("*.cha"))
    log.info("Found %d .cha files under %s", len(cha_files), corpus_dir)

    records: list[dict] = []
    skipped = 0

    for fpath in cha_files:
        label = resolve_label(fpath)
        if label is None:
            log.warning("Skipping %s -- cannot infer diagnosis from path", fpath)
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
            log.warning("No participant speech found in %s", fpath)
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


# ── CSV output ─────────────────────────────────────────────────────────

FIELDNAMES = ["file", "diagnosis", "text", "utterances", "n_utts"]


def write_csv(records: list[dict], output_path: str | Path) -> None:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(records)

    log.info("Wrote %d rows to %s", len(records), output_path)


# ── CLI ────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse DementiaBank Pitt Corpus .cha files into a CSV."
    )
    parser.add_argument(
        "--corpus-dir",
        required=True,
        help="Root directory of the Pitt Corpus (contains Control/, Dementia/, etc.)",
    )
    parser.add_argument(
        "--output",
        default="data/transcripts.csv",
        help="Output CSV path (default: data/transcripts.csv)",
    )
    args = parser.parse_args()

    records = parse_corpus(args.corpus_dir)
    if not records:
        log.error("No records produced. Check corpus path and directory layout.")
        raise SystemExit(1)

    write_csv(records, args.output)


if __name__ == "__main__":
    main()