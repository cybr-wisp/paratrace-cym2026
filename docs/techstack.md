# ParaTrace Technology Stack

<div align="center">

# Technology Stack

**Every technology used across the ParaTrace research pipeline, API, frontend, analysis tooling, and deployment.**

### Core

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?logo=fastapi&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)

### NLP & Machine Learning

![spaCy](https://img.shields.io/badge/spaCy-en__core__web__sm-09A3D5?logo=spacy&logoColor=white)
![Sentence Transformers](https://img.shields.io/badge/Sentence_Transformers-all--MiniLM--L6--v2-FFD21E?logo=huggingface&logoColor=black)
![lexicalrichness](https://img.shields.io/badge/lexicalrichness-lexical_metrics-6C63FF)
![pylangacq](https://img.shields.io/badge/pylangacq-CHAT_parser-4B8BBE)
![scikit-learn](https://img.shields.io/badge/scikit--learn-modeling-F7931E?logo=scikitlearn&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-numerical_computing-013243?logo=numpy&logoColor=white)
![pandas](https://img.shields.io/badge/pandas-dataframes-150458?logo=pandas&logoColor=white)
![SciPy](https://img.shields.io/badge/SciPy-statistics-8CAAE6?logo=scipy&logoColor=white)
![NLTK](https://img.shields.io/badge/NLTK-NLP_tooling-154F3C)

### LLM Providers

![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-Claude_Sonnet-191919?logo=anthropic&logoColor=white)

### API & Backend

![Pydantic](https://img.shields.io/badge/Pydantic-validation-E92063?logo=pydantic&logoColor=white)
![Uvicorn](https://img.shields.io/badge/Uvicorn-ASGI_server-499848)
![Starlette](https://img.shields.io/badge/Starlette-ASGI_toolkit-2E7D32)
![python-dotenv](https://img.shields.io/badge/python--dotenv-environment_config-ECD53F)
![PyYAML](https://img.shields.io/badge/PyYAML-YAML_config-CB171E?logo=yaml&logoColor=white)

### Frontend & Visualization

![Recharts](https://img.shields.io/badge/Recharts-interactive_charts-22B5BF)
![CSS](https://img.shields.io/badge/CSS-custom_UI-663399?logo=css&logoColor=white)
![Web Speech API](https://img.shields.io/badge/Web_Speech_API-live_input-555555)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-tooling-06B6D4?logo=tailwindcss&logoColor=white)
![PostCSS](https://img.shields.io/badge/PostCSS-CSS_processing-DD3A0A?logo=postcss&logoColor=white)
![Autoprefixer](https://img.shields.io/badge/Autoprefixer-browser_prefixes-DD3735)
![Matplotlib](https://img.shields.io/badge/Matplotlib-static_figures-11557C)
![Seaborn](https://img.shields.io/badge/Seaborn-statistical_visualization-4C72B0)

### Build, Test & Deployment

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![npm](https://img.shields.io/badge/npm-package_management-CB3837?logo=npm&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-multi--stage_build-2496ED?logo=docker&logoColor=white)
![Render](https://img.shields.io/badge/Render-deployment-000000?logo=render&logoColor=white)
![pytest](https://img.shields.io/badge/pytest-testing-0A9EDC?logo=pytest&logoColor=white)
![Ruff](https://img.shields.io/badge/Ruff-linting-D7FF64?logo=ruff&logoColor=black)
![tqdm](https://img.shields.io/badge/tqdm-progress_tracking-FFC107)

</div>

---

## Architecture

```text
DementiaBank CHAT transcripts
          │
          ▼
      pylangacq
          │
          ▼
   Python research pipeline
   ├── spaCy
   ├── Sentence Transformers
   ├── lexicalrichness
   ├── NumPy
   ├── pandas
   ├── SciPy
   └── scikit-learn
          │
          ├──────────────► OpenAI
          └──────────────► Anthropic
          │
          ▼
       FastAPI
       ├── Pydantic
       ├── Starlette
       └── Uvicorn
          │
          ▼
 React + TypeScript
 ├── Recharts
 ├── CSS
 └── Web Speech API
          │
          ▼
        Vite
          │
          ▼
 Docker multi-stage build
          │
          ▼
        Render
```

---

# Frontend

## ![React](https://img.shields.io/badge/React-18-20232A?logo=react&logoColor=61DAFB) React

**Purpose:** Component architecture and interactive application state.

Used for:

- the full L0 → L4 demonstration workflow
- the live signal lab
- research-section navigation
- transcript state
- backend selection
- intervention-level selection
- verified trace visualization
- feature-table rendering

---

## ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) TypeScript

**Purpose:** Type-safe frontend application code.

Used for:

- API response types
- feature maps
- rewrite levels
- analysis results
- chart data
- application state
- component props

---

## ![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white) Vite

**Purpose:** Frontend development server and production bundler.

The frontend is compiled with:

```bash
npm run build
```

which runs TypeScript validation before the Vite production build.

---

## ![Recharts](https://img.shields.io/badge/Recharts-interactive_charts-22B5BF) Recharts

**Purpose:** Interactive scientific visualization in the public interface.

Used for:

- diagnostic-accuracy curves
- category radar plots
- feature-shift bar charts
- live linguistic proxy bars
- time-series feature traces

---

## ![CSS](https://img.shields.io/badge/CSS-custom_UI-663399?logo=css&logoColor=white) CSS

**Purpose:** ParaTrace's custom research-interface visual system.

Used for:

- layout
- typography
- responsive behavior
- scientific data tables
- transcript annotations
- interaction states
- research-page presentation

The project does not depend on a large component library for its interface.

---

## ![Web Speech API](https://img.shields.io/badge/Web_Speech_API-live_input-555555) Web Speech API

**Purpose:** Optional live speech-to-text input in supported browsers.

The live lab can capture spoken input through:

```text
SpeechRecognition
webkitSpeechRecognition
```

This browser capability is optional; typed or pasted transcripts remain supported.

---

## ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-tooling-06B6D4?logo=tailwindcss&logoColor=white) Tailwind CSS

**Purpose:** Present in the frontend development dependency set.

ParaTrace's current interface is primarily custom CSS rather than a Tailwind utility-driven component system.

---

## ![PostCSS](https://img.shields.io/badge/PostCSS-CSS_processing-DD3A0A?logo=postcss&logoColor=white) PostCSS

**Purpose:** CSS build-tool support in the frontend dependency chain.

---

## ![Autoprefixer](https://img.shields.io/badge/Autoprefixer-browser_prefixes-DD3735) Autoprefixer

**Purpose:** Browser compatibility tooling for generated CSS.

---

# API & Backend

## ![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white) Python

**Purpose:** Primary research and backend language.

Python powers:

- corpus ingestion
- linguistic feature extraction
- LLM rewriting
- classification
- statistical analysis
- mitigation analysis
- FastAPI endpoints

---

## ![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?logo=fastapi&logoColor=white) FastAPI

**Purpose:** HTTP interface between the React website and ParaTrace's research pipeline.

The API exposes operations for:

- transcript analysis
- individual rewrites
- original-vs-rewrite comparison
- complete L0 → L4 trace generation

---

## ![Pydantic](https://img.shields.io/badge/Pydantic-validation-E92063?logo=pydantic&logoColor=white) Pydantic

**Purpose:** API schema and request validation.

Used to validate:

- transcript text
- rewrite level
- LLM backend
- trace options

---

## ![Starlette](https://img.shields.io/badge/Starlette-ASGI_toolkit-2E7D32) Starlette

**Purpose:** ASGI infrastructure beneath FastAPI.

Used for:

- CORS middleware
- thread-pool execution
- static file delivery
- response handling

---

## ![Uvicorn](https://img.shields.io/badge/Uvicorn-ASGI_server-499848) Uvicorn

**Purpose:** Runs the FastAPI application.

Production container command:

```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

---

## ![python-dotenv](https://img.shields.io/badge/python--dotenv-environment_config-ECD53F) python-dotenv

**Purpose:** Local environment configuration.

Loads credentials such as:

```text
OPENAI_API_KEY
ANTHROPIC_API_KEY
```

from `.env`.

---

## ![PyYAML](https://img.shields.io/badge/PyYAML-YAML_config-CB171E?logo=yaml&logoColor=white) PyYAML

**Purpose:** YAML parsing support in the Python project dependency set.

---

# Corpus Ingestion

## ![pylangacq](https://img.shields.io/badge/pylangacq-CHAT_parser-4B8BBE) pylangacq

**Purpose:** Parsing DementiaBank/TalkBank CHAT transcripts.

ParaTrace uses it to read `.cha` files while the ingestion layer preserves clinically relevant speech structure such as:

- fillers
- hesitations
- incomplete words
- repetitions
- utterance boundaries

> DementiaBank/TalkBank participant data is access-controlled and is not redistributed by this repository.

---

# Linguistic Biomarker Extraction

## ![spaCy](https://img.shields.io/badge/spaCy-en__core__web__sm-09A3D5?logo=spacy&logoColor=white) spaCy

**Model:** `en_core_web_sm`

Used for:

- tokenization
- part-of-speech tagging
- dependency parsing
- sentence structure
- clause measurements
- noun/pronoun statistics
- syntactic complexity

---

## ![Sentence Transformers](https://img.shields.io/badge/Sentence_Transformers-all--MiniLM--L6--v2-FFD21E?logo=huggingface&logoColor=black) Sentence Transformers

**Model:** `all-MiniLM-L6-v2`

Used for sentence embeddings that support:

- local semantic coherence
- global semantic coherence
- coherence variance
- semantic similarity between original and rewritten text

---

## ![lexicalrichness](https://img.shields.io/badge/lexicalrichness-lexical_metrics-6C63FF) lexicalrichness

**Purpose:** Lexical-diversity and vocabulary-richness metrics.

Used for:

- TTR
- MTLD
- MATTR
- Brunet's W
- Honoré's R

---

## ![NumPy](https://img.shields.io/badge/NumPy-numerical_computing-013243?logo=numpy&logoColor=white) NumPy

**Purpose:** Numerical computation.

Used for:

- feature vectors
- aggregation
- matrix operations
- model input arrays
- summary statistics
- API-safe numerical conversion

---

## ![SciPy](https://img.shields.io/badge/SciPy-statistics-8CAAE6?logo=scipy&logoColor=white) SciPy

**Purpose:** Scientific distance and statistical functions.

Used for:

- cosine distance
- paired statistical tests
- feature-drift analysis

---

## ![NLTK](https://img.shields.io/badge/NLTK-NLP_tooling-154F3C) NLTK

**Purpose:** Declared natural-language-processing dependency in the Python project environment.

---

# Machine Learning

## ![scikit-learn](https://img.shields.io/badge/scikit--learn-modeling-F7931E?logo=scikitlearn&logoColor=white) scikit-learn

**Purpose:** Classification and evaluation.

Used for:

- Random Forest
- Gradient Boosting
- Logistic Regression
- `StratifiedKFold`
- `StandardScaler`
- `LabelEncoder`
- accuracy
- balanced accuracy
- F1
- confusion matrices

### Models

![Random Forest](https://img.shields.io/badge/Random_Forest-200_trees-2E7D32)
![Gradient Boosting](https://img.shields.io/badge/Gradient_Boosting-150_estimators-558B2F)
![Logistic Regression](https://img.shields.io/badge/Logistic_Regression-linear_baseline-7CB342)

---

## ![pandas](https://img.shields.io/badge/pandas-dataframes-150458?logo=pandas&logoColor=white) pandas

**Purpose:** Feature-table processing.

Used for:

- loading processed feature CSVs
- numerical coercion
- missing-value handling
- modeling matrices

---

# Statistical Analysis

## ![SciPy](https://img.shields.io/badge/SciPy-Wilcoxon_testing-8CAAE6?logo=scipy&logoColor=white) SciPy Statistics

Used to quantify whether features change significantly under LLM rewriting.

ParaTrace includes paired statistical analysis of the L0 → L4 feature distributions.

---

# LLM Rewriting

## ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white) OpenAI

**Purpose:** First LLM rewriting backend.

Used to generate controlled:

- L1 grammar corrections
- L2 light paraphrases
- L3 moderate rewrites
- L4 full reformulations

---

## ![Anthropic](https://img.shields.io/badge/Anthropic-Claude_Sonnet-191919?logo=anthropic&logoColor=white) Anthropic

**Purpose:** Independent second LLM backend.

The second provider allows ParaTrace to test whether observed biomarker degradation is tied to one model provider or appears across systems.

---

# Offline Visualization

## ![Matplotlib](https://img.shields.io/badge/Matplotlib-static_figures-11557C) Matplotlib

**Purpose:** Research figures and offline analysis plots.

---

## ![Seaborn](https://img.shields.io/badge/Seaborn-statistical_visualization-4C72B0) Seaborn

**Purpose:** Statistical visualization dependency in the research environment.

---

# Build & Runtime

## ![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white) Node.js

**Purpose:** Frontend build environment.

The first Docker stage uses:

```text
node:20-slim
```

---

## ![npm](https://img.shields.io/badge/npm-package_management-CB3837?logo=npm&logoColor=white) npm

**Purpose:** Frontend dependency management.

The Docker build uses:

```bash
npm ci
npm run build
```

---

## ![Docker](https://img.shields.io/badge/Docker-multi--stage_build-2496ED?logo=docker&logoColor=white) Docker

**Purpose:** Reproducible application packaging.

ParaTrace uses a two-stage image:

```text
Stage 1
Node.js → compile React frontend

Stage 2
Python → install research stack
       → copy FastAPI API
       → copy built frontend
       → serve application
```

---

## ![Render](https://img.shields.io/badge/Render-deployment-000000?logo=render&logoColor=white) Render

**Purpose:** Deployment target for the Docker web service.

Configured through:

```text
render.yaml
```

---

# Development Tooling

## ![pytest](https://img.shields.io/badge/pytest-testing-0A9EDC?logo=pytest&logoColor=white) pytest

**Purpose:** Python testing dependency.

---

## ![Ruff](https://img.shields.io/badge/Ruff-linting-D7FF64?logo=ruff&logoColor=black) Ruff

**Purpose:** Python linting and code-quality tooling.

---

## ![tqdm](https://img.shields.io/badge/tqdm-progress_tracking-FFC107) tqdm

**Purpose:** Progress reporting for longer-running Python workflows.

---

# Complete Stack by Repository Area

| Area | Technologies |
| --- | --- |
| `frontend/src/` | ![React](https://img.shields.io/badge/React-18-20232A?logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) ![Recharts](https://img.shields.io/badge/Recharts-charts-22B5BF) ![CSS](https://img.shields.io/badge/CSS-custom_UI-663399?logo=css&logoColor=white) |
| `frontend/` build | ![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white) ![npm](https://img.shields.io/badge/npm-packages-CB3837?logo=npm&logoColor=white) |
| `api/` | ![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi&logoColor=white) ![Pydantic](https://img.shields.io/badge/Pydantic-validation-E92063?logo=pydantic&logoColor=white) ![Starlette](https://img.shields.io/badge/Starlette-ASGI-2E7D32) ![Uvicorn](https://img.shields.io/badge/Uvicorn-server-499848) |
| `src/paratrace/ingestion/` | ![Python](https://img.shields.io/badge/Python-ingestion-3776AB?logo=python&logoColor=white) ![pylangacq](https://img.shields.io/badge/pylangacq-CHAT-4B8BBE) |
| `src/paratrace/features/` | ![spaCy](https://img.shields.io/badge/spaCy-NLP-09A3D5?logo=spacy&logoColor=white) ![Sentence Transformers](https://img.shields.io/badge/Sentence_Transformers-embeddings-FFD21E?logo=huggingface&logoColor=black) ![lexicalrichness](https://img.shields.io/badge/lexicalrichness-metrics-6C63FF) ![NumPy](https://img.shields.io/badge/NumPy-numerics-013243?logo=numpy&logoColor=white) ![SciPy](https://img.shields.io/badge/SciPy-distance-8CAAE6?logo=scipy&logoColor=white) |
| `src/paratrace/rewriting/` | ![OpenAI](https://img.shields.io/badge/OpenAI-rewriting-412991?logo=openai&logoColor=white) ![Anthropic](https://img.shields.io/badge/Anthropic-rewriting-191919?logo=anthropic&logoColor=white) ![dotenv](https://img.shields.io/badge/python--dotenv-env-ECD53F) |
| `src/paratrace/modeling/` | ![scikit-learn](https://img.shields.io/badge/scikit--learn-modeling-F7931E?logo=scikitlearn&logoColor=white) ![pandas](https://img.shields.io/badge/pandas-tables-150458?logo=pandas&logoColor=white) ![NumPy](https://img.shields.io/badge/NumPy-arrays-013243?logo=numpy&logoColor=white) ![SciPy](https://img.shields.io/badge/SciPy-statistics-8CAAE6?logo=scipy&logoColor=white) |
| deployment | ![Docker](https://img.shields.io/badge/Docker-container-2496ED?logo=docker&logoColor=white) ![Render](https://img.shields.io/badge/Render-hosting-000000?logo=render&logoColor=white) |

---

## Design Principle

ParaTrace keeps four layers deliberately separate:

1. **Speech representation** — preserve the original linguistic trace.
2. **Feature representation** — extract measurable biomarkers.
3. **Generative transformation** — apply controlled LLM rewrites.
4. **Presentation** — expose the resulting evidence through an interactive research interface.

That separation makes it possible to study what the LLM changes instead of treating the complete system as a black box.
