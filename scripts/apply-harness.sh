#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'__USAGE__'
Usage:
  ./scripts/apply-harness.sh <destination> [--display-name "My Project"] [--module github.com/org/repo] [--github-owner your-handle] [--copyright "Your Name"]

Applies the AI dev harness to an existing or new project directory.
Creates or updates .agents/, .codex/, .githooks/, .github/, docs/, and
scripts/ with the harness conventions.

Example:
  ./scripts/apply-harness.sh ~/projects/my-new-project \
    --display-name "My New Project" \
    --module github.com/my-org/my-new-project \
    --github-owner my-org
__USAGE__
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

destination="$1"
shift

display_name=""
module=""
github_owner=""
copyright_holder="${USER:-Your Name}"
year="$(date +%Y)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --display-name)
      display_name="$2"
      shift 2
      ;;
    --module)
      module="$2"
      shift 2
      ;;
    --github-owner)
      github_owner="$2"
      shift 2
      ;;
    --copyright)
      copyright_holder="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$display_name" ]]; then
  display_name="$(printf '%s' "$(basename "$destination")" | tr '-' ' ' | awk '{for (i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')"
fi

if [[ -z "$module" ]]; then
  module="github.com/your-org/$(basename "$destination")"
fi

if [[ -z "$github_owner" ]]; then
  github_owner="$(basename "$(dirname "$destination")")"
fi

harness_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$destination"

declare -a dirs=(".agents" ".codex" ".githooks" ".github" "docs" "scripts")
declare -a files=(
  "AGENTS.md"
  "CODEX_INITIAL_PROMPT.md"
  "REVIEW_GATE_PROMPT.md"
  "SECURITY.md"
  "CODE_OF_CONDUCT.md"
  "CONTRIBUTING.md"
  "LICENSE"
  "CHANGELOG.md"
  ".editorconfig"
  ".gitignore"
  ".release-please-config.json"
  ".release-please-manifest.json"
)

for dir in "${dirs[@]}"; do
  if [[ -d "$harness_root/$dir" ]]; then
    mkdir -p "$destination/$dir"
    rsync -a --exclude='.git' "$harness_root/$dir/" "$destination/$dir/"
  fi
done

for file in "${files[@]}"; do
  if [[ -f "$harness_root/$file" ]]; then
    cp "$harness_root/$file" "$destination/$file"
  fi
done

replace_token() {
  local token="$1"
  local value="$2"
  local escaped
  escaped="$(printf '%s' "$value" | sed 's/[&|]/\\&/g')"
  while IFS= read -r -d '' f; do
    sed -i "s|$token|$escaped|g" "$f"
  done < <(find "$destination" \
    \( -path '*/.git/*' \
    -o -path '*/node_modules/*' \
    -o -path '*/coverage/*' \
    -o -path '*/build/*' \
    -o -path '*/dist/*' \) -prune \
    -o -type f -print0)
}

replace_token "complete-coach" "$(basename "$destination")"
replace_token "Complete Coach" "$display_name"
replace_token "github.com/Mikes071/complete-coach" "$module"
replace_token "Mikes071" "$github_owner"
replace_token "MikeS071" "$copyright_holder"
replace_token "2026" "$year"

if [[ -x "$destination/scripts/bootstrap.sh" ]]; then
  chmod +x "$destination/scripts/"*.sh 2>/dev/null || true
fi

if command -v git >/dev/null 2>&1 && [[ ! -d "$destination/.git" ]]; then
  git -C "$destination" init -b main >/dev/null 2>&1 || true
fi

echo "Harness applied to: $destination"
echo ""
echo "Suggested next steps:"
echo "  cd $destination"
echo "  cat README.md"
echo "  cat AGENTS.md"
echo "  # customize .github/workflows/ci.yml for your stack"
echo "  # define your Makefile targets"
