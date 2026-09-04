#!/usr/bin/env bash
# DEPRECATED — superseded by plugin-pr.mjs, which hooks.json now calls. Kept for one release
# so the port can be diffed against it; removed in v2.5.0. Do not edit: fix plugin-pr.mjs instead.
#
# plugin-pr.sh — open a PR that ships a PLUGIN-scope rule change back to the
# tlm-claude-plugins upstream, WITHOUT touching the read-only managed clone at
# ${CLAUDE_PLUGIN_ROOT} (which /plugin marketplace update overwrites).
#
# The flow, run from inside a CONSUMING project:
#   1. Take the project's vendored copy of the plugin (tlm.pluginRepo.vendorDir,
#      default .claude/tlm-plugin/) — the editable surface the user just changed.
#   2. Clone/refresh the upstream into a cache checkout (NEVER the vendor dir,
#      NEVER ${CLAUDE_PLUGIN_ROOT}).
#   3. Branch off the base, mirror the vendored skills/ ai/ hooks/ setup/ onto it.
#   4. Bump the version in lockstep across plugin.json + marketplace.json (×2).
#   5. Commit, push, and print the PR compare URL (or open it with gh).
#
# It changes NOTHING in the consuming project and NOTHING under CLAUDE_PLUGIN_ROOT.
#
# Usage:
#   plugin-pr.sh preflight        # print what it would do + tool/access checks, no writes
#   plugin-pr.sh open <slug>      # do it; <slug> becomes branch rule/<slug>
#
# Config comes from env (rule-capture exports these from tlm.pluginRepo; each has
# a default matching setup/tlm-config.reference.json):
#   TLM_VENDOR_DIR      .claude/tlm-plugin        (repo-relative or absolute)
#   TLM_UPSTREAM_REMOTE git@github.com-hbl:ToanHBL/tlm-claude-plugins.git
#   TLM_OWNER_REPO      ToanHBL/tlm-claude-plugins
#   TLM_BASE            develop
#   TLM_BUMP            patch | minor | major
#   TLM_PR_MODE         compare-url | gh
#   TLM_TITLE           commit/PR title      (open only)
#   TLM_BODY            commit/PR body        (open only)
set -euo pipefail

VENDOR_DIR="${TLM_VENDOR_DIR:-.claude/tlm-plugin}"
UPSTREAM="${TLM_UPSTREAM_REMOTE:-git@github.com-hbl:ToanHBL/tlm-claude-plugins.git}"
OWNER_REPO="${TLM_OWNER_REPO:-ToanHBL/tlm-claude-plugins}"
BASE="${TLM_BASE:-develop}"
BUMP="${TLM_BUMP:-patch}"
PR_MODE="${TLM_PR_MODE:-compare-url}"

# Subtrees that the vendored copy owns and the PR mirrors upstream. The plugin
# MANIFEST (.claude-plugin/) is deliberately excluded — its version is managed by
# the bump step below, not by whatever a stale vendored manifest holds.
SYNC_DIRS=(skills ai hooks setup)

die() { printf 'plugin-pr: %s\n' "$1" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "'$1' is required but not found"; }

# Resolve the vendor dir to an absolute path (repo-relative if not absolute).
case "$VENDOR_DIR" in
  /*) VENDOR_ABS="$VENDOR_DIR" ;;
  *)  VENDOR_ABS="$PWD/$VENDOR_DIR" ;;
esac

# Cache checkout of upstream, keyed by owner/repo so projects share one clone.
CACHE_ROOT="${XDG_CACHE_HOME:-$HOME/.cache}/tlm-plugin-pr"
CHECKOUT="$CACHE_ROOT/$(printf '%s' "$OWNER_REPO" | tr '/' '_')"

bump_semver() { # $1 = x.y.z  ->  bumped per $BUMP
  local v="$1" major minor patch
  IFS='.' read -r major minor patch <<EOF
$v
EOF
  major="${major:-0}"; minor="${minor:-0}"; patch="${patch:-0}"
  case "$BUMP" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    *)     patch=$((patch + 1)) ;;
  esac
  printf '%s.%s.%s' "$major" "$minor" "$patch"
}

preflight() {
  echo "plugin-pr preflight"
  echo "  vendor dir     : $VENDOR_ABS"
  echo "  upstream       : $UPSTREAM"
  echo "  owner/repo     : $OWNER_REPO"
  echo "  base branch    : $BASE"
  echo "  version bump   : $BUMP"
  echo "  PR mode        : $PR_MODE"
  echo "  checkout cache : $CHECKOUT"
  echo
  local ok=1
  command -v git   >/dev/null 2>&1 && echo "  git  ✓" || { echo "  git  ✗ (required)"; ok=0; }
  command -v jq    >/dev/null 2>&1 && echo "  jq   ✓" || { echo "  jq   ✗ (required for version bump)"; ok=0; }
  command -v rsync >/dev/null 2>&1 && echo "  rsync ✓" || { echo "  rsync ✗ (required)"; ok=0; }
  if [ "$PR_MODE" = "gh" ]; then
    command -v gh >/dev/null 2>&1 && echo "  gh   ✓" || echo "  gh   ✗ — will fall back to compare-url"
  fi
  [ -d "$VENDOR_ABS" ] && echo "  vendor dir present ✓" || { echo "  vendor dir MISSING ✗ — run /project-setup to vendor the plugin"; ok=0; }
  [ "$ok" = 1 ] || die "preflight failed — resolve the ✗ items above"
  echo
  echo "OK — 'plugin-pr.sh open <slug>' will branch off $BASE, mirror ${SYNC_DIRS[*]} from the vendor dir, bump the $BUMP version, push, and print the PR URL."
}

open_pr() {
  local slug="${1:-}"
  [ -n "$slug" ] || die "usage: plugin-pr.sh open <slug>"
  # sanitize slug -> safe branch component
  slug="$(printf '%s' "$slug" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9._-' | sed -E 's/-+/-/g; s/^-+//; s/-+$//')"
  [ -n "$slug" ] || die "slug reduced to empty after sanitizing"
  local branch="rule/$slug"

  need git; need jq; need rsync
  [ -d "$VENDOR_ABS" ] || die "vendor dir not found: $VENDOR_ABS (run /project-setup to vendor the plugin)"

  mkdir -p "$CACHE_ROOT"
  if [ -d "$CHECKOUT/.git" ]; then
    git -C "$CHECKOUT" remote set-url origin "$UPSTREAM" 2>/dev/null || true
    git -C "$CHECKOUT" fetch --prune origin >/dev/null 2>&1 || die "git fetch failed — check SSH access to $UPSTREAM"
  else
    rm -rf "$CHECKOUT"
    git clone --quiet "$UPSTREAM" "$CHECKOUT" || die "git clone failed — check SSH access to $UPSTREAM"
  fi

  git -C "$CHECKOUT" checkout -B "$branch" "origin/$BASE" >/dev/null 2>&1 \
    || die "cannot branch off origin/$BASE — does the base branch exist upstream?"

  # Mirror each vendored subtree onto the checkout. --delete so removals in the
  # vendored copy propagate; skip VCS/build noise.
  local d
  for d in "${SYNC_DIRS[@]}"; do
    [ -d "$VENDOR_ABS/$d" ] || continue
    mkdir -p "$CHECKOUT/$d"
    rsync -a --delete \
      --exclude '.git' --exclude 'VENDORED.md' \
      --exclude 'node_modules' --exclude '.next' --exclude '.DS_Store' \
      "$VENDOR_ABS/$d/" "$CHECKOUT/$d/"
  done

  if [ -z "$(git -C "$CHECKOUT" status --porcelain)" ]; then
    echo "NO_CHANGES — the vendored copy matches upstream $BASE; nothing to PR."
    return 0
  fi

  # Version bump in lockstep across the three fields.
  local pj mj cur new
  pj="$CHECKOUT/.claude-plugin/plugin.json"
  mj="$CHECKOUT/.claude-plugin/marketplace.json"
  cur="$(jq -r '.version' "$pj")"
  [ -n "$cur" ] && [ "$cur" != "null" ] || die "could not read version from $pj"
  new="$(bump_semver "$cur")"
  jq --arg v "$new" '.version = $v' "$pj" > "$pj.tmp" && mv "$pj.tmp" "$pj"
  jq --arg v "$new" '.metadata.version = $v | .plugins[0].version = $v' "$mj" > "$mj.tmp" && mv "$mj.tmp" "$mj"

  git -C "$CHECKOUT" add -A
  local title body
  title="${TLM_TITLE:-rule($slug): capture house rule}"
  body="${TLM_BODY:-Captured via rule-capture from a consuming project.}"
  git -C "$CHECKOUT" commit --quiet \
    -m "$title" \
    -m "$body" \
    -m "Version $cur -> $new ($BUMP)." \
    -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"

  git -C "$CHECKOUT" push --quiet -u origin "$branch" \
    || die "git push failed. Branch '$branch' is committed at $CHECKOUT — push it manually and open the PR."

  echo "PUSHED $branch (version $cur -> $new)"
  local compare="https://github.com/$OWNER_REPO/compare/$BASE...$branch?expand=1"
  if [ "$PR_MODE" = "gh" ] && command -v gh >/dev/null 2>&1; then
    gh pr create --repo "$OWNER_REPO" --base "$BASE" --head "$branch" \
      --title "$title" --body "$body" 2>/dev/null \
      && return 0
    echo "gh pr create failed — open the PR from the URL below."
  fi
  echo "PR_URL $compare"
}

case "${1:-}" in
  preflight) preflight ;;
  open)      shift; open_pr "${1:-}" ;;
  *)         die "usage: plugin-pr.sh {preflight | open <slug>}" ;;
esac
