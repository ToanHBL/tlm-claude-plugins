#!/usr/bin/env bash
# PostToolUse hook — lints the file Claude just edited against the fe-coding
# HARD RULES that are mechanically detectable, and feeds any hits back so Claude
# self-corrects in the same turn.
#
# Advisory, never blocking: PostToolUse runs AFTER the write, so this cannot undo
# an edit. It emits hookSpecificOutput.additionalContext (the documented channel
# that reaches Claude's context without surfacing as an error to the user).
#
# Silent unless it finds something. High-signal rules only — a noisy linter gets
# turned off, so every rule here is one the plugin states as a hard rule, with
# the well-known false-positive sites (Base* primitives, token files, the Prisma
# singleton, comments) excluded.

INPUT="$(cat 2>/dev/null || true)"

# jq parses the hook payload. Without it we cannot find the file — stay silent
# rather than break the edit.
command -v jq >/dev/null 2>&1 || exit 0
[ -n "$INPUT" ] || exit 0

FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[ -n "$FILE" ] || exit 0
[ -f "$FILE" ] || exit 0

# Only TypeScript / TSX. Skip declarations, tests, stories, generated deps.
case "$FILE" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac
case "$FILE" in
  *.d.ts|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*.stories.tsx|*/node_modules/*|*/.next/*) exit 0 ;;
esac

BASE="$(basename "$FILE")"

# Per-file exemptions for rules that legitimately allow the pattern.
skip_html=0            # Base* primitives are the ONLY layer allowed raw/semantic DOM
case "$BASE" in Base*) skip_html=1 ;; esac
[ "${FILE##*.}" = "tsx" ] || skip_html=1   # raw-HTML rule is JSX-only

skip_hex=0             # token/theme/config files are where hex is SUPPOSED to live
case "$FILE" in
  *tailwind.config*|*[Tt]heme*|*[Cc]olors*|*/config/*|*/theme/*) skip_hex=1 ;;
esac

skip_prisma=0          # the singleton file is the one place `new PrismaClient()` belongs
case "$BASE" in prisma.ts|db.ts|client.ts|prismaClient.ts|prisma.server.ts) skip_prisma=1 ;; esac

FINDINGS=""

# scan PATTERN MESSAGE — append "file:line — message" for each non-comment match.
scan() {
  local out hit ln body trimmed
  out="$(grep -nE "$1" "$FILE" 2>/dev/null || true)"
  [ -n "$out" ] || return 0
  while IFS= read -r hit; do
    [ -n "$hit" ] || continue
    ln="${hit%%:*}"
    body="${hit#*:}"
    trimmed="$(printf '%s' "$body" | sed -e 's/^[[:space:]]*//')"
    case "$trimmed" in
      //*|\**|/\**) continue ;;   # comment line — not a real violation
    esac
    FINDINGS="${FINDINGS}  - ${FILE}:${ln} — ${2}"$'\n'
  done <<EOF
$out
EOF
}

# --- universal TS rules ----------------------------------------------------
scan '(^|[^A-Za-z0-9_])as any([^A-Za-z0-9_]|$)' \
  'as any — fix the root cause with a proper type/generic/type-guard (as unknown as T only as a commented last resort)'
scan '@ts-(ignore|expect-error)' \
  '@ts-ignore / @ts-expect-error — avoid; if truly unavoidable add a comment explaining why'

# --- styling ---------------------------------------------------------------
if [ "$skip_hex" -eq 0 ]; then
  scan '(\[#[0-9a-fA-F]{3,8}\]|#[0-9a-fA-F]{6}([^0-9a-fA-F]|$)|#[0-9a-fA-F]{3}([^0-9a-fA-F]|$))' \
    'hardcoded hex color — move it to a design token (Tailwind @theme / theme constants) and use it by name'
fi

# --- component hierarchy ---------------------------------------------------
if [ "$skip_html" -eq 0 ]; then
  scan '<(div|span|p)( |>|/|$)' \
    'raw HTML (<div>/<span>/<p>) — use Col / Row / TextPrimary; only Base* primitives may render raw DOM'
fi

# --- navigation ------------------------------------------------------------
scan 'router\.push\(' \
  'router.push — navigate via <Link> (web) / router.navigate (RN); router.push/replace is for post-action redirects only'

# --- page-router / prisma hard rules --------------------------------------
scan '(^|[^A-Za-z0-9_])getServerSideProps([^A-Za-z0-9_]|$)' \
  'getServerSideProps — Page Router fetches via useQuery[Entity] hooks, not getServerSideProps'
if [ "$skip_prisma" -eq 0 ]; then
  scan 'new PrismaClient\(' \
    'new PrismaClient() outside the singleton — import the shared Prisma singleton instead of instantiating per request'
fi

# Nothing to say -> stay silent.
[ -n "$FINDINGS" ] || exit 0

MSG="fe-coding hard-rule check on ${FILE} flagged:
${FINDINGS}
Fix these in the file you just edited before continuing. If a flag is a genuine, justified exception, say so explicitly rather than leaving it silent."

jq -n --arg ctx "$MSG" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $ctx
  }
}'
exit 0
