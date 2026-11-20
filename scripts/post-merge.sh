#!/bin/bash
set -euo pipefail

# Post-merge setup must update the Replit development database only.
# drizzle.config.ts prefers NEON_DATABASE_URL, which is reserved for Neon
# production in this project, so remove it for this child process.
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required for the Replit development database."
  exit 1
fi

pnpm install --frozen-lockfile

push_log="$(mktemp)"
set +e
env -u NEON_DATABASE_URL pnpm --filter @workspace/db run push 2>&1 | tee "$push_log"
push_status="${PIPESTATUS[0]}"
set -e

if [[ "$push_status" -ne 0 ]] || grep -q "Interactive prompts require a TTY" "$push_log"; then
  rm -f "$push_log"
  echo "Database schema push did not complete; review the migration prompt or error above."
  exit 1
fi

rm -f "$push_log"
