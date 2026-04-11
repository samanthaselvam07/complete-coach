#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/create-and-publish.sh <slug> [create-project args...] [--public|--private] [--skip-configure]

Environment:
  BOOTSTRAP_SECRET_<NAME>=value  Upload GitHub secrets after repository creation
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

visibility="--private"
args=()
slug_seen="false"
repo_slug=""
module=""
owner=""
skip_configure="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --public)
      visibility="--public"
      shift
      ;;
    --private)
      visibility="--private"
      shift
      ;;
    --skip-configure)
      skip_configure="true"
      shift
      ;;
    --module)
      module="$2"
      args+=("$1" "$2")
      shift 2
      ;;
    --github-owner)
      owner="$2"
      args+=("$1" "$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ "$slug_seen" == "false" ]]; then
        repo_slug="$1"
        slug_seen="true"
      fi
      args+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$repo_slug" ]]; then
  usage
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI 'gh' is required." >&2
  exit 1
fi

script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_root/.." && pwd)"
"$project_root/scripts/create-project.sh" "${args[@]}"

destination="${HOME}/projects/${repo_slug}"
if [[ -n "$module" && "$module" == github.com/*/* ]]; then
  remote_repo="${module#github.com/}"
elif [[ -n "$owner" ]]; then
  remote_repo="$owner/$repo_slug"
else
  echo "Provide --module or --github-owner for GitHub publishing." >&2
  exit 1
fi

if command -v git >/dev/null 2>&1; then
  git -C "$destination" add -A
  if ! git -C "$destination" diff --cached --quiet; then
    git -C "$destination" commit -m "chore: bootstrap project from starter" >/dev/null 2>&1 || true
  fi
fi

gh repo create "$remote_repo" "$visibility" --source "$destination" --remote origin --push

if [[ "$skip_configure" != "true" ]]; then
  "$destination/scripts/configure-github-repo.sh" "$remote_repo"
fi

echo "Published GitHub repository: https://github.com/$remote_repo"
