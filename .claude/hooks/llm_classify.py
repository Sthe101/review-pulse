#!/usr/bin/env python3
"""
.claude/hooks/llm_classify.py

Layer 2 of the permission evaluator. Reads a Claude Code PreToolUse event
on stdin and asks Haiku to classify it against the project's policy.

Output on stdout is a hookSpecificOutput JSON that Claude Code consumes.
On any error we exit 0 with no output, which makes Claude Code fall
through to the normal permission prompt - the safe default.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import anthropic

PROJECT_DIR = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).resolve()
POLICY_PATH = PROJECT_DIR / ".claude" / "hooks" / "permission-policy.md"

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 400

SYSTEM_PROMPT = """You are a security classifier for tool calls made by a coding agent.

You will receive:
1. A policy document describing what is safe in this project.
2. A tool call (name + input) the agent wants to make.

Classify the call into exactly one bucket:
- GREEN: clearly safe per the policy. Auto-approve, no user interruption.
- YELLOW: ambiguous or moderately risky. Ask the user to confirm.
- RED: clearly unsafe, destructive, or outside policy. Block.

Return ONLY a JSON object, no prose, no code fences:
{"score": "GREEN"|"YELLOW"|"RED", "reason": "<one short sentence>"}

Default to YELLOW when uncertain. Never return GREEN for anything that
writes to system paths, exfiltrates data, installs untrusted code, or
touches credentials."""


def emit(decision: str, reason: str) -> None:
    """Write a hookSpecificOutput JSON to stdout."""
    out = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": reason,
        }
    }
    json.dump(out, sys.stdout)
    sys.stdout.write("\n")


def fallthrough() -> None:
    """Emit nothing - Claude Code will use its normal permission flow."""
    sys.exit(0)


def load_policy() -> str:
    if POLICY_PATH.exists():
        return POLICY_PATH.read_text()
    return "(No policy document found. Be conservative.)"


def classify(event: dict) -> dict | None:
    """Call Haiku to classify the tool call. Returns parsed dict or None."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None

    policy = load_policy()
    tool_name = event.get("tool_name", "")
    tool_input = event.get("tool_input", {})
    cwd = event.get("cwd", "")

    user_msg = (
        f"## Policy\n\n{policy}\n\n"
        f"## Tool call\n\n"
        f"Tool: {tool_name}\n"
        f"CWD:  {cwd}\n"
        f"Input:\n```json\n{json.dumps(tool_input, indent=2)}\n```\n\n"
        f"Classify this call. Respond with JSON only."
    )

    try:
        client = anthropic.Anthropic()
        resp = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        text = "".join(
            block.text for block in resp.content if getattr(block, "type", "") == "text"
        ).strip()
        # Strip code fences if the model added them despite instructions
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        return json.loads(text)
    except Exception:
        return None


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError:
        fallthrough()
        return

    result = classify(event)
    if result is None:
        fallthrough()
        return

    score = str(result.get("score", "")).upper()
    reason = str(result.get("reason", "(no reason given)"))

    if score == "GREEN":
        emit("allow", f"[AI-GREEN] {reason}")
    elif score == "RED":
        emit("deny", f"[AI-RED] {reason}")
    else:
        # YELLOW or anything unexpected -> ask
        emit("ask", f"[AI-YELLOW] {reason}")


if __name__ == "__main__":
    main()
