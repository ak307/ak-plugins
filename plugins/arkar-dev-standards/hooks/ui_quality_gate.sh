#!/usr/bin/env bash
# Runs the arkar UI quality gate with whichever Python 3 this computer has.
# Without Python it does nothing: a missing check must never stop a session.

gate_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
input="$(cat)"

for candidate in "python3" "python" "py -3"; do
  if $candidate -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >/dev/null 2>&1; then
    printf '%s' "$input" | $candidate "$gate_dir/ui_quality_gate.py"
    exit 0
  fi
done
exit 0
