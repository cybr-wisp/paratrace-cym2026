"""
rewriter.py -- LLM paraphrase engine for ParaTrace.

Rewrites each transcript at 4 intervention levels using 2 LLM backends
(GPT-4o and Claude Sonnet). Caches every response to disk so you never
pay for the same rewrite twice. Resumable: if it crashes at row 300,
re-running picks up from 301.

Usage:
    python rewriter.py --input data/processed/transcripts.csv --output-dir data/rewrites --backend openai
    python rewriter.py --input data/processed/transcripts.csv --output-dir data/rewrites --backend anthropic
    python rewriter.py --input data/processed/transcripts.csv --output-dir data/rewrites --backend both
"""

import argparse
import csv
import json
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

import anthropic
import openai

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Prompt templates ───────────────────────────────────────────────────
# Each level is progressively more interventionist while attempting to
# preserve propositional meaning. Designed to simulate real-world AI
# text processing from spellcheck to full AI scribe.

PROMPTS = {
    1: {
        "name": "grammar_correction",
        "instruction": (
            "Fix only spelling and grammar errors in the following text. "
            "Do not change word choice, sentence structure, or meaning. "
            "Preserve all repetitions, fillers (um, uh, like), and hesitations exactly as they appear. "
            "Return only the corrected text, nothing else."
        ),
    },
    2: {
        "name": "light_paraphrase",
        "instruction": (
            "Lightly paraphrase the following text for clarity. "
            "Fix grammar, remove obvious filler words (um, uh, er), and smooth "
            "awkward phrasing. Keep the same vocabulary level and preserve all ideas. "
            "Return only the paraphrased text, nothing else."
        ),
    },
    3: {
        "name": "moderate_rewrite",
        "instruction": (
            "Rewrite the following text to be clear and well-structured. "
            "Improve vocabulary, fix all grammar issues, organize ideas "
            "logically, and remove any repetition or filler words. "
            "Maintain the original meaning but make it read smoothly. "
            "Return only the rewritten text, nothing else."
        ),
    },
    4: {
        "name": "full_reformulation",
        "instruction": (
            "Completely reformulate the following text as if written by "
            "a professional writer. Make it eloquent, well-organized, and "
            "articulate. Use sophisticated vocabulary and complex sentence "
            "structures. Preserve the core meaning but express it in the "
            "best possible way. Return only the reformulated text, nothing else."
        ),
    },
}

# ── Caching ────────────────────────────────────────────────────────────

def _cache_path(output_dir: Path, file_id: str, level: int, backend: str) -> Path:
    """Deterministic cache path for one rewrite."""
    # file_id like "Control\002-0.cha" -> "Control__002-0"
    safe_id = file_id.replace("\\", "__").replace("/", "__").replace(".cha", "")
    return output_dir / backend / f"L{level}" / f"{safe_id}.json"


def _load_cached(cache_file: Path) -> dict | None:
    if cache_file.exists():
        with cache_file.open("r", encoding="utf-8") as f:
            return json.load(f)
    return None


def _save_cache(cache_file: Path, data: dict) -> None:
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    with cache_file.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── LLM calls ─────────────────────────────────────────────────────────

def rewrite_openai(text: str, instruction: str) -> dict:
    """Rewrite via OpenAI GPT-4o. Returns text + metadata."""
    client = openai.OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": instruction},
            {"role": "user", "content": text},
        ],
        temperature=0.3,
        max_tokens=2000,
    )
    return {
        "text": response.choices[0].message.content.strip(),
        "model": response.model,
        "input_tokens": response.usage.prompt_tokens if response.usage else None,
        "output_tokens": response.usage.completion_tokens if response.usage else None,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


def rewrite_anthropic(text: str, instruction: str) -> dict:
    """Rewrite via Anthropic Claude Sonnet. Returns text + metadata."""
    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        temperature=0.3,
        messages=[
            {"role": "user", "content": f"{instruction}\n\nText:\n{text}"},
        ],
    )
    return {
        "text": response.content[0].text.strip(),
        "model": response.model,
        "input_tokens": response.usage.input_tokens if response.usage else None,
        "output_tokens": response.usage.output_tokens if response.usage else None,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }


BACKENDS = {
    "openai": rewrite_openai,
    "anthropic": rewrite_anthropic,
}


# ── Main pipeline ─────────────────────────────────────────────────────

def rewrite_corpus(
    input_csv: str,
    output_dir: str,
    backend: str = "both",
    delay: float = 0.5,
) -> None:
    """Rewrite all transcripts at all 4 levels.

    Args:
        input_csv: path to transcripts.csv
        output_dir: base directory for cached rewrites
        backend: "openai", "anthropic", or "both"
        delay: seconds between API calls (rate limiting)
    """
    input_path = Path(input_csv)
    output_path = Path(output_dir)

    with input_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    backends = list(BACKENDS.keys()) if backend == "both" else [backend]

    for be in backends:
        rewrite_fn = BACKENDS[be]
        log.info("=== Backend: %s ===", be)

        total = len(rows) * 4  # 4 levels per transcript
        done = 0
        skipped = 0
        errors = 0

        for level in range(1, 5):
            prompt = PROMPTS[level]
            log.info("  Level %d (%s)", level, prompt["name"])

            for i, row in enumerate(rows):
                file_id = row["file"]
                text = row["text"]

                # Check cache
                cache_file = _cache_path(output_path, file_id, level, be)
                cached = _load_cached(cache_file)
                if cached is not None:
                    skipped += 1
                    done += 1
                    continue

                # Call API
                try:
                    response = rewrite_fn(text, prompt["instruction"])
                    result = {
                        "file": file_id,
                        "diagnosis": row["diagnosis"],
                        "level": level,
                        "level_name": prompt["name"],
                        "backend": be,
                        "model": response["model"],
                        "original_text": text,
                        "rewritten_text": response["text"],
                        "temperature": 0.3,
                        "input_tokens": response["input_tokens"],
                        "output_tokens": response["output_tokens"],
                        "timestamp": response["timestamp"],
                    }
                    _save_cache(cache_file, result)
                    done += 1

                    if done % 25 == 0:
                        log.info("    %d / %d done (%d cached, %d errors)", done, total, skipped, errors)

                    time.sleep(delay)

                except Exception as exc:
                    log.warning("    Error on %s L%d: %s", file_id, level, exc)
                    errors += 1
                    done += 1
                    time.sleep(2)  # back off on error

        log.info(
            "=== %s complete: %d done, %d cached, %d errors ===",
            be, done, skipped, errors,
        )


def build_rewrites_csv(output_dir: str, output_csv: str) -> None:
    """Collect all cached rewrites into a single CSV for feature extraction."""
    output_path = Path(output_dir)
    out_csv = Path(output_csv)
    out_csv.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "file", "diagnosis", "level", "level_name",
        "backend", "rewritten_text",
    ]

    rows = []
    for json_file in sorted(output_path.rglob("*.json")):
        with json_file.open("r", encoding="utf-8") as f:
            data = json.load(f)
        rows.append({k: data[k] for k in fieldnames if k in data})

    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    log.info("Collected %d rewrites into %s", len(rows), out_csv)


# ── CLI ────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rewrite transcripts at 4 intervention levels using LLM backends."
    )
    parser.add_argument("--input", default="data/processed/transcripts.csv")
    parser.add_argument("--output-dir", default="data/rewrites")
    parser.add_argument(
        "--backend",
        choices=["openai", "anthropic", "both"],
        default="both",
        help="Which LLM backend(s) to use",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Seconds between API calls (default 0.5)",
    )
    parser.add_argument(
        "--collect",
        action="store_true",
        help="Just collect cached rewrites into a CSV (no API calls)",
    )
    args = parser.parse_args()

    if args.collect:
        build_rewrites_csv(args.output_dir, "data/processed/rewrites_all.csv")
    else:
        rewrite_corpus(args.input, args.output_dir, args.backend, args.delay)
        build_rewrites_csv(args.output_dir, "data/processed/rewrites_all.csv")


if __name__ == "__main__":
    main()