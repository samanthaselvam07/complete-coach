#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

limit="${MAX_FILE_LINES:-800}"

oversized="$(
  find apps/web docs scripts .github \
    -path 'apps/web/.next' -prune -o \
    -path 'apps/web/app/generated' -prune -o \
    -path 'apps/web/coverage' -prune -o \
    -path 'apps/web/playwright-report' -prune -o \
    -path 'apps/web/test-results' -prune -o \
    -type f \( \
      -name '*.ts' -o \
      -name '*.tsx' -o \
      -name '*.js' -o \
      -name '*.mjs' -o \
      -name '*.json' -o \
      -name '*.css' -o \
      -name '*.md' -o \
      -name '*.sh' -o \
      -name '*.yml' -o \
      -name '*.yaml' \
    \) -exec wc -l {} + |
    awk -v limit="$limit" '$1 > limit && $2 != "total" { print $1 " " $2 }'
)"

if [[ -n "$oversized" ]]; then
  printf 'check-file-size failed: files over %s lines:\n' "$limit" >&2
  printf '%s\n' "$oversized" >&2
  exit 1
fi

printf 'check-file-size: ok\n'
