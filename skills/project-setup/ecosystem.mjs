#!/usr/bin/env node
// ecosystem.mjs — make the OTHER repos of this system readable while working here.
//
// A screen in one repo calls an API defined in another; a type is owned by a shared
// package; a mobile app mirrors a web flow. Guessing that contract is the failure
// this script exists to prevent: it registers the sibling repos, makes sure they are
// actually on disk (cloning from a git URL when needed), and writes a map Claude
// reads before it reaches for any of them.
//
// The siblings are REFERENCE, read-only. This script clones and fetches; it never
// writes into them, and never commits. Nothing here touches ${CLAUDE_PLUGIN_ROOT}.
//
// Usage (run from the consuming project):
//   node ecosystem.mjs list                 # registered repos + on-disk status
//   node ecosystem.mjs sync [name...]       # clone what's missing, fetch what's there
//   node ecosystem.mjs index                # (re)write the cross-repo map
//   node ecosystem.mjs add <path-or-giturl> [--name x] [--role backend] [--notes "..."]
//   node ecosystem.mjs preflight            # what it would do; no writes
//
// Config — <project>/.claude/settings.local.json → tlm.ecosystem (fallback
// .claude/tlm.local.json → ecosystem). Shape in setup/tlm-config.reference.json:
//   { enabled, workspaceRoot, indexFile, repos: [{ name, role, path, gitUrl, ref, depth, notes }] }
//
// `add` is the only subcommand that writes config, and it writes ONLY the tlm.ecosystem
// block back into the file it came from — every other key is preserved byte-for-byte
// through a parse/serialize of the whole document.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const PROJ = process.env.TLM_PROJECT_DIR || process.cwd()
const CFG = path.join(PROJ, '.claude', 'settings.local.json')
const ALT = path.join(PROJ, '.claude', 'tlm.local.json')

const die = (msg) => {
  process.stderr.write(`ecosystem: ${msg}\n`)
  process.exit(1)
}
const out = (s) => process.stdout.write(s + '\n')

const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}
const isFile = (p) => {
  try {
    return fs.statSync(p).isFile()
  } catch {
    return false
  }
}

// ~ is what a user types and what reads well in a config file; every filesystem
// call needs it expanded first.
const expand = (p) => {
  const s = String(p ?? '')
  if (!s) return ''
  const abs = s.startsWith('~') ? path.join(os.homedir(), s.slice(1)) : s
  return path.isAbsolute(abs) ? path.normalize(abs) : path.resolve(PROJ, abs)
}
// Store the home-relative form back, so a config file stays portable between machines.
const contract = (p) => {
  const home = os.homedir()
  return p.startsWith(home + path.sep) ? '~' + p.slice(home.length) : p
}

function which(cmd) {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  const exts =
    process.platform === 'win32'
      ? ['', ...(process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';').filter(Boolean)]
      : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const p = path.join(dir, cmd + ext)
      if (isFile(p)) return p
    }
  }
  return null
}
const GIT = which('git')
// shell:false everywhere — a Windows path with spaces must never be re-parsed by a shell.
const git = (args, opts = {}) => spawnSync(GIT, args, { shell: false, encoding: 'utf8', ...opts })

// --- config ----------------------------------------------------------------

function loadConfig() {
  for (const [file, pick] of [
    [CFG, (j) => j?.tlm?.ecosystem],
    [ALT, (j) => j?.ecosystem],
  ]) {
    if (!isFile(file)) continue
    let json
    try {
      json = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (err) {
      die(`${file} is not valid JSON (${err.message})`)
    }
    const eco = pick(json)
    if (eco) return { file, json, eco }
  }
  return { file: isFile(CFG) ? CFG : null, json: null, eco: null }
}

function saveEcosystem(state, eco) {
  const file = state.file || CFG
  let json = state.json
  if (!json) {
    json = isFile(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  }
  if (file === ALT) json.ecosystem = eco
  else {
    json.tlm = json.tlm || {}
    json.tlm.ecosystem = eco
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n')
  return file
}

const DEFAULT_WORKSPACE = '~/tlm-ecosystem'
const DEFAULT_INDEX = '.claude/ecosystem-map.md'

function repos(eco) {
  return Array.isArray(eco?.repos) ? eco.repos : []
}

// A repo's path is either explicit or derived from workspaceRoot + name — so a
// config that only carries a git URL still resolves to one predictable location.
function repoDir(eco, r) {
  if (r?.path) return expand(r.path)
  const root = expand(eco?.workspaceRoot || DEFAULT_WORKSPACE)
  return path.join(root, nameOf(r))
}

function nameOf(r) {
  if (r?.name) return String(r.name)
  if (r?.path) return path.basename(expand(r.path))
  if (r?.gitUrl) {
    const m = String(r.gitUrl).match(/([^/:]+?)(\.git)?$/)
    return m ? m[1] : 'repo'
  }
  return 'repo'
}

// --- scanning ---------------------------------------------------------------

const readJsonSafe = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

// Cheap, bounded probe: enough for Claude to know what a repo IS and where its
// contracts live, without ever walking the whole tree.
function scanRepo(dir) {
  const info = { stack: 'unknown', pkg: null, dirs: [], rules: [], contracts: [], branch: '', head: '' }
  const pkg = readJsonSafe(path.join(dir, 'package.json'))
  if (pkg) {
    info.pkg = [pkg.name, pkg.version].filter(Boolean).join('@')
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    const has = (d) => Object.prototype.hasOwnProperty.call(deps, d)
    if (has('expo')) info.stack = has('expo-router') ? 'react-native-expo (expo-router)' : 'react-native-expo'
    else if (has('react-native')) info.stack = 'react-native-cli'
    else if (has('next')) {
      const appRouter = isDir(path.join(dir, 'app')) || isDir(path.join(dir, 'src/app'))
      const pageRouter = isDir(path.join(dir, 'pages')) || isDir(path.join(dir, 'src/pages'))
      info.stack = `nextjs (${[appRouter && 'app-router', pageRouter && 'page-router'].filter(Boolean).join(' + ') || 'router unknown'})`
    } else if (has('@nestjs/core')) info.stack = 'nestjs'
    else if (has('express')) info.stack = 'express'
    else if (has('react')) info.stack = 'react'
    else info.stack = 'node'
    if (has('@prisma/client') || has('prisma')) info.stack += ' + prisma'
  } else if (isFile(path.join(dir, 'pubspec.yaml'))) info.stack = 'flutter'
  else if (isFile(path.join(dir, 'go.mod'))) info.stack = 'go'
  else if (isFile(path.join(dir, 'pom.xml')) || isFile(path.join(dir, 'build.gradle'))) info.stack = 'jvm'
  else if (isFile(path.join(dir, 'requirements.txt')) || isFile(path.join(dir, 'pyproject.toml'))) info.stack = 'python'

  try {
    info.dirs = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !['node_modules', 'build', 'dist'].includes(e.name))
      .map((e) => e.name)
      .slice(0, 12)
  } catch {
    /* unreadable — leave empty */
  }

  // The sibling's OWN rules. They win over the house rules inside that repo, so
  // Claude has to know they exist before it reads any code there.
  for (const f of ['CLAUDE.md', 'AGENTS.md', '.cursorrules', '.claude/rules', 'openspec', 'README.md']) {
    if (isFile(path.join(dir, f)) || isDir(path.join(dir, f))) info.rules.push(f)
  }

  // Where a contract Claude might otherwise GUESS actually lives.
  const contractPaths = [
    'prisma/schema.prisma',
    'openapi.yaml',
    'openapi.json',
    'swagger.json',
    'src/app/api',
    'app/api',
    'src/pages/api',
    'pages/api',
    'src/routes',
    'src/modules',
    'src/_modules',
    'packages',
    'proto',
  ]
  for (const c of contractPaths) {
    if (isFile(path.join(dir, c)) || isDir(path.join(dir, c))) info.contracts.push(c)
  }

  if (GIT && isDir(path.join(dir, '.git'))) {
    const b = git(['-C', dir, 'rev-parse', '--abbrev-ref', 'HEAD'])
    if (b.status === 0) info.branch = (b.stdout || '').trim()
    const h = git(['-C', dir, 'rev-parse', '--short', 'HEAD'])
    if (h.status === 0) info.head = (h.stdout || '').trim()
  }
  return info
}

// --- subcommands ------------------------------------------------------------

function statusOf(eco, r) {
  const dir = repoDir(eco, r)
  if (!isDir(dir)) return { dir, state: r?.gitUrl ? 'MISSING (clonable)' : 'MISSING' }
  if (!isDir(path.join(dir, '.git'))) return { dir, state: 'present (not a git repo)' }
  return { dir, state: 'present' }
}

function cmdList() {
  const { eco, file } = loadConfig()
  if (!eco) return out('No tlm.ecosystem configured. Run /project-setup, or: ecosystem.mjs add <path-or-giturl>')
  out(`ecosystem (${file})`)
  out(`  enabled       : ${eco.enabled !== false}`)
  out(`  workspaceRoot : ${eco.workspaceRoot || DEFAULT_WORKSPACE}`)
  out(`  indexFile     : ${eco.indexFile || DEFAULT_INDEX}`)
  const list = repos(eco)
  if (!list.length) return out('  repos         : (none)')
  out('')
  for (const r of list) {
    const { dir, state } = statusOf(eco, r)
    out(`  - ${nameOf(r)}${r.role ? ` [${r.role}]` : ''}`)
    out(`      path   : ${contract(dir)}   ${state}`)
    if (r.gitUrl) out(`      git    : ${r.gitUrl}${r.ref ? ` (${r.ref})` : ''}`)
    if (r.notes) out(`      notes  : ${r.notes}`)
  }
}

function cmdSync(only) {
  if (!GIT) die("'git' is required but not found")
  const { eco } = loadConfig()
  if (!eco) die('no tlm.ecosystem configured — run /project-setup first')
  const wanted = repos(eco).filter((r) => !only?.length || only.includes(nameOf(r)))
  if (!wanted.length) die('no matching repos in tlm.ecosystem.repos')

  let failed = 0
  for (const r of wanted) {
    const name = nameOf(r)
    const dir = repoDir(eco, r)
    if (isDir(path.join(dir, '.git'))) {
      const res = git(['-C', dir, 'fetch', '--prune', '--quiet'])
      out(res.status === 0 ? `  ${name}  fetched` : `  ${name}  fetch FAILED — ${(res.stderr || '').trim().split('\n')[0]}`)
      if (res.status !== 0) failed++
      continue
    }
    if (isDir(dir)) {
      out(`  ${name}  present, not a git repo — left untouched`)
      continue
    }
    if (!r.gitUrl) {
      out(`  ${name}  MISSING and no gitUrl — fix tlm.ecosystem.repos[].path`)
      failed++
      continue
    }
    fs.mkdirSync(path.dirname(dir), { recursive: true })
    // Shallow by default: these are read-only references, not repos anyone works
    // in here. depth:0 in config asks for the full history.
    const depth = r.depth === 0 ? [] : ['--depth', String(r.depth || 1)]
    const ref = r.ref ? ['--branch', String(r.ref)] : []
    const args = ['clone', '--quiet', ...depth, ...ref, String(r.gitUrl), dir]
    const res = git(args)
    if (res.status === 0) out(`  ${name}  cloned → ${contract(dir)}`)
    else {
      out(`  ${name}  clone FAILED — ${(res.stderr || '').trim().split('\n')[0]}`)
      failed++
    }
  }
  if (failed) process.exitCode = 1
}

function cmdIndex() {
  const { eco } = loadConfig()
  if (!eco) die('no tlm.ecosystem configured — run /project-setup first')
  const list = repos(eco)
  const indexPath = path.join(PROJ, eco.indexFile || DEFAULT_INDEX)

  const L = []
  L.push('# Ecosystem map')
  L.push('')
  L.push('Other repos of this system, registered in `tlm.ecosystem`. Generated by')
  L.push('`skills/project-setup/ecosystem.mjs index` — re-run it after adding a repo; do not hand-edit.')
  L.push('')
  L.push('**How to use this file.** Read it BEFORE assuming anything that lives in another repo — an')
  L.push('endpoint shape, a shared type, an enum, a status vocabulary. Then open the real file in that')
  L.push("repo; this map says where to look, it is not itself the contract. These repos are READ-ONLY")
  L.push('reference: never edit, commit, or run anything in them without the user asking.')
  L.push('')
  if (!list.length) L.push('_No repos registered yet._')

  for (const r of list) {
    const { dir, state } = statusOf(eco, r)
    L.push(`## ${nameOf(r)}${r.role ? ` — ${r.role}` : ''}`)
    L.push('')
    L.push(`- path: \`${contract(dir)}\`${state === 'present' ? '' : ` (**${state}**)`}`)
    if (r.gitUrl) L.push(`- git: \`${r.gitUrl}\`${r.ref ? ` (${r.ref})` : ''}`)
    if (r.notes) L.push(`- notes: ${r.notes}`)
    if (state.startsWith('MISSING')) {
      L.push('- ⚠️ not on disk — run `/project-setup` (it re-clones) before relying on anything here')
      L.push('')
      continue
    }
    const info = scanRepo(dir)
    L.push(`- stack: ${info.stack}${info.pkg ? ` · package: \`${info.pkg}\`` : ''}`)
    if (info.branch) L.push(`- checked out: \`${info.branch}\`${info.head ? ` @ ${info.head}` : ''}`)
    if (info.dirs.length) L.push(`- top level: ${info.dirs.map((d) => `\`${d}/\``).join(' ')}`)
    if (info.contracts.length) L.push(`- contracts to read: ${info.contracts.map((c) => `\`${c}\``).join(' ')}`)
    if (info.rules.length) L.push(`- its own rules (win inside that repo): ${info.rules.map((f) => `\`${f}\``).join(' ')}`)
    L.push('')
  }

  fs.mkdirSync(path.dirname(indexPath), { recursive: true })
  fs.writeFileSync(indexPath, L.join('\n').replace(/\n+$/, '') + '\n')
  out(`wrote ${path.relative(PROJ, indexPath)} (${list.length} repo${list.length === 1 ? '' : 's'})`)
}

function cmdAdd(args) {
  const target = args[0]
  if (!target) die('usage: ecosystem.mjs add <path-or-giturl> [--name x] [--role backend] [--notes "..."] [--ref develop]')
  const flag = (n) => {
    const i = args.indexOf(`--${n}`)
    return i === -1 ? undefined : args[i + 1]
  }
  const looksGit = /^(https?:\/\/|git@|ssh:\/\/)/.test(target) || target.endsWith('.git')

  const state = loadConfig()
  const eco = state.eco || { enabled: true, workspaceRoot: DEFAULT_WORKSPACE, indexFile: DEFAULT_INDEX, repos: [] }
  eco.enabled = true
  eco.repos = repos(eco)

  const entry = { name: flag('name') || nameOf(looksGit ? { gitUrl: target } : { path: target }) }
  if (flag('role')) entry.role = flag('role')
  if (looksGit) {
    entry.gitUrl = target
    entry.path = contract(path.join(expand(eco.workspaceRoot || DEFAULT_WORKSPACE), entry.name))
    if (flag('ref')) entry.ref = flag('ref')
  } else {
    const abs = expand(target)
    if (!isDir(abs)) die(`not a directory: ${abs}`)
    entry.path = contract(abs)
    // Record where it came from, so another machine can clone the same thing.
    if (GIT && isDir(path.join(abs, '.git'))) {
      const url = git(['-C', abs, 'remote', 'get-url', 'origin'])
      if (url.status === 0 && url.stdout.trim()) entry.gitUrl = url.stdout.trim()
    }
  }
  if (flag('notes')) entry.notes = flag('notes')

  const at = eco.repos.findIndex((r) => nameOf(r) === entry.name)
  if (at === -1) eco.repos.push(entry)
  else eco.repos[at] = { ...eco.repos[at], ...entry }

  const file = saveEcosystem(state, eco)
  out(`${at === -1 ? 'added' : 'updated'} "${entry.name}" in ${path.relative(PROJ, file)}`)
  out('next: ecosystem.mjs sync   then   ecosystem.mjs index')
}

function cmdPreflight() {
  const { eco, file } = loadConfig()
  out('ecosystem preflight')
  out(`  project      : ${PROJ}`)
  out(`  config       : ${file || '(none yet — would create ' + path.relative(PROJ, CFG) + ')'}`)
  out(`  git          : ${GIT ? '✓' : '✗ (required for clone/fetch)'}`)
  if (!eco) return out('  tlm.ecosystem: (not configured) — nothing to sync or index')
  const list = repos(eco)
  out(`  workspace    : ${eco.workspaceRoot || DEFAULT_WORKSPACE}`)
  out(`  repos        : ${list.length}`)
  for (const r of list) {
    const { dir, state } = statusOf(eco, r)
    out(`    - ${nameOf(r)}: ${state} (${contract(dir)})`)
  }
  out('')
  out("no writes were made — run 'sync' to clone/fetch, then 'index' to rebuild the map")
}

const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'list') cmdList()
else if (cmd === 'sync') cmdSync(rest)
else if (cmd === 'index') cmdIndex()
else if (cmd === 'add') cmdAdd(rest)
else if (cmd === 'preflight') cmdPreflight()
else die('usage: ecosystem.mjs {list | sync [name...] | index | add <path-or-giturl> [flags] | preflight}')
