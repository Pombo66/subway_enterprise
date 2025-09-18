#!/usr/bin/env bash
set -e
echo "== PORTS =="
lsof -nP -iTCP:3001 -sTCP:LISTEN || echo ":3001 DOWN"
lsof -nP -iTCP:3002 -sTCP:LISTEN || echo ":3002 DOWN"
lsof -nP -iTCP:5432 -sTCP:LISTEN || echo ":5432 DOWN"
echo "== BFF =="
curl -sS http://127.0.0.1:3001/healthz || true; echo
echo "== ADMIN =="
curl -sI http://localhost:3002/orders | head -n1 || true
