#!/usr/bin/env bash
# Delegate to apply-harness.sh for backward compatibility.
# New projects should use apply-harness.sh directly.
exec "$(dirname "${BASH_SOURCE[0]}")/apply-harness.sh" "$@"
