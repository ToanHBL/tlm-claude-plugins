#!/usr/bin/env node
// SessionStart hook — daily plugin update check + auto-update.
//
// Once per calendar day (stamped in ~/.claude/tlm-plugin-update-check.json) this
// hook fetches the installed plugin's managed clone (${CLAUDE_PLUGIN_ROOT}) and
// compares it with its upstream. When new commits exist it:
//   1. collects the RELEASE NOTES — the commit subjects between the local HEAD and
//      the remote head (this repo's "Bump x.y.z -> a.b.c: …" convention makes the
//      subjects the changelog; there is no CHANGELOG.md or tags to read instead),
//   2. AUTO-UPDATES by fast-forwarding the clone — the same ff-only pull that
//      `/plugin marketplace update` performs — but only when the clone is clean
//      and can fast-forward; anything else falls back to telling the user to run
//      `/plugin marketplace update <marketplace>` themselves,
//   3. prints both so Claude surfaces the update + notes to the user.
//
// Silence contract: no stdout unless an update exists (or just landed). Already
// checked today, no network, not a git clone, up to date — all exit silently.
// A hook must never break the turn it fires on, so every step degrades to silence.
//
// Scope guard: only ever touches ${CLAUDE_PLUGIN_ROOT}. When that env var is unset
// (a bare dev checkout of this repo) the hook exits rather than fetch/pull whatever
// repo it happens to live in. To exercise it by hand:
//   CLAUDE_PLUGIN_ROOT=/path/to/managed/clone echo '{}' | node hooks/update-check.mjs

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { readStdinPayload, delegateToVendored } from './lib/hook-io.mjs'

const { raw, json: input } = readStdinPayload()
const proj = input?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()

// Vendored rules win — the project's own copy of this hook is the one that runs.
delegateToVendored({ selfUrl: import.meta.url, startDirs: [proj], raw })

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT
if (!pluginRoot) process.exit(0)

const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

// --- daily throttle -----------------------------------------------------------
// One stamp file per machine, keyed by plugin root so two installs don't share a
// stamp. Local calendar date, not a 24h window: "check each morning" is the intent.
const stampPath = path.join(os.homedir(), '.claude', 'tlm-plugin-update-check.json')
const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time
const stamps = readJson(stampPath) || {}
if (stamps[pluginRoot] === today) process.exit(0)

const git = (args, timeout = 15000) => {
  const res = spawnSync('git', ['-C', pluginRoot, ...args], {
    encoding: 'utf8',
    timeout,
    shell: false,
  })
  if (res.error || res.status !== 0) return null
  return res.stdout.trim()
}

// Not a git clone (e.g. a copied install) — nothing to compare against.
if (git(['rev-parse', '--git-dir']) === null) process.exit(0)

// Fetch is the only networked step; offline or slow it fails -> stay silent and
// do NOT stamp, so the next session retries instead of skipping the whole day.
if (git(['fetch', '--quiet'], 30000) === null) process.exit(0)

// Upstream of the checked-out branch; a detached/unconfigured clone falls back to
// origin/HEAD.
const upstream =
  git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']) ||
  git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
if (!upstream) process.exit(0)

const behind = Number(git(['rev-list', '--count', `HEAD..${upstream}`]) ?? 0)

// From here on the day's check is done — stamp it whatever the outcome, so a
// surfaced-but-unapplied update nags at most once per day.
const writeStamp = () => {
  try {
    fs.mkdirSync(path.dirname(stampPath), { recursive: true })
    fs.writeFileSync(stampPath, JSON.stringify({ ...stamps, [pluginRoot]: today }, null, 2))
  } catch {
    // an unwritable stamp just means we re-check next session
  }
}

if (!behind) {
  writeStamp()
  process.exit(0)
}

// --- release notes ------------------------------------------------------------
const localVer = readJson(path.join(pluginRoot, '.claude-plugin', 'plugin.json'))?.version || 'unknown'
const remoteManifest = git(['show', `${upstream}:.claude-plugin/plugin.json`])
let remoteVer = 'unknown'
try {
  remoteVer = JSON.parse(remoteManifest)?.version || 'unknown'
} catch {
  // manifest missing/unparsable upstream — versions stay 'unknown', notes still print
}
const marketplace =
  readJson(path.join(pluginRoot, '.claude-plugin', 'marketplace.json'))?.name || 'tlm-claude-plugins'

const NOTES_CAP = 20
const subjects = (git(['log', '--reverse', '--format=%s', `HEAD..${upstream}`]) || '')
  .split('\n')
  .filter(Boolean)
const notes = subjects.slice(0, NOTES_CAP).map((s) => `  - ${s}`)
if (subjects.length > NOTES_CAP) notes.push(`  - … and ${subjects.length - NOTES_CAP} more commits`)

// --- auto-update --------------------------------------------------------------
// The same ff-only advance `/plugin marketplace update` performs. Refuse on a
// dirty tree (a user experiment in the managed clone must not be clobbered) and
// on anything that cannot fast-forward.
let applied = false
const dirty = git(['status', '--porcelain']) !== ''
if (!dirty && git(['merge', '--ff-only', upstream], 30000) !== null) applied = true

writeStamp()

// --- emit (stdout on exit 0 is injected into Claude's context) -----------------
const out = []
if (applied) {
  out.push(
    `[tlm-update] Plugin ${marketplace} auto-updated ${localVer} -> ${remoteVer} (${behind} commit${behind === 1 ? '' : 's'}).`
  )
} else {
  out.push(
    `[tlm-update] Plugin ${marketplace} has a new version: ${localVer} -> ${remoteVer} (${behind} commit${behind === 1 ? '' : 's'} behind). Auto-update was skipped (${dirty ? 'managed clone has local changes' : 'cannot fast-forward'}).`
  )
}
out.push('Release notes:')
out.push(...(notes.length ? notes : ['  - (no commit subjects found)']))
out.push(
  applied
    ? `Tell the user about this update and show them the release notes above. Updated skills/ai rules are live now; hook registrations refresh next session — suggest \`/plugin marketplace update ${marketplace}\` if they want Claude Code to re-read the manifest immediately.`
    : `Tell the user about the available update, show the release notes above, and ask them to run \`/plugin marketplace update ${marketplace}\` to update.`
)
process.stdout.write(out.join('\n') + '\n')
