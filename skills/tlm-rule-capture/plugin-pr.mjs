#!/usr/bin/env node
// plugin-pr.mjs — open a PR that ships a PLUGIN-scope rule change back to the
// tlm-claude-plugins upstream, WITHOUT touching the read-only managed clone at
// ${CLAUDE_PLUGIN_ROOT} (which /plugin marketplace update overwrites).
//
// The flow, run from inside a CONSUMING project:
//   1. Take the project's vendored copy of the plugin (tlm.pluginRepo.vendorDir,
//      default .claude/tlm-plugin/) — the editable surface the user just changed.
//   2. Clone/refresh the upstream into a cache checkout (NEVER the vendor dir,
//      NEVER ${CLAUDE_PLUGIN_ROOT}).
//   3. Branch off the base, mirror the vendored skills/ ai/ hooks/ setup/ onto it.
//   4. Bump the version in lockstep across plugin.json + marketplace.json (×2).
//   5. Commit, push, and print the PR compare URL (or open it with gh).
//
// It changes NOTHING in the consuming project and NOTHING under CLAUDE_PLUGIN_ROOT.
//
// Node rather than bash so it runs identically on Windows, macOS and Linux: the
// only external tool left is git (plus gh when prMode is "gh"). jq and rsync are
// gone — neither ships on Windows.
//
// Usage:
//   node plugin-pr.mjs preflight        # print what it would do + tool/access checks, no writes
//   node plugin-pr.mjs diff             # REVIEW: what this repo's rules change vs upstream. No writes.
//   node plugin-pr.mjs open <slug>      # do it; <slug> becomes branch rule/<slug>
//
// Since v2.5.0 the vendored copy is the project's LIVE rules source, so it is
// already in effect locally before any of this runs. The PR is how the change
// reaches the TEAM. Always run 'diff' and show it to the user before 'open' — that
// is the review step, and it is the last point where a stray edit can be caught.
//
// Config comes from env (tlm-rule-capture exports these from tlm.pluginRepo; each has
// a default matching setup/tlm-config.reference.json):
//   TLM_VENDOR_DIR      .claude/tlm-plugin        (repo-relative or absolute)
//   TLM_UPSTREAM_REMOTE git@github.com-hbl:ToanHBL/tlm-claude-plugins.git
//   TLM_OWNER_REPO      ToanHBL/tlm-claude-plugins
//   TLM_BASE            develop
//   TLM_BUMP            patch | minor | major
//   TLM_PR_MODE         gh | compare-url   (default gh, falls back to compare-url)
//   TLM_TITLE           commit/PR title      (open only)
//   TLM_BODY            commit/PR body        (open only)

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const env = process.env
const VENDOR_DIR = env.TLM_VENDOR_DIR || '.claude/tlm-plugin'
const UPSTREAM = env.TLM_UPSTREAM_REMOTE || 'git@github.com-hbl:ToanHBL/tlm-claude-plugins.git'
const OWNER_REPO = env.TLM_OWNER_REPO || 'ToanHBL/tlm-claude-plugins'
const BASE = env.TLM_BASE || 'develop'
const BUMP = env.TLM_BUMP || 'patch'
const PR_MODE = env.TLM_PR_MODE || 'gh'

// Subtrees that the vendored copy owns and the PR mirrors upstream. The plugin
// MANIFEST (.claude-plugin/) is deliberately excluded — its version is managed by
// the bump step below, not by whatever a stale vendored manifest holds.
const SYNC_DIRS = ['skills', 'ai', 'hooks', 'setup']
const EXCLUDED = new Set(['.git', 'VENDORED.md', 'node_modules', '.next', '.DS_Store'])

const die = (msg) => {
  process.stderr.write(`plugin-pr: ${msg}\n`)
  process.exit(1)
}

// `command -v`, cross-platform: walk PATH, honouring PATHEXT on Windows.
function which(cmd) {
  const dirs = (env.PATH || '').split(path.delimiter).filter(Boolean)
  // Bare name first on Windows, then each PATHEXT suffix.
  const exts =
    process.platform === 'win32'
      ? ['', ...(env.PATHEXT || '.EXE;.CMD;.BAT').split(';').filter(Boolean)]
      : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const p = path.join(dir, cmd + ext)
      try {
        if (fs.statSync(p).isFile()) return p
      } catch {
        /* keep looking */
      }
    }
  }
  return null
}

// shell:false throughout — a Windows path with spaces must never be re-parsed by
// a shell.
const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { shell: false, encoding: 'utf8', ...opts })
// Resolve once and spawn by absolute path: with shell:false, Node on Windows is
// not dependable at finding a bare command name on PATH.
const GIT = which('git')
const git = (args, opts) => run(GIT, args, opts)

const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

const VENDOR_ABS = path.isAbsolute(VENDOR_DIR) ? VENDOR_DIR : path.resolve(process.cwd(), VENDOR_DIR)

// Cache checkout of upstream, keyed by owner/repo so projects share one clone.
const cacheHome =
  (process.platform === 'win32' && env.LOCALAPPDATA) || env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache')
const CACHE_ROOT = path.join(cacheHome, 'tlm-plugin-pr')
const CHECKOUT = path.join(CACHE_ROOT, OWNER_REPO.replace(/\//g, '_'))

function bumpSemver(v) {
  const [maj = 0, min = 0, pat = 0] = String(v)
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
  if (BUMP === 'major') return `${maj + 1}.0.0`
  if (BUMP === 'minor') return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
}

// Read/write JSON preserving the 2-space + trailing-newline shape both manifests
// already use, so the PR diff shows only the version line.
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n')

function preflight() {
  const lines = [
    'plugin-pr preflight',
    `  vendor dir     : ${VENDOR_ABS}`,
    `  upstream       : ${UPSTREAM}`,
    `  owner/repo     : ${OWNER_REPO}`,
    `  base branch    : ${BASE}`,
    `  version bump   : ${BUMP}`,
    `  PR mode        : ${PR_MODE}`,
    `  checkout cache : ${CHECKOUT}`,
    '',
  ]
  let ok = true
  if (which('git')) lines.push('  git  ✓')
  else {
    lines.push('  git  ✗ (required)')
    ok = false
  }
  lines.push('  jq    — not needed (JSON handled by Node)')
  lines.push('  rsync — not needed (mirroring handled by Node)')
  if (PR_MODE === 'gh') lines.push(which('gh') ? '  gh   ✓' : '  gh   ✗ — will fall back to compare-url')
  if (isDir(VENDOR_ABS)) lines.push('  rules copy present ✓')
  else {
    lines.push("  rules copy MISSING ✗ — run /tlm-project-setup to install this project's rules copy")
    ok = false
  }
  process.stdout.write(lines.join('\n') + '\n')
  if (!ok) die('preflight failed — resolve the ✗ items above')
  process.stdout.write(
    `\nOK — review with 'plugin-pr.mjs diff', then 'plugin-pr.mjs open <slug>' branches off ${BASE}, mirrors ${SYNC_DIRS.join(' ')} from the rules copy, bumps the ${BUMP} version, pushes, and opens the PR.\n`
  )
}

// rsync -a --delete, in Node: wipe the destination subtree, then copy the source
// one filtered. fs.cp's filter is called per entry; returning false skips the
// whole subtree.
function mirror(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (from) => !EXCLUDED.has(path.basename(from)),
  })
}

// Refresh the shared cache clone and put it on `branch`, cut from a pristine base.
function prepareCheckout(branch) {
  if (!GIT) die("'git' is required but not found")
  if (!isDir(VENDOR_ABS)) die(`vendor dir not found: ${VENDOR_ABS} (run /tlm-project-setup to install this project's rules copy)`)

  fs.mkdirSync(CACHE_ROOT, { recursive: true })
  if (isDir(path.join(CHECKOUT, '.git'))) {
    git(['-C', CHECKOUT, 'remote', 'set-url', 'origin', UPSTREAM])
    if (git(['-C', CHECKOUT, 'fetch', '--prune', 'origin']).status !== 0) {
      die(`git fetch failed — check SSH access to ${UPSTREAM}`)
    }
  } else {
    fs.rmSync(CHECKOUT, { recursive: true, force: true })
    if (git(['clone', '--quiet', UPSTREAM, CHECKOUT]).status !== 0) {
      die(`git clone failed — check SSH access to ${UPSTREAM}`)
    }
  }

  if (git(['-C', CHECKOUT, 'checkout', '-B', branch, `origin/${BASE}`]).status !== 0) {
    die(`cannot branch off origin/${BASE} — does the base branch exist upstream?`)
  }
  // `checkout -B` carries uncommitted changes across, so a run that died after the
  // mirror or the version bump (a failed commit, an interrupted push) would leave
  // this shared cache dirty and the NEXT PR would bump from that stale value and
  // ship the leftovers. Start every run from a pristine base.
  git(['-C', CHECKOUT, 'reset', '--hard', `origin/${BASE}`])
  git(['-C', CHECKOUT, 'clean', '-fd'])
}

function mirrorVendor() {
  for (const d of SYNC_DIRS) {
    const src = path.join(VENDOR_ABS, d)
    if (!isDir(src)) continue
    mirror(src, path.join(CHECKOUT, d))
  }
}

// The review step: exactly what a PR from this repo's rules copy would change
// upstream. Writes nothing anywhere the user can see, pushes nothing, and leaves
// the shared cache clean — run it, show the output, THEN ask about opening the PR.
function showDiff() {
  prepareCheckout('rule/_review')
  mirrorVendor()
  // Untracked files do not appear in `git diff` — stage intent so a brand-new rule
  // file shows up in the review instead of silently arriving in the PR.
  git(['-C', CHECKOUT, 'add', '-A', '-N'])
  const stat = git(['-C', CHECKOUT, 'diff', '--stat'])
  const full = git(['-C', CHECKOUT, 'diff'])
  const body = (stat.stdout || '').trim()
  if (!body) {
    process.stdout.write(`NO_CHANGES — this project's rules copy matches upstream ${BASE}; nothing to PR.\n`)
  } else {
    process.stdout.write(`Changes this project's rules copy would make to ${OWNER_REPO} (${BASE}):\n\n${body}\n\n`)
    process.stdout.write((full.stdout || '').trim() + '\n')
  }
  // Leave no state behind: the next run must start from a pristine base.
  git(['-C', CHECKOUT, 'reset', '--hard', `origin/${BASE}`])
  git(['-C', CHECKOUT, 'clean', '-fd'])
}

function openPr(rawSlug) {
  if (!rawSlug) die('usage: plugin-pr.mjs open <slug>')
  const slug = String(rawSlug)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!slug) die('slug reduced to empty after sanitizing')
  const branch = `rule/${slug}`

  prepareCheckout(branch)
  mirrorVendor()

  if (!git(['-C', CHECKOUT, 'status', '--porcelain']).stdout.trim()) {
    process.stdout.write(`NO_CHANGES — the vendored copy matches upstream ${BASE}; nothing to PR.\n`)
    return
  }

  // Version bump in lockstep across the three fields.
  const pj = path.join(CHECKOUT, '.claude-plugin', 'plugin.json')
  const mj = path.join(CHECKOUT, '.claude-plugin', 'marketplace.json')
  const pjson = readJson(pj)
  const cur = pjson.version
  if (!cur) die(`could not read version from ${pj}`)
  const next = bumpSemver(cur)
  pjson.version = next
  writeJson(pj, pjson)
  const mjson = readJson(mj)
  mjson.metadata.version = next
  mjson.plugins[0].version = next
  writeJson(mj, mjson)

  if (git(['-C', CHECKOUT, 'add', '-A']).status !== 0) die('git add failed')
  const title = env.TLM_TITLE || `rule(${slug}): capture house rule`
  const body = env.TLM_BODY || 'Captured via tlm-rule-capture from a consuming project.'
  const commit = git([
    '-C',
    CHECKOUT,
    'commit',
    '--quiet',
    '-m',
    title,
    '-m',
    body,
    '-m',
    `Version ${cur} -> ${next} (${BUMP}).`,
  ])
  // Must be checked: an unverified commit would push a branch identical to the
  // base and still report success, version bump and all.
  if (commit.status !== 0) {
    die(
      `git commit failed in ${CHECKOUT} — nothing was pushed.\n${(commit.stderr || '').trim()}\n` +
        'A missing git identity is the usual cause: set user.name / user.email and retry.'
    )
  }

  if (git(['-C', CHECKOUT, 'push', '--quiet', '-u', 'origin', branch]).status !== 0) {
    die(`git push failed. Branch '${branch}' is committed at ${CHECKOUT} — push it manually and open the PR.`)
  }

  process.stdout.write(`PUSHED ${branch} (version ${cur} -> ${next})\n`)
  const compare = `https://github.com/${OWNER_REPO}/compare/${BASE}...${branch}?expand=1`
  if (PR_MODE === 'gh' && which('gh')) {
    const res = run(which('gh'), [
      'pr', 'create', '--repo', OWNER_REPO, '--base', BASE, '--head', branch,
      '--title', title, '--body', body,
    ])
    if (res.status === 0) return
    process.stdout.write('gh pr create failed — open the PR from the URL below.\n')
  }
  process.stdout.write(`PR_URL ${compare}\n`)
}

const [cmd, arg] = process.argv.slice(2)
if (cmd === 'preflight') preflight()
else if (cmd === 'diff') showDiff()
else if (cmd === 'open') openPr(arg)
else die('usage: plugin-pr.mjs {preflight | diff | open <slug>}')
