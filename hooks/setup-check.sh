#!/usr/bin/env bash
# SessionStart hook for the project-setup skill.
#
# Reports the state of this project's workflow-skill config so Claude can tell the
# user what's missing BEFORE a skill fails mid-task. Three outcomes:
#   1. No .claude/settings.local.json at all -> stay SILENT (not every project uses
#      the workflow skills; nagging a plain coding repo is noise).
#   2. Config exists and looks complete    -> stay silent.
#   3. Config exists but is INCOMPLETE     -> print what's missing + how to fix.
#
# stdout on exit 0 is auto-injected into Claude's context.

INPUT="$(cat 2>/dev/null || true)"

PROJ="${CLAUDE_PROJECT_DIR:-$PWD}"
if command -v jq >/dev/null 2>&1 && [ -n "$INPUT" ]; then
  CWD="$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null || true)"
  [ -n "$CWD" ] && PROJ="$CWD"
fi

CFG="$PROJ/.claude/settings.local.json"
ALT="$PROJ/.claude/tlm.local.json"

# Nothing configured at all -> silent. /project-setup is opt-in.
[ -f "$CFG" ] || [ -f "$ALT" ] || exit 0

# jq is required to inspect the config; without it, say so once rather than guessing.
if ! command -v jq >/dev/null 2>&1; then
  echo "[project-setup] A tlm config exists at $CFG but jq is not installed, so it could not be"
  echo "checked. Install jq, or read the file directly if a workflow skill reports a problem."
  exit 0
fi

# Locate the tlm block: settings.local.json first, then the fallback file.
TLM=""
if [ -f "$CFG" ]; then
  TLM="$(jq -c '.tlm // empty' "$CFG" 2>/dev/null || true)"
fi
if [ -z "$TLM" ] && [ -f "$ALT" ]; then
  TLM="$(jq -c '. // empty' "$ALT" 2>/dev/null || true)"
fi

# settings.local.json exists but carries no tlm block. That is a normal, complete
# state for a project that only uses the coding skills -> silent.
[ -n "$TLM" ] || exit 0

MISSING=""
add() { MISSING="${MISSING}  - $1"$'\n'; }

q() { printf '%s' "$TLM" | jq -r "$1 // empty" 2>/dev/null; }

# --- project ---------------------------------------------------------------
[ -n "$(q '.project.type')" ]       || add "tlm.project.type is unset — fe-coding will re-detect the stack every session"
[ -n "$(q '.project.baseBranch')" ] || add "tlm.project.baseBranch is unset — ticket-workflow cannot cut branches"

# --- design / figma --------------------------------------------------------
if [ "$(q '.design.enabled')" = "true" ]; then
  TOKEN_KEY="$(q '.design.tokenEnvKey')"; [ -n "$TOKEN_KEY" ] || TOKEN_KEY="FIGMA_ACCESS_TOKEN"
  TOKEN_VAL=""
  [ -f "$CFG" ] && TOKEN_VAL="$(jq -r --arg k "$TOKEN_KEY" '.env[$k] // empty' "$CFG" 2>/dev/null || true)"
  case "$TOKEN_VAL" in
    ""|*REPLACE_ME*) add "$TOKEN_KEY is missing or still a placeholder — figma-to-code will stop rather than guess a design" ;;
  esac
  if [ -f "$CFG" ] && ! jq -e '.mcpServers | keys[] | select(test("figma|framelink"; "i"))' "$CFG" >/dev/null 2>&1; then
    add "no Figma MCP server in mcpServers — figma-to-code cannot read designs"
  fi
fi

# --- tickets ---------------------------------------------------------------
if [ "$(q '.tickets.enabled')" = "true" ]; then
  [ -n "$(q '.tickets.system')" ]              || add "tlm.tickets.system is unset"
  [ -n "$(q '.tickets.idPattern')" ]           || add "tlm.tickets.idPattern is unset — ticket ids cannot be found in commits"
  [ -n "$(q '.tickets.statuses.inProgress')" ] || add "tlm.tickets.statuses.inProgress is unset"
  [ -n "$(q '.tickets.statuses.inReview')" ]   || add "tlm.tickets.statuses.inReview is unset"
  case "$(q '.tickets.urlTemplate')" in
    ""|*REPLACE_ME*) add "tlm.tickets.urlTemplate is missing or a placeholder — release notes cannot link tickets" ;;
  esac
fi

# --- chat / slack ----------------------------------------------------------
if [ "$(q '.chat.enabled')" = "true" ]; then
  CH_COUNT="$(printf '%s' "$TLM" | jq -r '(.chat.channels // []) | length' 2>/dev/null || echo 0)"
  [ "$CH_COUNT" -gt 0 ] 2>/dev/null || add "tlm.chat.channels is empty — mobile-release-notes has nowhere to post"
  if printf '%s' "$TLM" | jq -e '(.chat.channels // []) | any(.id | test("REPLACE_ME"))' >/dev/null 2>&1; then
    add "a chat channel id is still a placeholder"
  fi
fi

# --- gitignore safety ------------------------------------------------------
if [ -f "$CFG" ] && command -v git >/dev/null 2>&1; then
  if git -C "$PROJ" rev-parse --git-dir >/dev/null 2>&1; then
    if ! git -C "$PROJ" check-ignore -q ".claude/settings.local.json" 2>/dev/null; then
      add "SECURITY: .claude/settings.local.json is NOT gitignored but holds secrets — add it to .gitignore"
    fi
  fi
fi

# Everything present -> silent.
[ -n "$MISSING" ] || exit 0

echo "[project-setup] This project's workflow-skill config is incomplete:"
echo ""
printf '%s' "$MISSING"
echo ""
echo "ACTION FOR CLAUDE (do this once, at the start of the session):"
echo "1. Mention the incomplete config briefly — do NOT dump this list verbatim, and do NOT block"
echo "   the user's actual request to fix it."
echo "2. Offer /project-setup to complete it. If they decline, continue normally and do not re-offer."
echo "3. If a SECURITY line appears above, raise that one immediately and specifically — a tracked"
echo "   settings.local.json means credentials are about to be committed."
echo "4. When a workflow skill later needs one of these values, ask for it inline at planning time"
echo "   rather than failing. Exception: a Figma design fetch that errors is a HARD STOP — never"
echo "   write UI code from a guessed design."
exit 0
