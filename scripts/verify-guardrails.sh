#!/usr/bin/env bash
set -e
echo "== Guardrails quick check =="
echo "- ARCHITECTURE_LOCK present?"; test -f docs/ARCHITECTURE_LOCK.md && echo "yes" || (echo "missing" && exit 1)
echo "- PR template present?"; test -f .github/PULL_REQUEST_TEMPLATE.md && echo "yes" || (echo "missing" && exit 1)
echo "- CODEOWNERS present?"; test -f CODEOWNERS && echo "yes" || (echo "missing" && exit 1)
echo "ok"
