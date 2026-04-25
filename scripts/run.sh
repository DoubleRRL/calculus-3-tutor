#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-.venv}"
REQ_FILE="requirements.txt"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Missing python executable: ${PYTHON_BIN}"
  exit 1
fi

if [ ! -d "${VENV_DIR}" ]; then
  echo "Creating virtual env at ${VENV_DIR}..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

if [ -z "${VIRTUAL_ENV:-}" ]; then
  # shellcheck disable=SC1091
  source "${VENV_DIR}/bin/activate"
fi

if [ -f "$REQ_FILE" ]; then
  echo "Installing dependencies from ${REQ_FILE}..."
  pip install -r "$REQ_FILE"
fi

if ! command -v ollama >/dev/null 2>&1; then
  echo "Warning: ollama command not found. Install Ollama to generate new problems."
else
  if ! pgrep -f "ollama serve" >/dev/null 2>&1; then
    echo "Warning: Ollama service may not be running. Start it with: ollama serve"
  else
    echo "Ollama service looks active."
  fi
fi

echo "Launching CalcTutor at http://127.0.0.1:7860 ..."
PYTHONPATH="$ROOT_DIR" python app.py
