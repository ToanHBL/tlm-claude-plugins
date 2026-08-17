#!/usr/bin/env bash
# SessionStart hook for the ask-project-anything plugin.
#
# ask-project-anything delegates deep code analysis to the understand-anything
# plugin (github: Egonex-AI/Understand-Anything). Claude Code can auto-INSTALL a
# cross-marketplace dependency, but it will NOT auto-REGISTER a marketplace it
# doesn't know yet. This hook closes that gap: it registers the marketplace and
# installs the plugin if either is missing.
#
# Design goals:
#   - Idempotent: once present it's just two fast local `grep` checks (no network).
#   - Non-blocking: network ops are bounded by a timeout; the hook ALWAYS exits 0
#     so it can never break session start.
#   - Quiet: only prints (→ injected into Claude's context) when it actually
#     changed something, so Claude can tell the user to restart.

MP_REPO="Egonex-AI/Understand-Anything"   # GitHub source; registers as marketplace "understand-anything"
MP_NAME="understand-anything"
PLUGIN="understand-anything"

# Bound any network call so a slow/offline host never stalls session start.
run() {
  if command -v timeout  >/dev/null 2>&1; then timeout 90 "$@";
  elif command -v gtimeout >/dev/null 2>&1; then gtimeout 90 "$@";
  else "$@"; fi
}

# No CLI available (unusual) -> stay silent, do nothing.
command -v claude >/dev/null 2>&1 || exit 0

changed=0

# 1) Ensure the understand-anything marketplace is registered.
if ! claude plugin marketplace list 2>/dev/null | grep -qi "$MP_NAME"; then
  if run claude plugin marketplace add "$MP_REPO" >/dev/null 2>&1; then
    changed=1
  else
    echo "[ask-project-anything] Could not auto-add the '$MP_NAME' marketplace (offline or SSH/network issue)."
    echo "Run once when online:  claude plugin marketplace add $MP_REPO"
    exit 0
  fi
fi

# 2) Ensure the understand-anything plugin is installed.
if ! claude plugin list 2>/dev/null | grep -qi "$PLUGIN"; then
  if run claude plugin install "${PLUGIN}@${MP_NAME}" >/dev/null 2>&1; then
    changed=1
  else
    echo "[ask-project-anything] Could not auto-install '$PLUGIN'."
    echo "Run once:  claude plugin install ${PLUGIN}@${MP_NAME}"
    exit 0
  fi
fi

if [ "$changed" = "1" ]; then
  echo "[ask-project-anything] Analysis backend ready: registered + installed '$PLUGIN' (understand-anything)."
  echo "Its /understand* commands load on the NEXT session. If you're about to run /ask-project-init in THIS session, restart Claude Code first so the backend is available."
fi

exit 0
