#!/usr/bin/env bash
# DEPRECATED — superseded by vendor-watch.mjs, which hooks.json now calls. Kept for one release
# so the port can be diffed against it; removed in v2.5.0. Do not edit: fix vendor-watch.mjs instead.
#
# PostToolUse hook — fires when Claude edits the VENDORED copy of the plugin
# (tlm.pluginRepo.vendorDir, default .claude/tlm-plugin/) inside a consuming
# project, and reminds Claude to offer a contribute-back PR.
#
# The vendored copy is an EDIT/PR-STAGING surface, not a live override: a change
# there does nothing until it is merged upstream and pulled via
# /plugin marketplace update. So an edit to it is only useful if it becomes a PR
# — this hook makes sure that offer isn't forgotten.
#
# Advisory and silent unless the edited path is under a .claude/tlm-plugin/ dir.
# Emits hookSpecificOutput.additionalContext (same channel as lint-fe.sh).

INPUT="$(cat 2>/dev/null || true)"

command -v jq >/dev/null 2>&1 || exit 0
[ -n "$INPUT" ] || exit 0

FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[ -n "$FILE" ] || exit 0

# Only react to edits inside a vendored-plugin directory. Match the default
# location and any custom vendorDir that still ends in the conventional segment.
case "$FILE" in
  */.claude/tlm-plugin/*) ;;
  *) exit 0 ;;
esac

REL="${FILE##*/.claude/tlm-plugin/}"

MSG="[contribute-back] You edited the VENDORED plugin copy: .claude/tlm-plugin/${REL}

This copy does NOT change Claude's behavior on its own — it only takes effect after the change is
merged upstream and the user runs /plugin marketplace update. So this edit is only useful as a PR.

ACTION FOR CLAUDE:
1. Follow the rule-capture skill's PLUGIN scope (STEP 4): confirm this is a real house-rule change, not
   a stray edit.
2. Offer to open a contribute-back PR. When the user agrees, run:
     bash \"\${CLAUDE_PLUGIN_ROOT}/skills/rule-capture/plugin-pr.sh\" open <slug>
   exporting TLM_* from tlm.pluginRepo first (see the script header). It clones the upstream, mirrors this
   vendored copy onto a branch, bumps the version in lockstep, pushes, and prints the PR/compare URL.
3. Do NOT hand-edit \${CLAUDE_PLUGIN_ROOT} — a marketplace update overwrites it and the team never sees it.
If the user does not want a PR, leave the vendored copy as-is and move on; do not re-nag this session."

jq -n --arg ctx "$MSG" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $ctx
  }
}'
exit 0
