#!/usr/bin/env node
// SessionStart hook — fire-and-forget pull of the ecosystem repos, every session.
//
// The ecosystem map (.claude/ecosystem-map.md) points Claude at contract FILES in
// the sibling repos, and those are read from each sibling's WORKING TREE — which
// `ecosystem.mjs sync` never advances (it only fetches). So a contract read hours
// into the day can be a day stale. This hook triggers `git pull --ff-only` in every
// registered repo at session start, detached, and exits immediately:
//
//   - fire-and-forget by design: the pulls run in the background, the session does
//     not wait for the network, and no result is reported. There is deliberately no
//     is-it-behind check first — the user's contract is "just trigger the pull".
//   - --ff-only + git's own working-tree protection make it safe on a repo the user
//     actually works in: a diverged branch or an update that would touch dirty files
//     makes git abort that repo's pull, silently. Never a merge, never a commit.
//   - repos missing from disk are NOT cloned here — that is `ecosystem.mjs sync`'s
//     job (and setup-check already flags a registered-but-missing repo).
//
// Silence contract: this hook NEVER prints. No config, no repos, no git — exit 0.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { readStdinPayload, delegateToVendored, which } from './lib/hook-io.mjs'

const { raw, json: input } = readStdinPayload()
const proj = input?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()

// Vendored rules win — the project's own copy of this hook is the one that runs.
delegateToVendored({ selfUrl: import.meta.url, startDirs: [proj], raw })

const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}
const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

// Same config resolution as ecosystem.mjs: tlm.ecosystem in settings.local.json,
// else the bare `ecosystem` block in the tlm.local.json fallback.
const eco =
  readJson(path.join(proj, '.claude', 'settings.local.json'))?.tlm?.ecosystem ||
  readJson(path.join(proj, '.claude', 'tlm.local.json'))?.ecosystem
if (!eco || eco.enabled === false) process.exit(0)
const repos = Array.isArray(eco.repos) ? eco.repos : []
if (!repos.length) process.exit(0)

const GIT = which('git')
if (!GIT) process.exit(0)

// Path resolution mirrors ecosystem.mjs: explicit path (~-expanded, else relative
// to the project), or workspaceRoot + name.
const expand = (p) => {
  const s = String(p ?? '')
  if (!s) return ''
  const abs = s.startsWith('~') ? path.join(os.homedir(), s.slice(1)) : s
  return path.isAbsolute(abs) ? path.normalize(abs) : path.resolve(proj, abs)
}
const nameOf = (r) => {
  if (r?.name) return String(r.name)
  if (r?.path) return path.basename(expand(r.path))
  const m = String(r?.gitUrl || '').match(/([^/:]+?)(\.git)?$/)
  return m ? m[1] : 'repo'
}
const workspaceRoot = expand(eco.workspaceRoot || '~/tlm-ecosystem')

for (const r of repos) {
  const dir = r?.path ? expand(r.path) : path.join(workspaceRoot, nameOf(r))
  if (!isDir(path.join(dir, '.git'))) continue
  try {
    spawn(GIT, ['-C', dir, 'pull', '--ff-only', '--quiet'], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    }).unref()
  } catch {
    // a repo that cannot even spawn a pull is sync's problem, not this session's
  }
}
