#!/usr/bin/env bash
# SessionStart hook for the vibe-code-init skill.
# If the current project was initialized with /vibe-code-init (i.e. it has a
# vibe-code-init-config.md in this project's memory), inject an instruction so
# Claude ASKS the user whether to refresh the core reference(s) to the latest
# base branch, then pulls/clones on approval. Silent no-op for other projects.
#
# stdout on exit 0 is auto-injected into Claude's context.

# Read the hook input JSON from stdin (best-effort) to find the project cwd.
INPUT="$(cat 2>/dev/null || true)"

PROJ="${CLAUDE_PROJECT_DIR:-$PWD}"
if command -v jq >/dev/null 2>&1 && [ -n "$INPUT" ]; then
  CWD="$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null || true)"
  [ -n "$CWD" ] && PROJ="$CWD"
fi

# Same slug scheme the skill uses to locate this project's memory dir.
SLUG="$(printf '%s' "$PROJ" | sed 's#/#-#g; s#_#-#g')"
MEM_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/$SLUG/memory"
CFG="$MEM_DIR/vibe-code-init-config.md"

# Not a vibe-code-init project -> stay silent.
[ -f "$CFG" ] || exit 0

echo "[vibe-code-init] This project extends existing core system(s); a core-reference config exists at:"
echo "$CFG"
echo ""
echo "ACTION FOR CLAUDE (do this before other work, once per session):"
echo "1. ASK the user with AskUserQuestion: whether to update the core reference(s) to the latest base"
echo "   branch now. Options: Yes update all / No use as-is / Choose per core."
echo "2. On YES, for EACH core in the config below:"
echo "   - If its localPath exists: git -C <localPath> fetch origin --prune && checkout <baseBranch> &&"
echo "     pull --ff-only origin <baseBranch> (warn, do not clobber, if not fast-forwardable)."
echo "   - If its localPath is MISSING: re-clone from its git URL into the recorded sibling path, then"
echo "     checkout <baseBranch> (auto-clone for teammates who don't have the core yet)."
echo "3. Report a one-line status per core (updated to <sha> / cloned / skipped / failed)."
echo "   If the user declines, continue without refreshing. NEVER refresh silently."
echo ""
echo "----- vibe-code-init-config.md -----"
cat "$CFG"
exit 0
