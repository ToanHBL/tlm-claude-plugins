#!/usr/bin/env node
// SessionStart hook — a pre-work brief, printed BEFORE Claude starts any task.
//
// Answers the three questions a session should never have to rediscover mid-task:
//   1. which PLUGIN VERSION is in play (installed clone vs the project's vendored
//      rules copy — and whether the two have drifted apart),
//   2. which RULES will be used (rules root + the rule packs and skills that apply
//      to this project's stack),
//   3. which sibling PROJECTS are already included (tlm.ecosystem.repos, with an
//      on-disk check so a repo the map names but the disk lacks is visible now,
//      not when a contract read fails).
//
// Silence contract: this hook speaks ONLY in a project that actually runs on the
// plugin — one with a vendored rules copy (.claude/tlm-plugin/) or a tlm config
// block. In a plain coding repo it prints nothing; the brief in every unrelated
// repo would be the noise that gets the hook uninstalled.
//
// stdout on exit 0 is auto-injected into Claude's context (same as setup-check).

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readStdinPayload, delegateToVendored, resolveRulesRoot } from './lib/hook-io.mjs'

const { raw, json: input } = readStdinPayload()
const proj = input?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()

// Vendored rules win — the project's own copy of this hook is the one that runs.
delegateToVendored({ selfUrl: import.meta.url, startDirs: [proj], raw })

const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}
const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}
const listDirs = (p) => {
  try {
    return fs
      .readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  } catch {
    return []
  }
}

// --- gate: only speak in a project that runs on the plugin -------------------
const vendorDir = path.join(proj, '.claude', 'tlm-plugin')
const cfg = readJson(path.join(proj, '.claude', 'settings.local.json'))
const alt = readJson(path.join(proj, '.claude', 'tlm.local.json'))
const tlm = cfg?.tlm ?? (alt && Object.keys(alt).length ? alt : null)
if (!isDir(vendorDir) && !tlm) process.exit(0)

// --- 1. plugin version -------------------------------------------------------
// Installed version: the managed clone's manifest. Outside an install (a bare
// checkout of this repo) fall back to this file's own parent — that IS the root.
const pluginRoot =
  process.env.CLAUDE_PLUGIN_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const installedVer = readJson(path.join(pluginRoot, '.claude-plugin', 'plugin.json'))?.version || 'unknown'

// Vendored version: PHASE 1.5 records "source plugin + version" in RULES.md at the
// copy's root. Prose, so extract the first x.y.z; absent file -> pre-RULES.md copy.
let vendoredVer = null
if (isDir(vendorDir)) {
  try {
    vendoredVer =
      fs.readFileSync(path.join(vendorDir, 'RULES.md'), 'utf8').match(/(\d+\.\d+\.\d+)/)?.[1] ||
      'unknown'
  } catch {
    vendoredVer = 'unknown'
  }
}

// --- 2. rules that will be used ----------------------------------------------
const { root: rulesRoot, source: rulesSource } = resolveRulesRoot([proj])

const stack = tlm?.project?.type || null
// Which ai/ packs apply: shared-fe always, plus the stack's own pack. With no
// (or an unmapped) stack, every pack present stays on the table until detection.
const PACK_BY_STACK = {
  'nextjs-page-router': 'nextjs',
  'nextjs-app-router': 'nextjs',
  'react-native-expo': 'reactnative',
  'react-native-cli': 'reactnative',
}
const packsPresent = rulesRoot ? listDirs(path.join(rulesRoot, 'ai')).filter((d) => d !== 'templates' && d !== 'vendor') : []
const packs =
  stack && PACK_BY_STACK[stack]
    ? packsPresent.filter((d) => d === 'shared-fe' || d === PACK_BY_STACK[stack])
    : packsPresent
const skills = rulesRoot ? listDirs(path.join(rulesRoot, 'skills')) : []

// --- 3. projects already included (ecosystem) --------------------------------
const home = os.homedir()
const expand = (p) => (String(p || '').startsWith('~') ? path.join(home, String(p).slice(1)) : String(p || ''))
const repos = tlm?.ecosystem?.enabled === true && Array.isArray(tlm?.ecosystem?.repos) ? tlm.ecosystem.repos : []
const repoLines = repos.map((r) => {
  const abs = expand(r?.path)
  const onDisk = abs && isDir(path.isAbsolute(abs) ? abs : path.join(proj, abs))
  return `  - ${r?.name || r?.path || '(unnamed)'}${r?.role ? ` (${r.role})` : ''} — ${onDisk ? 'on disk' : 'NOT on disk'}`
})

// --- emit ---------------------------------------------------------------------
const out = []
out.push('[tlm-brief] Pre-work brief for this project:')
out.push(
  `- Plugin version: ${installedVer} (installed)` +
    (vendoredVer !== null
      ? `, ${vendoredVer} (vendored copy)${
          vendoredVer !== 'unknown' && vendoredVer !== installedVer
            ? ' — versions differ; the VENDORED copy is what this project runs on'
            : ''
        }`
      : ' — no vendored copy, running on the installed plugin directly')
)
out.push(
  `- Rules root: ${rulesRoot || '(none resolvable)'} (${rulesSource})` +
    (stack ? ` — stack: ${stack}` : ' — stack: not set (tlm-fe-coding will detect or ask)')
)
if (packs.length) out.push(`- Rule packs in use: ${packs.map((p) => `ai/${p}`).join(', ')}`)
if (skills.length) out.push(`- Skills available from this root: ${skills.join(', ')}`)
out.push(
  repoLines.length
    ? `- Ecosystem projects included:\n${repoLines.join('\n')}`
    : '- Ecosystem projects included: none registered'
)
out.push(
  'Use this brief as ground truth for the session — read contracts from the listed ecosystem repos instead of guessing, and treat the vendored copy (when present) as the live rules source.'
)

process.stdout.write(out.join('\n') + '\n')
