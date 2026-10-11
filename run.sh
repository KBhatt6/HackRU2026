#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
BACKEND_PORT="${BACKEND_PORT:-6000}"
EXPO_API_URL="${EXPO_PUBLIC_API_URL:-}"

if [[ -z "${EXPO_API_URL}" ]]; then
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
  if [[ -n "${LAN_IP}" ]]; then
    EXPO_API_URL="http://${LAN_IP}:${BACKEND_PORT}"
  else
    EXPO_API_URL="http://127.0.0.1:${BACKEND_PORT}"
  fi
fi

command -v "${PYTHON_BIN}" >/dev/null 2>&1 || { echo "error: ${PYTHON_BIN} was not found" >&2; exit 1; }
"${PYTHON_BIN}" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 9) else 1)' || {
  echo "error: RU Relief requires Python 3.9 or newer (found $(${PYTHON_BIN} --version 2>&1))" >&2
  echo "       Set PYTHON_BIN to a compatible interpreter and rerun." >&2
  exit 1
}
command -v npm >/dev/null 2>&1 || { echo "error: npm was not found; install Node.js and rerun" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "error: curl was not found" >&2; exit 1; }

if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  echo "Creating ${VENV_DIR}"
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi
VENV_PYTHON="${VENV_DIR}/bin/python"

echo "Installing backend dependencies"
"${VENV_DIR}/bin/pip" install -r "${ROOT_DIR}/backend/requirements.txt"
echo "Seeding local SQLite database"
(cd "${ROOT_DIR}" && "${VENV_PYTHON}" -m backend.seed)
echo "Installing frontend dependencies"
(cd "${ROOT_DIR}/frontend" && npm install)

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting backend at http://127.0.0.1:${BACKEND_PORT}/api"
if curl --silent --fail "http://127.0.0.1:${BACKEND_PORT}/api" >/dev/null 2>&1; then
  echo "Reusing the already-running backend on port ${BACKEND_PORT}"
else
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"${BACKEND_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "error: port ${BACKEND_PORT} is occupied, but it is not serving RU Relief" >&2
    echo "       Stop the process shown by: lsof -nP -iTCP:${BACKEND_PORT} -sTCP:LISTEN" >&2
    exit 1
  fi
  (
    cd "${ROOT_DIR}"
    RU_RELIEF_DATABASE="${ROOT_DIR}/database/ru_relief.db" BACKEND_PORT="${BACKEND_PORT}" "${VENV_PYTHON}" run.py
  ) &
  BACKEND_PID=$!
fi

if [[ -n "${BACKEND_PID:-}" ]]; then
  for _ in {1..30}; do
    curl --silent --fail "http://127.0.0.1:${BACKEND_PORT}/api" >/dev/null 2>&1 && break
    kill -0 "${BACKEND_PID}" 2>/dev/null || { wait "${BACKEND_PID}"; exit 1; }
    sleep 1
  done
fi
curl --silent --fail "http://127.0.0.1:${BACKEND_PORT}/api" >/dev/null 2>&1 || {
  echo "error: backend did not become ready within 30 seconds" >&2
  exit 1
}

echo "Starting Expo with EXPO_PUBLIC_API_URL=${EXPO_API_URL}"
(cd "${ROOT_DIR}/frontend" && EXPO_PUBLIC_API_URL="${EXPO_API_URL}" npm run start -- --clear)
