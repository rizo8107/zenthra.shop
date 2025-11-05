#!/bin/sh
set -e

PORT="${PORT:-8080}"
SERVER_PORT="${SERVER_PORT:-3001}"

echo "Starting webhook/API server on port ${SERVER_PORT}"
node dist-server/server/index.js &
API_PID=$!

echo "Starting static site on port ${PORT}"
npx serve -s dist -l tcp://0.0.0.0:${PORT} &
STATIC_PID=$!

term_handler() {
  echo "Shutting down..."
  kill -TERM "$API_PID" 2>/dev/null || true
  kill -TERM "$STATIC_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
  wait "$STATIC_PID" 2>/dev/null || true
}

trap term_handler INT TERM

while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    wait "$API_PID"
    EXIT_CODE=$?
    term_handler
    exit "$EXIT_CODE"
  fi

  if ! kill -0 "$STATIC_PID" 2>/dev/null; then
    wait "$STATIC_PID"
    EXIT_CODE=$?
    term_handler
    exit "$EXIT_CODE"
  fi

  sleep 1
done

