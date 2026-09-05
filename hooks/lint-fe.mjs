#!/usr/bin/env node
// PostToolUse hook — lints the file Claude just edited against the fe-coding
// HARD RULES that are mechanically detectable, and feeds any hits back so Claude
// self-corrects in the same turn.
//
// Advisory, never blocking: PostToolUse runs AFTER the write, so this cannot undo
// an edit. It emits hookSpecificOutput.additionalContext (the documented channel
// that reaches Claude's context without surfacing as an error to the user).
//
// Silent unless it finds something. High-signal rules only — a noisy linter gets
// turned off, so every rule here is one the plugin states as a hard rule, with
// the well-known false-positive sites (Base* primitives, token files, the Prisma
// singleton, comments) excluded.

import fs from 'node:fs'
import path from 'node:path'
import { readStdinPayload, delegateToVendored, emitContext, toPosix } from './lib/hook-io.mjs'

const { raw, json: input } = readStdinPayload()
const file = input?.tool_input?.file_path
if (!file) process.exit(0)

// The project's vendored rules are the live source: if this repo carries its own
// copy of this hook, that copy decides — a rule added there must be enforced now,
// not after the PR merges.
delegateToVendored({
  selfUrl: import.meta.url,
  startDirs: [path.dirname(file), input?.cwd, process.env.CLAUDE_PROJECT_DIR],
  raw,
})
try {
  if (!fs.statSync(file).isFile()) process.exit(0)
} catch {
  process.exit(0)
}

// Path rules below are written in posix form; a Windows path must be normalized
// first or every one of them silently misses.
const posix = toPosix(file)
const base = path.basename(posix)

// Only TypeScript / TSX. Skip declarations, tests, stories, generated deps.
if (!/\.tsx?$/.test(posix)) process.exit(0)
if (
  /\.d\.ts$/.test(posix) ||
  /\.(test|spec)\.tsx?$/.test(posix) ||
  /\.stories\.tsx$/.test(posix) ||
  posix.includes('/node_modules/') ||
  posix.includes('/.next/')
) {
  process.exit(0)
}

// Per-file exemptions for rules that legitimately allow the pattern.
// Base* primitives are the ONLY layer allowed raw/semantic DOM, and the raw-HTML
// rule is JSX-only.
const skipHtml = base.startsWith('Base') || !posix.endsWith('.tsx')

// token/theme/config files are where hex is SUPPOSED to live
const skipHex =
  posix.includes('tailwind.config') ||
  /[Tt]heme/.test(posix) ||
  /[Cc]olors/.test(posix) ||
  posix.includes('/config/') ||
  posix.includes('/theme/')

// the singleton file is the one place `new PrismaClient()` belongs
const skipPrisma = ['prisma.ts', 'db.ts', 'client.ts', 'prismaClient.ts', 'prisma.server.ts'].includes(base)

let source
try {
  source = fs.readFileSync(file, 'utf8')
} catch {
  process.exit(0)
}
// Tolerate CRLF so a checkout with Windows line endings lints the same.
const lines = source.split('\n').map((l) => l.replace(/\r$/, ''))

const findings = []

// scan(pattern, message) — record "file:line — message" for each non-comment match.
function scan(pattern, message) {
  const re = new RegExp(pattern)
  lines.forEach((line, i) => {
    if (!re.test(line)) return
    const trimmed = line.replace(/^\s+/, '')
    // comment line — not a real violation
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
    findings.push(`  - ${file}:${i + 1} — ${message}\n`)
  })
}

// --- universal TS rules ----------------------------------------------------
scan(
  '(^|[^A-Za-z0-9_])as any([^A-Za-z0-9_]|$)',
  'as any — fix the root cause with a proper type/generic/type-guard (as unknown as T only as a commented last resort)'
)
scan(
  '@ts-(ignore|expect-error)',
  '@ts-ignore / @ts-expect-error — avoid; if truly unavoidable add a comment explaining why'
)

// --- styling ---------------------------------------------------------------
if (!skipHex) {
  scan(
    '(\\[#[0-9a-fA-F]{3,8}\\]|#[0-9a-fA-F]{6}([^0-9a-fA-F]|$)|#[0-9a-fA-F]{3}([^0-9a-fA-F]|$))',
    'hardcoded hex color — move it to a design token (Tailwind @theme / theme constants) and use it by name'
  )
}

// --- component hierarchy ---------------------------------------------------
if (!skipHtml) {
  scan(
    '<(div|span|p)( |>|/|$)',
    'raw HTML (<div>/<span>/<p>) — use Col / Row / TextPrimary; only Base* primitives may render raw DOM'
  )
}

// --- navigation ------------------------------------------------------------
scan(
  'router\\.push\\(',
  'router.push — navigate via <Link> (web) / router.navigate (RN); router.push/replace is for post-action redirects only'
)

// --- page-router / prisma hard rules --------------------------------------
scan(
  '(^|[^A-Za-z0-9_])getServerSideProps([^A-Za-z0-9_]|$)',
  'getServerSideProps — Page Router fetches via useQuery[Entity] hooks, not getServerSideProps'
)
if (!skipPrisma) {
  scan(
    'new PrismaClient\\(',
    'new PrismaClient() outside the singleton — import the shared Prisma singleton instead of instantiating per request'
  )
}

// Nothing to say -> stay silent.
if (findings.length === 0) process.exit(0)

emitContext(
  'PostToolUse',
  `fe-coding hard-rule check on ${file} flagged:
${findings.join('')}
Fix these in the file you just edited before continuing. If a flag is a genuine, justified exception, say so explicitly rather than leaving it silent.`
)
