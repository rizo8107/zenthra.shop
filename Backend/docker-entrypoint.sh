#!/bin/sh
set -e

PORT="${PORT:-8080}"
SERVER_PORT="${SERVER_PORT:-3001}"

echo "=========================================="
echo "Starting Zenthra Backend Services..."
echo "=========================================="
echo "API Port: ${SERVER_PORT}"
echo "Static Port: ${PORT}"
echo "=========================================="

# Start API server on port 3001
echo "[API] Starting API server on port ${SERVER_PORT}..."
SERVER_PORT=${SERVER_PORT} node dist-server/server/local.js &
API_PID=$!
echo "[API] API server started with PID ${API_PID}"

# Wait a moment for API to initialize
sleep 2

# Start static file server on port 8080
echo "[Static] Starting static server on port ${PORT}..."
npx serve -s dist -l tcp://0.0.0.0:${PORT} &
STATIC_PID=$!
echo "[Static] Static server started with PID ${STATIC_PID}"

echo "=========================================="
echo "Both servers started successfully!"
echo "API: http://localhost:${SERVER_PORT}/api/*"
echo "Static: http://localhost:${PORT}/*"
echo "=========================================="

term_handler() {
  echo "[Shutdown] Received shutdown signal..."
  kill -TERM "$API_PID" 2>/dev/null || true
  kill -TERM "$STATIC_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
  wait "$STATIC_PID" 2>/dev/null || true
  echo "[Shutdown] All services stopped."
}

trap term_handler INT TERM

# Monitor both processes
while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[Error] API server died!"
    wait "$API_PID"
    EXIT_CODE=$?
    term_handler
    exit "$EXIT_CODE"
  fi

  if ! kill -0 "$STATIC_PID" 2>/dev/null; then
    echo "[Error] Static server died!"
    wait "$STATIC_PID"
    EXIT_CODE=$?
    term_handler
    exit "$EXIT_CODE"
  fi

  sleep 1
done
