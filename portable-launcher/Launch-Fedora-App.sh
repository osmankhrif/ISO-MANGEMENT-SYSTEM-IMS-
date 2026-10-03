#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================================"
echo " ISO System (IMS) - Offline Launcher"
echo " Author / Publisher: Osman Khrif"
echo " Integrated Industrial Management System (ISO 9001 / 14001 / 45001)"
echo "======================================================================"
echo ""

PORT=3000

# Function to launch browser in application window mode
launch_browser() {
  local url="$1"
  if command -v google-chrome &> /dev/null; then
    google-chrome --app="$url" &
  elif command -v microsoft-edge &> /dev/null; then
    microsoft-edge --app="$url" &
  elif command -v chromium &> /dev/null; then
    chromium --app="$url" &
  elif command -v firefox &> /dev/null; then
    firefox --new-window "$url" &
  elif command -v xdg-open &> /dev/null; then
    xdg-open "$url" &
  fi
}

# 1. Try python3 http.server
if command -v python3 &> /dev/null; then
  echo "[INFO] Starting local offline server via python3 on port $PORT..."
  python3 -m http.server $PORT --directory dist &
  SERVER_PID=$!
  sleep 1
  launch_browser "http://localhost:$PORT"
  echo "Press Ctrl+C to terminate application server (PID $SERVER_PID)"
  wait $SERVER_PID
  exit 0
fi

# 2. Try npx serve
if command -v npx &> /dev/null; then
  echo "[INFO] Starting local offline server via npx serve..."
  npx --yes serve -s dist -l $PORT &
  SERVER_PID=$!
  sleep 1
  launch_browser "http://localhost:$PORT"
  echo "Press Ctrl+C to terminate application server (PID $SERVER_PID)"
  wait $SERVER_PID
  exit 0
fi

# 3. Fallback direct xdg-open
xdg-open "dist/index.html" &
