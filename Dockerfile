# ── Stage 1: Build frontend ─────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python API + static frontend ───────────────────────
FROM python:3.12-slim
WORKDIR /app

# System deps for spaCy / numpy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc && \
    rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download en_core_web_sm

# App code
COPY src/ ./src/
COPY api/ ./api/
COPY configs/ ./configs/
COPY data/results/ ./data/results/

# Built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Make paratrace importable
ENV PYTHONPATH=/app/src
ENV PORT=8000

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
