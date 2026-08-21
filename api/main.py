"""FastAPI bridge for the ParaTrace web showcase.

This file intentionally reuses the repository's feature extractor and rewrite
implementations instead of recreating them in JavaScript. The public web demo
returns linguistic measurements, not an individual dementia/control diagnosis.
"""
from __future__ import annotations

import math
import re
from typing import Any, Literal

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from paratrace.features.extractor import embedder, extract_all
from paratrace.rewriting.rewriting import BACKENDS, PROMPTS

app = FastAPI(title="ParaTrace Demo API", version="2.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class TextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=30_000)


class RewriteRequest(TextRequest):
    level: int = Field(ge=1, le=4)
    backend: Literal["openai", "anthropic"] = "openai"


def _utterances(text: str) -> list[str]:
    """Create a conservative utterance list for free-form web input.

    Newlines are treated as explicit utterance boundaries. Otherwise sentence
    punctuation is used. This adapter cannot reconstruct CHAT utterance
    boundaries that were not supplied by the visitor, so the UI should describe
    arbitrary-input runs as web-demo feature extraction rather than corpus
    transcript reproduction.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(lines) > 1:
        return lines
    sentences = [chunk.strip() for chunk in re.split(r"(?<=[.!?])\s+", text.strip()) if chunk.strip()]
    return sentences or [text.strip()]


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def _analyze_sync(text: str) -> dict[str, Any]:
    features = _json_safe(extract_all(text, _utterances(text)))
    return {
        "features": features,
        # Deliberately omitted as a public-facing individual verdict. The study's
        # classification results are displayed separately at cohort level.
        "prediction": None,
        "category_scores": {},
    }


def _rewrite_sync(text: str, level: int, backend: str) -> dict[str, Any]:
    if level not in PROMPTS:
        raise ValueError("level must be between 1 and 4")
    if backend not in BACKENDS:
        raise ValueError("backend must be 'openai' or 'anthropic'")
    prompt = PROMPTS[level]
    result = BACKENDS[backend](text, prompt["instruction"])
    return {
        "rewritten_text": result["text"],
        "model": result.get("model", backend),
        "level": level,
        "level_name": prompt["name"],
        "backend": backend,
    }


def _semantic_similarity_sync(original: str, rewritten: str) -> float:
    embeddings = np.asarray(embedder.encode([original, rewritten]), dtype=float)
    a, b = embeddings[0], embeddings[1]
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.clip(np.dot(a, b) / denom, -1.0, 1.0))


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "paratrace-demo-api",
        "feature_extractor": "repository implementation",
        "public_diagnosis": False,
        "rewrite_backends": sorted(BACKENDS.keys()),
    }


@app.post("/analyze")
async def analyze(payload: TextRequest) -> dict[str, Any]:
    try:
        return await run_in_threadpool(_analyze_sync, payload.text)
    except Exception as exc:  # library/model errors should reach the UI clearly
        raise HTTPException(status_code=500, detail=f"Feature extraction failed: {exc}") from exc


@app.post("/rewrite")
async def rewrite(payload: RewriteRequest) -> dict[str, Any]:
    try:
        return await run_in_threadpool(_rewrite_sync, payload.text, payload.level, payload.backend)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                f"{payload.backend} rewrite failed: {exc}. "
                "Check the corresponding API key and network access."
            ),
        ) from exc


@app.post("/compare")
async def compare(payload: RewriteRequest) -> dict[str, Any]:
    try:
        original_analysis = await run_in_threadpool(_analyze_sync, payload.text)
        rewrite_result = await run_in_threadpool(
            _rewrite_sync, payload.text, payload.level, payload.backend
        )
        rewritten_text = rewrite_result["rewritten_text"]
        rewritten_analysis = await run_in_threadpool(_analyze_sync, rewritten_text)
        semantic_similarity = await run_in_threadpool(
            _semantic_similarity_sync, payload.text, rewritten_text
        )
        return {
            "original_analysis": original_analysis,
            "rewritten_text": rewritten_text,
            "rewritten_analysis": rewritten_analysis,
            "semantic_similarity": semantic_similarity,
            "rewrite": rewrite_result,
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Compare pipeline failed: {exc}. Check model assets, the selected "
                "LLM API key, and backend connectivity."
            ),
        ) from exc
