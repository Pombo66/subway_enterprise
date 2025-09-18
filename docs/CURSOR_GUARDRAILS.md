# Cursor Project Guardrails
- Never change technologies listed as **Non-Negotiables** in ARCHITECTURE_LOCK.md.
- If a suggestion conflicts with the Lock, STOP and propose an ADR instead (filename: docs/adr/ADR-<slug>.md) with pros/cons and migration impact.
- Work in small, reviewable diffs (≤ 150 lines) unless asked otherwise.
- Do not regenerate whole files unless explicitly instructed. Prefer patching.
- Before editing, summarize the change plan in 5 bullets and WAIT for confirmation if the plan touches multiple packages.
- Preserve existing exports, public interfaces, and ENV names unless an ADR exists.
- Always add/adjust tests with code changes: unit near code, e2e in /tests/e2e.
- After changes, run: typecheck, lint, tests. Update CI config only if failing.
- Output a checklist of what changed + files touched at the end of each task.
