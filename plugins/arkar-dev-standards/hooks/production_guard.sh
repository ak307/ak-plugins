#!/usr/bin/env bash
# Runs the arkar production guard with whichever Python 3 this computer has
# (python3, python or the Windows "py" launcher). Without a working Python it
# can't inspect commands properly, so it asks AK before anything that might
# touch a database or destroy work, instead of silently letting it through.

guard_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
input="$(cat)"

for candidate in "python3" "python" "py -3"; do
  if $candidate -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >/dev/null 2>&1; then
    printf '%s' "$input" | $candidate "$guard_dir/production_guard.py"
    exit 0
  fi
done

# Look only at what the tool will run or open, not at folder names in the event.
target="$(printf '%s' "$input" | grep -oE '"(command|file_path|tool_name)"[[:space:]]*:[[:space:]]*"([^"\\]|\\.)*"')"
if printf '%s' "$target" | grep -Eiq 'migrate|db:seed|db:wipe|tinker|pytest|phpunit|pest|manage\.py|alembic|artisan|mysql|psql|sqlite3|drop |truncate|delete from|push[^"]*(-f|--force)|reset --hard|rm -rf|\.env'; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"arkar production guard could not run because Python 3 was not found on this computer, so it cannot check this command. Install Python 3. Approve only if you are sure this does not touch production data."}}'
fi
exit 0
