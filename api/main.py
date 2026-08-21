"""FastAPI bridge for the ParaTrace web showcase.

The web app reuses ParaTrace's repository feature extractor and rewriting code.
A full-trace endpoint computes L0 plus L1-L4 once, then keeps the completed
trace in an in-memory LRU cache so the frontend can switch between intervention
levels instantly without fabricating transcript-specific measurements.

The cache is intentionally memory-only: visitor transcripts are not persisted
to disk by this API layer and the cache resets when the API process restarts.
"""
from __future__ import annotations

import asyncio
import copy
import hashlib
import math
import re
from collections import OrderedDict
from threading import Lock
from typing import Any, Literal

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from paratrace.features.extractor import embedder, extract_all
from paratrace.rewriting.rewriting import BACKENDS, PROMPTS

import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

app = FastAPI(title="ParaTrace Demo API", version="3.0.0")
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


class TraceRequest(TextRequest):
    backend: Literal["openai", "anthropic"] = "openai"
    force: bool = False


# Memory-only LRU. This is deliberately not persisted because the input can be
# sensitive speech text. It exists only to make repeated L1-L4 inspection instant.
TRACE_CACHE_MAX = 24
_TRACE_CACHE: OrderedDict[str, dict[str, Any]] = OrderedDict()
_TRACE_CACHE_LOCK = Lock()


def _utterances(text: str) -> list[str]:
    """Create a conservative utterance list for free-form web input."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(lines) > 1:
        return lines
    sentences = [
        chunk.strip()
        for chunk in re.split(r"(?<=[.!?])\s+", text.strip())
        if chunk.strip()
    ]
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
        # No public individual dementia/control verdict. The site reports
        # classification only at study/cohort level.
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


def _semantic_similarities_sync(original: str, rewrites: list[str]) -> list[float]:
    """Encode the original + four rewrites in one batch for a faster trace."""
    embeddings = np.asarray(embedder.encode([original, *rewrites]), dtype=float)
    anchor = embeddings[0]
    anchor_norm = float(np.linalg.norm(anchor))
    scores: list[float] = []
    for vector in embeddings[1:]:
        denom = anchor_norm * float(np.linalg.norm(vector))
        score = 0.0 if denom == 0 else float(np.dot(anchor, vector) / denom)
        scores.append(float(np.clip(score, -1.0, 1.0)))
    return scores


def _trace_cache_key(text: str, backend: str) -> str:
    payload = f"v3\0{backend}\0{text}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _trace_cache_get(key: str) -> dict[str, Any] | None:
    with _TRACE_CACHE_LOCK:
        value = _TRACE_CACHE.get(key)
        if value is None:
            return None
        _TRACE_CACHE.move_to_end(key)
        return copy.deepcopy(value)


def _trace_cache_put(key: str, value: dict[str, Any]) -> None:
    with _TRACE_CACHE_LOCK:
        _TRACE_CACHE[key] = copy.deepcopy(value)
        _TRACE_CACHE.move_to_end(key)
        while len(_TRACE_CACHE) > TRACE_CACHE_MAX:
            _TRACE_CACHE.popitem(last=False)


def _trace_cache_size() -> int:
    with _TRACE_CACHE_LOCK:
        return len(_TRACE_CACHE)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "paratrace-demo-api",
        "version": "3.0.0",
        "feature_extractor": "repository implementation",
        "public_diagnosis": False,
        "rewrite_backends": sorted(BACKENDS.keys()),
        "full_trace": True,
        "trace_cache": {
            "mode": "memory-only",
            "entries": _trace_cache_size(),
            "max_entries": TRACE_CACHE_MAX,
        },
    }


@app.post("/analyze")
async def analyze(payload: TextRequest) -> dict[str, Any]:
    try:
        return await run_in_threadpool(_analyze_sync, payload.text)
    except Exception as exc:
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


@app.post("/trace")
async def full_trace(payload: TraceRequest) -> dict[str, Any]:
    """Compute and cache a complete L0->L4 trace.

    LLM rewriting is the slow part, so the four independent rewrite calls are
    launched concurrently. Feature extraction and similarity are then computed
    from the returned texts. The completed result is kept only in process memory.
    """
    key = _trace_cache_key(payload.text, payload.backend)
    if not payload.force:
        cached = _trace_cache_get(key)
        if cached is not None:
            cached["cached"] = True
            return cached

    try:
        original_analysis = await run_in_threadpool(_analyze_sync, payload.text)

        # Generate L1-L4 concurrently. If a provider rate-limits one request,
        # retry only the failed level once, sequentially.
        jobs = [
            run_in_threadpool(_rewrite_sync, payload.text, level, payload.backend)
            for level in range(1, 5)
        ]
        raw_results = await asyncio.gather(*jobs, return_exceptions=True)

        rewrite_results: list[dict[str, Any]] = []
        failures: list[str] = []
        for level, result in enumerate(raw_results, start=1):
            if isinstance(result, Exception):
                try:
                    result = await run_in_threadpool(
                        _rewrite_sync, payload.text, level, payload.backend
                    )
                except Exception as retry_exc:
                    failures.append(f"L{level}: {retry_exc}")
                    continue
            rewrite_results.append(result)

        if failures or len(rewrite_results) != 4:
            detail = "; ".join(failures) or "one or more rewrite levels did not complete"
            raise RuntimeError(detail)

        rewritten_texts = [item["rewritten_text"] for item in rewrite_results]
        similarities = await run_in_threadpool(
            _semantic_similarities_sync, payload.text, rewritten_texts
        )

        levels: list[dict[str, Any]] = []
        # Keep extraction sequential for compatibility with shared NLP model
        # objects while still getting the latency win from parallel LLM calls.
        for rewrite_result, similarity in zip(rewrite_results, similarities):
            rewritten_text = rewrite_result["rewritten_text"]
            rewritten_analysis = await run_in_threadpool(_analyze_sync, rewritten_text)
            levels.append(
                {
                    "level": rewrite_result["level"],
                    "level_name": rewrite_result["level_name"],
                    "rewritten_text": rewritten_text,
                    "rewritten_analysis": rewritten_analysis,
                    "semantic_similarity": similarity,
                    "model": rewrite_result["model"],
                    "backend": payload.backend,
                }
            )

        response = {
            "original_analysis": original_analysis,
            "backend": payload.backend,
            "cached": False,
            "cache_mode": "memory-only",
            "levels": levels,
        }
        _trace_cache_put(key, response)
        return response
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Full L1-L4 trace failed: {exc}. Check the selected LLM API key, "
                "provider connectivity/rate limits, and local model assets."
            ),
        ) from exc
# Serve the built frontend in production
_FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if _FRONTEND_DIR.is_dir():
    _ASSETS_DIR = _FRONTEND_DIR / "assets"
    if _ASSETS_DIR.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_ASSETS_DIR)), name="assets")

    _SOURCES_DIR = _FRONTEND_DIR / "sources"
    if _SOURCES_DIR.is_dir():
        app.mount("/sources", StaticFiles(directory=str(_SOURCES_DIR)), name="sources")

    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        file_path = _FRONTEND_DIR / path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(_FRONTEND_DIR / "index.html"))