#!/usr/bin/env bash
# SessionStart hook for the project-setup skill.
#
# Reports the state of this project's workflow-skill config so Claude can tell the
# user what's missing BEFORE a skill fails mid-task. Outcomes:
#   1. No .claude/settings.local.json at all -> stay SILENT (not every project uses
#      the workflow skills; nagging a plain coding repo is noise).
#   2. Config exists and looks complete    -> stay silent.
#   3. Config exists but is INCOMPLETE     -> print what's missing + how to fix.
# Independently:
#   - BASELINE companions (node, jq) missing -> always surface (jq absent = both
#     hooks silently no-op; node absent = npx servers + OpenSpec CLI cannot run).
#   - an openspec/ directory present -> emit the spec-driven reminder.
# These fire regardless of the tlm-config outcome. With node+jq present and no
# config/openspec, the hook stays silent as before.
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

# --- spec-driven (OpenSpec) detection --------------------------------------
# Independent of the tlm config: a repo can be spec-driven without using the
# other workflow skills. If an openspec/ directory exists, this repo is on
# OpenSpec -> remind Claude to drive it by default and announce each CLI call.
# Built with only [ -d ], so it works even when jq is absent.
OPENSPEC_MSG=""
if [ -d "$PROJ/openspec" ]; then
  OPENSPEC_MSG="[spec-driven] This repo is on OpenSpec (openspec/ present).
  - PER-TICKET GATE: when a ticket or a substantial feature starts (new domain/screen, new endpoint,
    altered flow), ASK the user once: apply OpenSpec for this one? Only if they say yes, run the
    spec-driven skill (/opsx:propose <id> -> present proposal -> /opsx:apply via fe-coding -> /opsx:sync
    -> /opsx:archive). If they decline, or it's a trivial fix/copy/rename, run the normal rules skills
    (fe-coding / ticket-workflow) and do NOT touch OpenSpec.
  - TRANSPARENCY (required): whenever you do run an openspec / npx openspec / /opsx:* command, print a
    one-line notice first so the user is aware, e.g.  \"▶ OpenSpec: npx openspec@latest init --tools claude\".
  - If Node < 20.19 or npm is unreachable, say so once and fall back to ordinary fe-coding."
fi

# --- baseline companion tools ----------------------------------------------
# Required-by-capability enforcement starts with the BASELINE: node runs the
# npx-based MCP servers (context7, Framelink) + the OpenSpec CLI; jq powers BOTH
# hooks (without it this hook AND the lint hook silently no-op). Surface either
# when missing — a silent no-op is worse than one line. With both present this
# stays empty, so plain coding repos remain silent.
BASELINE_MSG=""
command -v node >/dev/null 2>&1 || BASELINE_MSG="${BASELINE_MSG}  - node not found — the npx-based MCP servers (context7, Framelink) and the OpenSpec CLI cannot run. Install Node (>=20.19 if you use spec-driven)."$'\n'
command -v jq   >/dev/null 2>&1 || BASELINE_MSG="${BASELINE_MSG}  - jq not found — BOTH plugin hooks (this config check + the fe-coding lint) are DISABLED until it is installed: brew install jq / apt install jq."$'\n'
[ -n "$BASELINE_MSG" ] && BASELINE_MSG="[baseline] Required companion tools are missing (install these first):"$'\n'"${BASELINE_MSG}"

# Emit any accumulated reminders and exit. Used at every point where the
# tlm-config check would otherwise stay silent, so spec-driven repos and repos
# with a broken baseline still get the reminder even without a tlm block.
finish() {
  [ -n "$BASELINE_MSG" ] && printf '%s\n' "$BASELINE_MSG"
  [ -n "$OPENSPEC_MSG" ] && printf '%s\n' "$OPENSPEC_MSG"
  exit 0
}

# Nothing configured at all -> only the baseline / OpenSpec reminders (if any).
[ -f "$CFG" ] || [ -f "$ALT" ] || finish

# jq is required to inspect the config. Its absence is already in BASELINE_MSG;
# just finish (we cannot parse the config without it).
command -v jq >/dev/null 2>&1 || finish

# Locate the tlm block: settings.local.json first, then the fallback file.
TLM=""
if [ -f "$CFG" ]; then
  TLM="$(jq -c '.tlm // empty' "$CFG" 2>/dev/null || true)"
fi
if [ -z "$TLM" ] && [ -f "$ALT" ]; then
  TLM="$(jq -c '. // empty' "$ALT" 2>/dev/null || true)"
fi

# settings.local.json exists but carries no tlm block. That is a normal, complete
# state for a project that only uses the coding skills -> nothing tlm to report.
[ -n "$TLM" ] || finish

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

# Everything present -> only the OpenSpec reminder (if any).
[ -n "$MISSING" ] || finish

# Config is incomplete: lead with baseline + OpenSpec reminders (if present), then the gaps.
[ -n "$BASELINE_MSG" ] && { printf '%s\n' "$BASELINE_MSG"; echo ""; }
[ -n "$OPENSPEC_MSG" ] && { printf '%s\n' "$OPENSPEC_MSG"; echo ""; }
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
echo "4. A capability that is ENABLED but incomplete is ALL-OR-NOTHING: when its workflow skill runs,"
echo "   REQUIRE the companion — finish /project-setup, or set the capability's enabled:false — rather"
echo "   than running a degraded / local-only version. Still-missing single VALUES (a channel id, a"
echo "   status name) within a connected capability are asked inline. Figma remains a HARD STOP:"
echo "   never write UI code from a guessed design."
exit 0
