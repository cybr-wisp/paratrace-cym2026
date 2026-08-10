.PHONY: install test lint run-experiment

install:
pip install -e ".[dev]"
python -m spacy download en_core_web_sm

test:
pytest tests/ -v

lint:
ruff check src/ tests/

run-experiment:
python experiments/01_build_dataset.py
python experiments/02_extract_features.py
python experiments/03_generate_rewrites.py
python experiments/04_extract_rewrite_features.py
python experiments/05_train_classifiers.py
python experiments/06_degradation_analysis.py
python experiments/07_generate_results.py
