#!/bin/bash
# .claude/hooks/evaluate.sh
#
# Two-layer permission evaluator for Claude Code.
# Layer 1 (this file): fast rules that handle the obvious cases.
# Layer 2 (llm_classify.py): LLM classifier for ambiguous cases.
#
# Contract: reads tool call JSON on stdin, writes a hookSpecificOutput
# JSON on stdout, or exits 0 with no output to fall through to the default.

set -euo pipefail

# Pick a Python interpreter. On Windows, `python3` often resolves to the
# Microsoft Store stub; `python` usually points at the real install.
if command -v python >/dev/null 2>&1; then
  PY=python
elif command -v python3 >/dev/null 2>&1; then
  PY=python3
else
  # No Python — fall through to Claude Code's normal permission prompt.
  exit 0
fi

input=$(cat)
export HOOK_INPUT="$input"

read_field() {
  "$PY" - "$1" <<'PY'
import json, os, sys
key = sys.argv[1]
try:
    data = json.loads(os.environ.get("HOOK_INPUT", "") or "{}")
except Exception:
    data = {}
tool_input = data.get("tool_input") or {}
if key == "tool_name":
    print(data.get("tool_name", "") or "")
elif key == "command":
    print(tool_input.get("command", "") or "")
elif key == "file_path":
    print(tool_input.get("file_path", "") or "")
PY
}

tool_name=$(read_field tool_name)
command=$(read_field command)
file_path=$(read_field file_path)

# Helper: emit a decision and exit. Usage: decide allow|deny|ask "reason"
decide() {
  local decision="$1"
  local reason="$2"
  "$PY" - "$decision" "$reason" <<'PY'
import json, sys
d, r = sys.argv[1], sys.argv[2]
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": d,
        "permissionDecisionReason": r,
    }
}))
PY
  exit 0
}

# ----------------------------------------------------------------------------
# ALLOW: read-only tools are always safe
# ----------------------------------------------------------------------------
if [[ "$tool_name" =~ ^(Read|Glob|Grep|LS|WebFetch|WebSearch)$ ]]; then
  decide allow "Read-only tool ($tool_name)"
fi

# ----------------------------------------------------------------------------
# DENY: hard blocks on files that should never be touched
# ----------------------------------------------------------------------------
if [[ "$tool_name" =~ ^(Write|Edit|MultiEdit)$ ]]; then
  # Block writes to env files, credentials, ssh keys, etc.
  if echo "$file_path" | grep -qiE '(^|/)(\.env|\.env\.|secrets?\.|credentials?\.|.*\.pem$|.*\.key$|\.ssh/)'; then
    decide deny "Writing to sensitive file: $file_path"
  fi
  # Block writes outside the project directory
  if [[ "$file_path" == /* ]] && [[ "$file_path" != "$CLAUDE_PROJECT_DIR"* ]]; then
    decide deny "Writing outside project directory: $file_path"
  fi
fi

# ----------------------------------------------------------------------------
# BASH: rules vary by subcommand
# ----------------------------------------------------------------------------
if [[ "$tool_name" == "Bash" ]]; then
  # --- Hard denies: unambiguously dangerous patterns ---
  if echo "$command" | grep -qE '(^|[^a-zA-Z0-9_])rm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)'; then
    decide deny "rm -rf blocked"
  fi
  if echo "$command" | grep -qE '(^|;|&&|\|)[[:space:]]*sudo[[:space:]]'; then
    decide deny "sudo blocked"
  fi
  if echo "$command" | grep -qE 'curl.*\|[[:space:]]*(sh|bash|zsh)'; then
    decide deny "curl-pipe-to-shell blocked"
  fi
  if echo "$command" | grep -qE 'wget.*\|[[:space:]]*(sh|bash|zsh)'; then
    decide deny "wget-pipe-to-shell blocked"
  fi
  if echo "$command" | grep -qE '>[[:space:]]*/(etc|usr|bin|sbin|boot)/'; then
    decide deny "Writing to system directory blocked"
  fi
  if echo "$command" | grep -qE ':\(\)\{[[:space:]]*:\|'; then
    decide deny "Fork bomb blocked"
  fi
  if echo "$command" | grep -qE 'git[[:space:]]+push.*--force|git[[:space:]]+push.*-f([[:space:]]|$)'; then
    decide deny "git push --force blocked (override via normal prompt if intentional)"
  fi

  # --- Fast allows: common, safe dev commands ---
  # Read-only git
  if echo "$command" | grep -qE '^git[[:space:]]+(status|diff|log|show|branch|remote|config[[:space:]]+--get|rev-parse|ls-files|blame)([[:space:]]|$)'; then
    decide allow "Read-only git command"
  fi
  # Safe file inspection
  if echo "$command" | grep -qE '^(ls|pwd|cat|head|tail|wc|file|stat|tree|find|which|whoami|date|echo)([[:space:]]|$)'; then
    decide allow "Safe inspection command"
  fi
  # Node/npm read-only and test commands
  if echo "$command" | grep -qE '^(npm|pnpm|yarn)[[:space:]]+(test|run[[:space:]]+test|run[[:space:]]+lint|run[[:space:]]+build|run[[:space:]]+typecheck|list|ls|outdated|view|info)([[:space:]]|$)'; then
    decide allow "Safe npm/pnpm/yarn command"
  fi
  # Node/Python execution of project files
  if echo "$command" | grep -qE '^(node|python3?|tsx|ts-node)[[:space:]]'; then
    # allow only if not using -e / -c inline code
    if ! echo "$command" | grep -qE '[[:space:]]-[eEc]([[:space:]]|$)'; then
      decide allow "Running project script"
    fi
  fi
fi

# ----------------------------------------------------------------------------
# Everything else: defer to the LLM classifier.
# If the classifier is unavailable or errors, we exit 0 (fall through to
# the normal permission prompt) rather than block.
# ----------------------------------------------------------------------------
CLASSIFIER="$CLAUDE_PROJECT_DIR/.claude/hooks/llm_classify.py"
if [[ -f "$CLASSIFIER" ]]; then
  echo "$input" | "$PY" "$CLASSIFIER" || exit 0
else
  exit 0
fi
