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
# The Pitt Corpus encodes diagnosis in the top-level directory name.
# We normalise folder names to canonical labels.
LABEL_MAP: dict[str, str] = {
    "control":  "Control",
    "healthy":  "Control",
    "dementia": "Dementia",
    "mci":      "MCI",
}


def resolve_label(filepath: Path) -> str | None:
    """Walk up the path and return a diagnosis label if any ancestor
    directory matches a known group name.  Returns None when no match
    is found (the caller decides whether to skip or raise)."""
    for parent in filepath.parents:
        key = parent.name.lower().strip()
        if key in LABEL_MAP:
            return LABEL_MAP[key]
    return None


# ── Disfluency-preserving extraction ───────────────────────────────────

# ── What we KEEP (biomarkers) vs what we STRIP (annotation noise) ──
#
# KEEP (these are diagnostic signals):
#   &-uh, &-hm          filled pauses  ->  converted to "uh", "hm"
#   &+lit, &+c, &+s     phonological fragments (abandoned word starts)
#   um, uh, er, ah       plain fillers already in text
#   word-                incomplete / abandoned words
#   repeated words       (detected downstream by feature extraction)
#
# STRIP (CHAT annotation, not speech):
#   [+ gram], [+ es]    postcodes
#   [*], [=! laughs]     error codes, paralinguistics
#   <...> [//]           retraced material wrapped in angle brackets
#   %mor: %gra:          dependent tiers (handled by pylangacq)
#   +/. +...             interruption / trailing-off terminators
#   @s:fra @l @o         language / letter / onomatopoeia tags
#   timestamps           digit_digit patterns after terminators

# Step 1: remove annotation brackets and metadata
_CHAT_NOISE = re.compile(
    r"""
    \[%[^\]]*\]       |  # dependent-tier annotations  [% ...]
    \[\+[^\]]*\]      |  # postcodes  [+ gram], [+ es]
    \[\*[^\]]*\]      |  # error codes  [* ...]
    \[=![^\]]*\]      |  # paralinguistic  [=! laughs]
    \[=\?[^\]]*\]     |  # best guess  [=? word]
    \[=\s[^\]]*\]     |  # replacement  [= word]
    <[^>]*>\s*\[//\]  |  # retraced material with correction marker
    \[/\]             |  # simple retrace marker (word stays, bracket goes)
    \[//\]            |  # correction marker (when not caught by angle-bracket rule)
    @s:\w+            |  # language markers  @s:fra
    @l                |  # letter markers
    @o                |  # onomatopoeia markers
    \x15[^\x15]*\x15  |  # bullet / timing marks
    [‡†]              |  # special utterance terminators
    \[<\d*\]          |  # overlap preceding markers
    \[>\d*\]          |  # overlap following markers
    \d+_\d+           |  # timestamps  510_1790
    \+/\.             |  # interruption terminator  +/.
    \+\.\.\.             # trailing-off terminator  +...
    """,
    re.VERBOSE,
)

# Step 2: convert CHAT-coded filled pauses to plain words
#   &-uh  ->  uh       (filled pause)
#   &-hm  ->  hm       (filled pause)
_FILLED_PAUSE = re.compile(r"&-(\w+)")

# Step 3: mark phonological fragments (abandoned word starts) with a
# trailing hyphen so the word-finding-difficulty counter can detect them.
#   &+lit  ->  lit-     (fragment)
#   &+c    ->  c-       (fragment)
_FRAGMENT = re.compile(r"&\+(\w+)")

# Step 4: expand parenthetical shortenings to full forms
#   (be)cause  ->  because
#   sayin(g)   ->  saying
_SHORTENING = re.compile(r"\((\w+)\)")

# Step 5: clean up
_MULTI_SPACE = re.compile(r"\s{2,}")
_TERMINATORS = re.compile(r"[.!?]+$")


def clean_utterance(raw: str) -> str:
    """Remove CHAT annotation artefacts while preserving disfluencies.

    Designed against the actual Pitt Corpus .cha format.  Keeps filled
    pauses, fragments, and repetitions intact because those are the
    biomarkers we measure downstream.
    """
    text = _CHAT_NOISE.sub(" ", raw)
    text = _FILLED_PAUSE.sub(r"\1", text)       # &-uh  -> uh
    text = _FRAGMENT.sub(r"\1-", text)           # &+lit -> lit-
    text = _SHORTENING.sub(r"\1", text)          # (be)cause -> because
    text = _TERMINATORS.sub("", text)
    text = _MULTI_SPACE.sub(" ", text).strip()
    return text


def _find_participant_ids(reader: pylangacq.Reader) -> set[str]:
    """Identify which speaker codes belong to the participant (not the
    investigator).  Handles PAR, PAR0, PAR1, and non-standard codes."""
    par_ids: set[str] = set()
    for header in reader.headers():
        participants = header.get("Participants", {})
        for code, info in participants.items():
            role = (info if isinstance(info, str) else info.get("role", "")).lower()
            if code.upper().startswith("PAR") or "participant" in role:
                par_ids.add(code)
        # Fallback: everyone who isn't the investigator
        if not par_ids:
            for code, info in participants.items():
                role = (info if isinstance(info, str) else info.get("role", "")).lower()
                if code.upper() != "INV" and "investigator" not in role:
                    par_ids.add(code)
    return par_ids if par_ids else {"PAR"}


def extract_participant_speech(
    reader: pylangacq.Reader,
) -> tuple[list[str], str]:
    """Return (utterances, joined_text) for the *PAR participant only.

    Uses pylangacq's built-in participant filter.  Preserves fillers,
    repeats, incomplete words -- everything that constitutes a
    linguistic biomarker.
    """
    par_ids = _find_participant_ids(reader)

    # pylangacq .utterances(participants=...) returns a list of lists
    # of strings, one inner list per file in the reader.
    raw_utts: list[str] = []
    try:
        for file_utts in reader.utterances(participants=par_ids):
            if isinstance(file_utts, str):
                # Single-file readers may return flat strings
                raw_utts.append(file_utts)
            else:
                raw_utts.extend(file_utts)
    except TypeError:
        # Older pylangacq versions: no participants kwarg.
        # Fall back to reading all utterances and filtering manually.
        for file_utts in reader.utterances():
            if isinstance(file_utts, str):
                raw_utts.append(file_utts)
            else:
                raw_utts.extend(file_utts)

    utterances: list[str] = []
    for raw in raw_utts:
        cleaned = clean_utterance(raw)
        if cleaned:
            utterances.append(cleaned)

    full_text = " ".join(utterances)
    return utterances, full_text


# ── Corpus-level ingestion ─────────────────────────────────────────────

def parse_corpus(corpus_dir: str | Path) -> list[dict]:
    """Walk the corpus directory, parse every .cha file, and return a
    list of record dicts ready for CSV / DataFrame conversion.

    Each record:
        file        -- relative path within corpus_dir
        diagnosis   -- Control | MCI | Dementia
        text        -- full participant speech as one string
        utterances  -- JSON-encoded list of individual utterances
        n_utts      -- utterance count (handy sanity-check column)
    """
    corpus_dir = Path(corpus_dir).resolve()
    cha_files = sorted(corpus_dir.rglob("*.cha"))
    log.info("Found %d .cha files under %s", len(cha_files), corpus_dir)

    records: list[dict] = []
    skipped = 0

    for fpath in cha_files:
        # ── Diagnosis label ──
        label = resolve_label(fpath)
        if label is None:
            log.warning("Skipping %s -- cannot infer diagnosis from path", fpath)
            skipped += 1
            continue

        # ── Parse with pylangacq ──
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