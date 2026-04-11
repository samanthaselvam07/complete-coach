#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/configure-github-repo.sh <owner/repo> [--default-branch main] [--check build-and-check] [--no-branch-protection]

Environment:
  BOOTSTRAP_SECRET_<NAME>=value  Uploads GitHub Actions/repository secret <NAME>
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

repo="$1"
shift
branch="main"
check_context="build-and-check"
apply_branch_protection="true"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --default-branch)
      branch="$2"
      shift 2
      ;;
    --check)
      check_context="$2"
      shift 2
      ;;
    --no-branch-protection)
      apply_branch_protection="false"
      shift
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

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI 'gh' is required." >&2
  exit 1
fi

labels=(
  "bug,d73a4a,Something is broken"
  "feature,0e8a16,New product or platform capability"
  "documentation,1d76db,Docs or spec updates"
  "chore,6b7280,Maintenance and repository upkeep"
  "security,b60205,Security-related work"
  "breaking-change,bf3989,Requires a coordinated release"
  "good first issue,7057ff,Small well-bounded starter task"
)

for spec in "${labels[@]}"; do
  IFS=',' read -r name color description <<<"$spec"
  gh label create "$name" --repo "$repo" --color "$color" --description "$description" --force >/dev/null
  echo "Configured label: $name"
done

while IFS='=' read -r env_name env_value; do
  [[ -n "$env_name" ]] || continue
  secret_name="${env_name#BOOTSTRAP_SECRET_}"
  printf '%s' "$env_value" | gh secret set "$secret_name" --repo "$repo" >/dev/null
  echo "Uploaded secret: $secret_name"
done < <(env | grep '^BOOTSTRAP_SECRET_' || true)

if [[ "$apply_branch_protection" == "true" ]]; then
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "repos/$repo/branches/$branch/protection" \
    --input - <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["$check_context"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON
  echo "Applied branch protection to $repo:$branch"
fi
