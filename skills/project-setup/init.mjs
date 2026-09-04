#!/usr/bin/env node
// init.mjs — the HANDOVER path into /project-setup.
//
// The normal path asks the user everything. That is right for the person who set the
// project up, and wrong for the ninth teammate onboarding into it: they end up
// re-answering decisions that were made months ago (which tracker, which statuses,
// which base branch, which sibling repos), and each answer is a chance to answer it
// differently from everyone else.
//
// So the lead fills ONE file — the init doc — and sends it with the init command. The
// teammate drops it in the repo, runs /project-setup, and every value in it is already
// answered: no gating questions, no form rows, just whatever genuinely cannot be
// shared (their own Figma token) plus the OAuth connectors only they can click.
//
// Nothing here invents config. Everything it writes came from the doc; everything the
// doc does not carry is reported as STILL NEEDED so the skill asks for exactly that
// and nothing more.
//
// Usage (run from the consuming project):
//   node init.mjs template [--out <file>] [--from-current] [--with-secrets] [--for "<team>"] [--force]
//   node init.mjs detect   [--path <file>|-] [--json]      # what would be applied; no writes
//   node init.mjs apply    [--path <file>|-] [--dry-run] [--prefer-local] [--no-gitignore] [--json]
//   node init.mjs consume  [--path <file>]                 # delete the doc once applied
//
// The doc's shape is <rulesRoot>/setup/tlm-init.template.json — a settings.local.json
// with a $tlmInit meta block, so there is no second schema to keep in sync: `env` and
// `tlm` mean exactly what they mean in tlm-config.reference.json.
//
// Writes ONLY <project>/.claude/settings.local.json (and .gitignore, to keep a token
// out of a commit). Never touches ${CLAUDE_PLUGIN_ROOT}, never a sibling repo.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PROJ = process.env.TLM_PROJECT_DIR || process.cwd()
const CFG = path.join(PROJ, '.claude', 'settings.local.json')
const ALT = path.join(PROJ, '.claude', 'tlm.local.json')
const SELF_DIR = path.dirname(fileURLToPath(import.meta.url))
const RULES_ROOT = path.resolve(SELF_DIR, '..', '..')
const TEMPLATE_FILE = path.join(RULES_ROOT, 'setup', 'tlm-init.template.json')
const REFERENCE_FILE = path.join(RULES_ROOT, 'setup', 'tlm-config.reference.json')

const TEMPLATE_VERSION = 1

const out = (s) => process.stdout.write(s + '\n')
const die = (msg) => {
  process.stderr.write(`init: ${msg}\n`)
  process.exit(1)
}

const isFile = (p) => {
  try {
    return fs.statSync(p).isFile()
  } catch {
    return false
  }
}
const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}
const expand = (p) => {
  const s = String(p ?? '')
  if (!s) return ''
  return s.startsWith('~') ? path.join(os.homedir(), s.slice(1)) : s
}
const rel = (p) => {
  const r = path.relative(PROJ, p)
  return r.startsWith('..') ? p : r
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
const git = (args) => spawnSync(GIT, args, { shell: false, encoding: 'utf8' })

// --- parsing ----------------------------------------------------------------
// The doc is authored by a human in a chat client, so it is JSON in the loose sense:
// // comments, /* */ blocks and a trailing comma all survive. Strict JSON.parse on
// that fails with "Unexpected token /" — a message that reads like the file is
// corrupt rather than merely commented.

function stripComments(src) {
  let res = ''
  let inStr = false
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (inStr) {
      res += c
      if (c === '\\') {
        res += n ?? ''
        i += 2
        continue
      }
      if (c === '"') inStr = false
      i++
      continue
    }
    if (c === '"') {
      inStr = true
      res += c
      i++
      continue
    }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && n === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
      i += 2
      continue
    }
    res += c
    i++
  }
  return res
}

function parseLoose(raw, label) {
  const cleaned = stripComments(raw.replace(/^﻿/, '')).replace(/,(\s*[}\]])/g, '$1')
  try {
    return JSON.parse(cleaned)
  } catch (err) {
    die(`${label} is not valid JSON (${err.message})`)
  }
}

const readJsonSafe = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

const REF = readJsonSafe(REFERENCE_FILE)
const REF_VERSION = Number(REF?.configVersion) || 2
const PROJECT_TYPES = REF?.tlm?.project?.type?.values || [
  'nextjs-page-router',
  'nextjs-app-router',
  'react-native-expo',
  'react-native-cli',
  'flutter',
  'other',
]

// --- placeholders -----------------------------------------------------------
// A half-filled doc is the normal case: the lead fills what is team-wide and leaves
// the rest as a marker. A marker is NOT a value — importing "REPLACE_ME" as a
// workspace id would look configured and fail on the first real call, so every
// marker is dropped here and resurfaces in "still needed".

const MARKER = /REPLACE_ME|CHANGE_?ME|FILL_?ME|<<\s*FILL|YOUR_[A-Z0-9_]+_HERE|^\s*(?:tbd|todo|n\/a|-)\s*$/i
const isPlaceholder = (v) => typeof v === 'string' && (!v.trim() || MARKER.test(v))

// Drop doc keys (`//…`, `$…`), placeholder leaves and anything left empty. What
// survives is exactly what the lead actually answered.
function prune(v) {
  if (Array.isArray(v)) {
    const arr = v.map(prune).filter((x) => x !== undefined)
    return arr.length ? arr : undefined
  }
  if (v && typeof v === 'object') {
    const o = {}
    for (const [k, val] of Object.entries(v)) {
      if (k.startsWith('//') || k.startsWith('$')) continue
      const p = prune(val)
      if (p !== undefined) o[k] = p
    }
    return Object.keys(o).length ? o : undefined
  }
  if (v === null || v === undefined) return undefined
  if (isPlaceholder(v)) return undefined
  return v
}

// --- secrets ----------------------------------------------------------------
// Rule from tlm-config.reference.json: never print a secret value back. Not even
// into this script's own report, which Claude reads and may quote.

// `env.*` is secret by definition. Elsewhere only a leaf that HOLDS a credential is —
// tokenEnvKey holds the NAME of one, and masking a name reads as if a secret leaked
// into the tlm block.
const isSecretPath = (p) => {
  if (p.startsWith('env.')) return true
  const leaf = p.split('.').pop() || ''
  if (/envkey$/i.test(leaf)) return false
  return /(token|secret|password|api[_-]?key)$/i.test(leaf)
}
const mask = (v) => `••• (${String(v).length} chars)`
const show = (p, v) => (isSecretPath(p) ? mask(v) : typeof v === 'object' ? JSON.stringify(v) : String(v))

// --- what must never come from someone else's machine -----------------------
// Two classes of value survive the trip badly:
//   - per-machine paths (where clones live, which SSH host alias resolves)
//   - per-user secrets (a Figma PAT is personal; a shared one attributes every read
//     to the lead and breaks for everyone at once when it is rotated)
// Both are kept if this machine already has them, and only filled when it does not.

const isProtected = (p) =>
  p === 'tlm.ecosystem.workspaceRoot' ||
  p === 'tlm.pluginRepo.upstreamRemote' ||
  /^tlm\.ecosystem\.repos\[[^\]]*\]\.path$/.test(p) ||
  p.startsWith('env.')

// Keys a handover file must never carry into a teammate's settings: these grant tool
// access, and a file that arrives over chat is not an authorization channel.
const REFUSED_KEYS = new Set(['permissions', 'hooks', 'allowedTools', 'enableAllProjectMcpServers', 'enabledPlugins'])
const IMPORTABLE_KEYS = new Set(['env', 'tlm', 'mcpServers'])

// --- discovery --------------------------------------------------------------

const IN_PROJECT = [
  '.claude/tlm-init.json',
  '.claude/tlm-init.jsonc',
  '.claude/tlm-init.local.json',
  'tlm-init.json',
  'tlm-init.jsonc',
]
// A teammate saves a chat attachment wherever their browser puts it. These are
// reported so Claude can name the file it can see — but never auto-applied: a stale
// doc in ~/Downloads belongs to whichever project it was written for, not this one.
const OUTSIDE = ['~/tlm-init.json', '~/Downloads/tlm-init.json', '~/Desktop/tlm-init.json']

function discover() {
  const found = []
  for (const c of IN_PROJECT) {
    const abs = path.join(PROJ, c)
    if (isFile(abs)) found.push({ file: abs, inProject: true })
  }
  const nearby = []
  for (const c of OUTSIDE) {
    const abs = expand(c)
    if (isFile(abs)) nearby.push(abs)
  }
  return { found, nearby }
}

function resolveInput(flagPath) {
  if (flagPath === '-') {
    let raw = ''
    try {
      raw = fs.readFileSync(0, 'utf8')
    } catch {
      die('nothing on stdin')
    }
    if (!raw.trim()) die('nothing on stdin')
    return { file: '(stdin)', raw }
  }
  if (flagPath) {
    const abs = path.isAbsolute(expand(flagPath)) ? expand(flagPath) : path.resolve(PROJ, expand(flagPath))
    if (!isFile(abs)) die(`no such file: ${abs}`)
    return { file: abs, raw: fs.readFileSync(abs, 'utf8') }
  }
  if (process.env.TLM_INIT_FILE) return resolveInput(process.env.TLM_INIT_FILE)
  const { found, nearby } = discover()
  if (found.length) return { file: found[0].file, raw: fs.readFileSync(found[0].file, 'utf8') }
  return { file: null, raw: null, nearby }
}

// --- merge ------------------------------------------------------------------
// Deep merge with a record of every decision, because "it silently overwrote my
// token" is the one failure mode this must never have.

const naturalKey = (o) => (o && typeof o === 'object' ? o.name ?? o.id ?? o.app ?? null : null)

function mergeValue(target, source, base, changes, opts) {
  for (const [k, sv] of Object.entries(source)) {
    const p = base ? `${base}.${k}` : k
    const tv = target[k]

    if (Array.isArray(sv)) {
      const keyed = sv.every((e) => naturalKey(e) !== null) && Array.isArray(tv) && tv.every((e) => naturalKey(e) !== null)
      if (!keyed) {
        if (tv === undefined) changes.push({ kind: 'set', path: p, value: `${sv.length} item(s)` })
        else if (JSON.stringify(tv) !== JSON.stringify(sv)) {
          if (opts.preferLocal) {
            changes.push({ kind: 'kept-local', path: p, note: 'local list kept (--prefer-local)' })
            continue
          }
          changes.push({ kind: 'replaced', path: p, value: `${sv.length} item(s)` })
        } else continue
        target[k] = JSON.parse(JSON.stringify(sv))
        continue
      }
      // Both sides are keyed lists (channels, ecosystem repos, monorepo apps): merge
      // entry by entry so a repo a teammate added locally is not dropped by an import.
      const merged = tv.map((e) => ({ ...e }))
      for (const se of sv) {
        const key = naturalKey(se)
        const at = merged.findIndex((e) => naturalKey(e) === key)
        if (at === -1) {
          merged.push(JSON.parse(JSON.stringify(se)))
          changes.push({ kind: 'set', path: `${p}[${key}]`, value: 'new entry' })
        } else {
          mergeValue(merged[at], se, `${p}[${key}]`, changes, opts)
        }
      }
      target[k] = merged
      continue
    }

    if (sv && typeof sv === 'object') {
      if (!tv || typeof tv !== 'object' || Array.isArray(tv)) target[k] = {}
      mergeValue(target[k], sv, p, changes, opts)
      continue
    }

    // scalar
    if (tv === undefined || tv === null || isPlaceholder(tv)) {
      target[k] = sv
      changes.push({ kind: 'set', path: p, value: show(p, sv) })
      continue
    }
    if (tv === sv) continue
    if (isProtected(p)) {
      changes.push({
        kind: 'kept-local',
        path: p,
        note: p.startsWith('env.') ? 'this machine already has its own value' : 'per-machine value, not imported',
      })
      continue
    }
    if (opts.preferLocal) {
      changes.push({ kind: 'kept-local', path: p, note: 'local value kept (--prefer-local)' })
      continue
    }
    target[k] = sv
    changes.push({ kind: 'overwrote', path: p, value: show(p, sv), was: show(p, tv) })
  }
}

// --- gaps -------------------------------------------------------------------
// What the doc could not answer. Same checks the SessionStart hook runs, plus the
// where-to-get-it line the form needs — so the skill asks for these and only these.

function gaps(cfg) {
  const tlm = cfg?.tlm || {}
  const g = []
  const add = (key, why, where) => g.push({ key, why, where })
  const blank = (v) => v === undefined || v === null || v === '' || isPlaceholder(v)

  if (blank(tlm.project?.name)) add('tlm.project.name', 'used in release-note headings', 'the human-readable project name')
  if (blank(tlm.project?.type)) add('tlm.project.type', 'fe-coding would re-detect the stack every session', `one of: ${PROJECT_TYPES.join(' | ')}`)
  if (blank(tlm.project?.baseBranch)) add('tlm.project.baseBranch', 'ticket-workflow cannot cut branches', 'git symbolic-ref refs/remotes/origin/HEAD, then confirm')

  if (tlm.design?.enabled === true) {
    const key = tlm.design?.tokenEnvKey || 'FIGMA_ACCESS_TOKEN'
    if (blank(cfg?.env?.[key])) {
      add(`env.${key}`, 'figma-to-code hard-stops without it — it never guesses a design', 'Figma → avatar → Settings → Security → Personal access tokens → Generate. Scope "File content". Starts with figd_. PER-USER: each teammate makes their own.')
    }
  }

  if (tlm.tickets?.enabled === true) {
    if (blank(tlm.tickets?.system)) add('tlm.tickets.system', 'no tracker to talk to', 'clickup | jira | linear | azure-devops | github')
    if (blank(tlm.tickets?.idPattern)) add('tlm.tickets.idPattern', 'ticket ids cannot be found in commits', 'detected from git log, then confirm — e.g. TLM-\\d+')
    if (blank(tlm.tickets?.urlTemplate)) add('tlm.tickets.urlTemplate', 'release notes cannot link tickets', 'paste any ticket URL — workspaceId and this template are both derived from it')
    if (blank(tlm.tickets?.statuses?.inProgress)) add('tlm.tickets.statuses.inProgress', 'ticket-workflow cannot move the ticket', 'fetch one real ticket first, then pick from its actual status names')
    if (blank(tlm.tickets?.statuses?.inReview)) add('tlm.tickets.statuses.inReview', 'ticket-workflow cannot submit for review', 'same — from the real status vocabulary')
    if (!Array.isArray(tlm.tickets?.statuses?.ready) || !tlm.tickets.statuses.ready.length) {
      add('tlm.tickets.statuses.ready', 'deployment-checklist cannot tell what is safe to ship', 'the statuses that mean shippable')
    }
    if (tlm.tickets?.hasDeploymentTicket === undefined) add('tlm.tickets.hasDeploymentTicket', 'deployment-checklist branches on it', 'yes/no — does the team keep one release ticket listing what ships?')
  }

  if (tlm.chat?.enabled === true) {
    const chans = Array.isArray(tlm.chat?.channels) ? tlm.chat.channels : []
    if (!chans.length) add('tlm.chat.channels', 'mobile-release-notes has nowhere to post', 'Slack → open the channel → View channel details → id at the bottom (C…)')
    chans.forEach((c, i) => {
      if (blank(c?.id)) add(`tlm.chat.channels[${i}].id`, 'that channel cannot be posted to', 'Slack → View channel details → id at the bottom (C…)')
    })
  }

  if (tlm.ecosystem?.enabled === true) {
    const repos = Array.isArray(tlm.ecosystem?.repos) ? tlm.ecosystem.repos : []
    if (!repos.length) add('tlm.ecosystem.repos', 'ecosystem is on but nothing is registered', 'a folder path or a git URL per sibling repo')
    repos.forEach((r) => {
      if (blank(r?.path) && blank(r?.gitUrl)) add(`tlm.ecosystem.repos[${r?.name || '?'}]`, 'neither on disk nor clonable', 'give it a path or a gitUrl')
    })
  }

  if (tlm.pluginRepo?.enabled === true) {
    if (blank(tlm.pluginRepo?.upstreamRemote)) add('tlm.pluginRepo.upstreamRemote', 'rule changes cannot be shipped as a PR', 'the git URL that works on THIS machine (the default is an SSH host alias)')
    if (blank(tlm.pluginRepo?.ownerRepo)) add('tlm.pluginRepo.ownerRepo', 'no compare URL can be built', '<owner>/<repo> on GitHub')
  }
  return g
}

// What only the teammate can do — no file can carry an OAuth session.
function humanActions(cfg) {
  const tlm = cfg?.tlm || {}
  const a = []
  if (tlm.tickets?.enabled === true) {
    const sys = String(tlm.tickets?.system || '')
    if (sys === 'clickup') a.push('ClickUp connector — claude.ai → Settings → Connectors → ClickUp → Connect, then /mcp here')
    else if (sys === 'jira') a.push('Atlassian/Jira MCP + JIRA_API_TOKEN — id.atlassian.com → Security → API tokens')
    else if (sys === 'linear') a.push('Linear MCP — claude mcp add --transport sse linear https://mcp.linear.app/sse')
    else if (sys === 'github') a.push('GitHub — claude.ai → Settings → Connectors → GitHub → Connect (then /mcp here), or fall back to gh auth login')
    else if (sys === 'azure-devops') a.push('Azure CLI — az login')
  }
  if (tlm.chat?.enabled === true) a.push('Slack connector — claude.ai → Settings → Connectors → Slack → Connect, then /mcp here')
  if (tlm.design?.enabled === true) a.push('Your OWN Figma personal access token (never reuse a teammate\'s)')
  return a
}

// --- gitignore --------------------------------------------------------------
// A doc that carries a token, or a settings file that will, must not be committable.
// This is the one write outside .claude/ and it only ever appends.

function ignored(relPath) {
  if (!GIT) return null
  const inRepo = spawnSync(GIT, ['-C', PROJ, 'rev-parse', '--git-dir'], { shell: false, stdio: 'ignore' })
  if (inRepo.status !== 0) return null
  return spawnSync(GIT, ['-C', PROJ, 'check-ignore', '-q', relPath], { shell: false, stdio: 'ignore' }).status === 0
}

function ensureGitignore(dryRun) {
  const wanted = ['.claude/settings.local.json', '.claude/tlm.local.json', '.claude/tlm-init.json', 'tlm-init.json']
  const need = wanted.filter((w) => ignored(w) === false)
  if (!need.length) return []
  if (dryRun) return need
  const file = path.join(PROJ, '.gitignore')
  const prev = isFile(file) ? fs.readFileSync(file, 'utf8') : ''
  const block = `${prev && !prev.endsWith('\n') ? '\n' : ''}\n# tlm-claude-plugins — machine-local config and handover docs hold secrets\n${need.join('\n')}\n`
  fs.writeFileSync(file, prev + block)
  return need
}

// --- report -----------------------------------------------------------------

function analyze(raw, label) {
  const doc = parseLoose(raw, label)
  const rawMeta = doc?.$tlmInit || doc?.tlmInit || {}
  // A meta field the lead never filled in is still a marker — report it as unstated
  // rather than echoing "<<FILL: your name>>" back as the sender.
  const meta = Object.fromEntries(Object.entries(rawMeta).map(([k, v]) => [k, isPlaceholder(v) ? '' : v]))
  const warnings = []

  if (Number(meta.templateVersion) > TEMPLATE_VERSION) {
    warnings.push(`the doc says templateVersion ${meta.templateVersion}, this plugin knows ${TEMPLATE_VERSION} — update the plugin (/plugin marketplace update tlm-claude-plugins) before trusting it`)
  }
  const docSchema = Number(meta.configVersion)
  if (Number.isFinite(docSchema) && docSchema < REF_VERSION) {
    warnings.push(`the doc was written for tlm schema v${docSchema}; this plugin ships v${REF_VERSION} — after applying, /project-setup runs as a SYNC and adds only the fields v${docSchema + 1}+ introduced`)
  } else if (Number.isFinite(docSchema) && docSchema > REF_VERSION) {
    warnings.push(`the doc was written for tlm schema v${docSchema}, newer than this plugin's v${REF_VERSION} — update the plugin first, or fields will be dropped`)
  }

  const refused = []
  const ignoredKeys = []
  const importable = {}
  for (const [k, v] of Object.entries(doc || {})) {
    if (k.startsWith('//') || k.startsWith('$') || k === 'tlmInit') continue
    if (REFUSED_KEYS.has(k)) {
      refused.push(k)
      continue
    }
    if (!IMPORTABLE_KEYS.has(k)) {
      ignoredKeys.push(k)
      continue
    }
    importable[k] = v
  }
  if (refused.length) {
    warnings.push(`NOT imported: ${refused.join(', ')} — a handover file is not an authorization channel; tool permissions and hooks stay a local decision`)
  }
  if (ignoredKeys.length) warnings.push(`unknown top-level key(s) ignored: ${ignoredKeys.join(', ')}`)

  const clean = prune(importable) || {}
  dropIncompleteEntries(clean, warnings)
  const type = clean?.tlm?.project?.type
  if (type && !PROJECT_TYPES.includes(type)) {
    warnings.push(`tlm.project.type "${type}" is not one of ${PROJECT_TYPES.join(' | ')} — fix the doc or answer the question instead`)
  }
  const figKey = clean?.tlm?.design?.tokenEnvKey || 'FIGMA_ACCESS_TOKEN'
  const fig = clean?.env?.[figKey]
  if (fig && !String(fig).startsWith('figd_')) {
    warnings.push(`env.${figKey} does not start with figd_ — Figma personal access tokens do; check it before figma-to-code stops on it`)
  }
  if (clean?.env && Object.keys(clean.env).length && meta.secrets === 'per-user') {
    warnings.push('the doc declares secrets:"per-user" but carries env values — treating them as fallbacks only; a value already on this machine wins')
  }

  // Which PHASE 1 gating questions this doc has already answered.
  const t = clean?.tlm || {}
  const gates = {
    projectType: t.project?.type !== undefined,
    tickets: t.tickets?.enabled !== undefined,
    design: t.design?.enabled !== undefined,
    chat: t.chat?.enabled !== undefined,
    ecosystem: t.ecosystem?.enabled !== undefined,
  }

  return { doc, meta, clean, warnings, gates }
}

// A template's example entry is a list of markers with one real-looking field left in
// it (a `ref`, a default). Pruning leaves that shard behind, and an ecosystem repo with
// nothing but a ref is worse than no entry at all — it puts a repo in the map that can
// never be opened. So a keyed list entry that lost its identity is dropped outright.
function dropIncompleteEntries(clean, warnings) {
  const lists = [
    { get: () => clean?.tlm?.ecosystem, key: 'repos', ok: (e) => e.name && (e.gitUrl || e.path), label: 'tlm.ecosystem.repos' },
    { get: () => clean?.tlm?.chat, key: 'channels', ok: (e) => e.id, label: 'tlm.chat.channels' },
    { get: () => clean?.tlm?.project, key: 'apps', ok: (e) => e.name && e.pathPrefix, label: 'tlm.project.apps' },
  ]
  for (const l of lists) {
    const owner = l.get()
    const arr = owner?.[l.key]
    if (!Array.isArray(arr)) continue
    const keep = arr.filter((e) => e && typeof e === 'object' && l.ok(e))
    if (keep.length === arr.length) continue
    warnings.push(
      `${arr.length - keep.length} ${l.label} entry/entries in the doc were left as template placeholders — ignored, so /project-setup asks for them instead`
    )
    if (keep.length) owner[l.key] = keep
    else delete owner[l.key]
  }
}

function flatPaths(v, base = '', acc = []) {
  if (Array.isArray(v)) {
    acc.push(base)
    return acc
  }
  if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) flatPaths(val, base ? `${base}.${k}` : k, acc)
    return acc
  }
  acc.push(base)
  return acc
}

// --- subcommands ------------------------------------------------------------

function cmdDetect(flags) {
  const input = resolveInput(flags.path)
  if (!input.file) {
    const { nearby } = input
    if (flags.json) {
      out(JSON.stringify({ ok: false, found: false, nearby: nearby || [] }, null, 2))
      return
    }
    out('no init doc found in this project.')
    out(`  looked for: ${IN_PROJECT.join(', ')}`)
    if (nearby?.length) {
      out('')
      out('  but these exist outside the project — confirm one belongs to THIS project before applying:')
      for (const n of nearby) out(`    ${n}      → node init.mjs apply --path "${n}"`)
    }
    out('')
    out('  nothing to import: run /project-setup the normal way (it asks the questions itself).')
    process.exitCode = 3
    return
  }

  const { meta, clean, warnings, gates } = analyze(input.raw, input.file)
  const provided = flatPaths(clean).filter(Boolean)
  const existing = readJsonSafe(CFG) || {}
  const preview = JSON.parse(JSON.stringify(existing))
  const changes = []
  mergeValue(preview, clean, '', changes, { preferLocal: !!flags.preferLocal })
  const remaining = gaps(preview)

  if (flags.json) {
    out(JSON.stringify({ ok: true, found: true, file: input.file, meta, gates, provided, changes, remaining, actions: humanActions(preview), warnings }, null, 2))
    return
  }

  out(`init doc: ${rel(input.file)}`)
  out(`  from        : ${meta.createdBy || '(unstated)'}${meta.createdFor ? ` · for: ${meta.createdFor}` : ''}`)
  out(`  template v${meta.templateVersion || '?'} · tlm schema v${meta.configVersion || '?'} (plugin ships v${REF_VERSION})`)
  if (meta.notes) out(`  notes       : ${meta.notes}`)
  out(`  carries     : ${provided.length} value(s)`)
  out(`  answers     : ${Object.entries(gates).filter(([, v]) => v).map(([k]) => k).join(', ') || '(no gating question)'}`)
  out('')
  out(`would write ${rel(CFG)}:`)
  for (const c of changes) {
    if (c.kind === 'set') out(`  + ${c.path} = ${c.value}`)
    else if (c.kind === 'overwrote') out(`  ~ ${c.path} = ${c.value}   (was ${c.was})`)
    else if (c.kind === 'replaced') out(`  ~ ${c.path} → ${c.value}`)
    else out(`  = ${c.path} kept — ${c.note}`)
  }
  if (!changes.length) out('  (nothing — this project already matches the doc)')
  reportTail(remaining, humanActions(preview), warnings)
  out('')
  out('no writes were made — run: node init.mjs apply')
}

function cmdApply(flags) {
  const input = resolveInput(flags.path)
  if (!input.file) {
    out('no init doc found — nothing to apply. Run /project-setup the normal way.')
    process.exitCode = 3
    return
  }
  const { meta, clean, warnings, gates } = analyze(input.raw, input.file)
  if (!Object.keys(clean).length) {
    die(`${rel(input.file)} carries no usable values (everything is blank or still a placeholder)`)
  }

  const existing = readJsonSafe(CFG)
  if (existing === null && isFile(CFG)) {
    die(`${rel(CFG)} exists but is not valid JSON — fix or move it first; refusing to clobber a hand-edited file`)
  }
  const cfg = existing || {}
  const changes = []
  mergeValue(cfg, clean, '', changes, { preferLocal: !!flags.preferLocal })

  // tlm.version records which schema the values conform to. Taking it from the doc
  // (not from the plugin) is what lets the SessionStart hook still flag a sync run.
  cfg.tlm = cfg.tlm || {}
  if (cfg.tlm.version === undefined) {
    cfg.tlm.version = Number(meta.configVersion) || REF_VERSION
    changes.push({ kind: 'set', path: 'tlm.version', value: String(cfg.tlm.version) })
  }

  const remaining = gaps(cfg)
  const actions = humanActions(cfg)
  const gitignored = flags.gitignore === false ? [] : ensureGitignore(!!flags.dryRun)

  if (!flags.dryRun) {
    fs.mkdirSync(path.dirname(CFG), { recursive: true })
    fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2) + '\n')
    // Prove it parses, exactly as PHASE 4 requires.
    if (!readJsonSafe(CFG)) die(`wrote ${rel(CFG)} but it does not parse back — restore from git and report this`)
  }

  if (isFile(ALT) && cfg.tlm) {
    warnings.push(`${rel(ALT)} also exists — skills read settings.local.json FIRST, so that file is now shadowed; move any values you still need and delete it`)
  }
  if (ignored('.claude/settings.local.json') === false) {
    warnings.push(`SECURITY: ${rel(CFG)} is still not gitignored — do not commit until it is`)
  }

  if (flags.json) {
    out(JSON.stringify({ ok: true, applied: !flags.dryRun, file: input.file, target: CFG, meta, gates, changes, remaining, actions, gitignored, warnings }, null, 2))
    return
  }

  const counts = changes.reduce((a, c) => ({ ...a, [c.kind]: (a[c.kind] || 0) + 1 }), {})
  out(`${flags.dryRun ? '[dry-run] would apply' : 'applied'} ${rel(input.file)} → ${rel(CFG)}`)
  out(`  from        : ${meta.createdBy || '(unstated)'}${meta.createdFor ? ` · for: ${meta.createdFor}` : ''}`)
  out(`  set         : ${counts.set || 0}${counts.overwrote ? ` · overwrote: ${counts.overwrote}` : ''}${counts.replaced ? ` · replaced: ${counts.replaced}` : ''}${counts['kept-local'] ? ` · kept local: ${counts['kept-local']}` : ''}`)
  for (const c of changes.filter((c) => c.kind !== 'set')) {
    if (c.kind === 'overwrote') out(`      ~ ${c.path} = ${c.value}   (was ${c.was})`)
    else if (c.kind === 'replaced') out(`      ~ ${c.path} → ${c.value}`)
    else out(`      = ${c.path} kept — ${c.note}`)
  }
  out(`  answered    : ${Object.entries(gates).filter(([, v]) => v).map(([k]) => k).join(', ') || '(none)'} — do NOT ask these again`)
  if (gitignored.length) out(`  gitignore   : ${flags.dryRun ? 'would add' : 'added'} ${gitignored.join(', ')}`)
  reportTail(remaining, actions, warnings)
  out('')
  out('next:')
  if (cfg.tlm?.ecosystem?.enabled === true && (cfg.tlm.ecosystem.repos || []).length) {
    out(`  node "${path.join(RULES_ROOT, 'skills/project-setup/ecosystem.mjs')}" sync     # clone the sibling repos`)
    out(`  node "${path.join(RULES_ROOT, 'skills/project-setup/ecosystem.mjs')}" index    # write .claude/ecosystem-map.md`)
  }
  out(`  verify each integration with one real call (PHASE 3), then:`)
  out(`  node "${path.join(SELF_DIR, 'init.mjs')}" consume   # delete the handover doc once you are done with it`)
}

function reportTail(remaining, actions, warnings) {
  out('')
  if (remaining.length) {
    out(`still needed — ASK ONLY THESE (${remaining.length}):`)
    for (const r of remaining) {
      out(`  - ${r.key}`)
      out(`      why  : ${r.why}`)
      out(`      where: ${r.where}`)
    }
  } else {
    out('still needed: nothing — every value the skills read is present.')
  }
  if (actions.length) {
    out('')
    out('the user must do these themselves (no file can carry them):')
    for (const a of actions) out(`  • ${a}`)
  }
  if (warnings.length) {
    out('')
    out('warnings:')
    for (const w of warnings) out(`  ! ${w}`)
  }
}

function cmdConsume(flags) {
  const input = resolveInput(flags.path)
  if (!input.file || input.file === '(stdin)') {
    out('no init doc on disk — nothing to remove.')
    return
  }
  if (!isFile(CFG)) {
    die(`${rel(CFG)} does not exist yet — apply the doc before deleting it (node init.mjs apply)`)
  }
  fs.rmSync(input.file)
  out(`removed ${rel(input.file)} — its values now live in ${rel(CFG)} (gitignored).`)
  out('A handover doc is single-use: it holds team config and possibly a token, and it goes stale the')
  out('moment the config changes. Re-request a fresh one instead of keeping this around.')
}

// --- template ---------------------------------------------------------------
// The lead's side. --from-current is the real workflow: a project that already works
// IS the answer key, so the doc is generated from its config rather than hand-typed.

const PER_MACHINE_STRIP = [
  ['tlm', 'ecosystem', 'workspaceRoot'],
  ['tlm', 'specDriven'],
]

function fromCurrent(withSecrets) {
  const cfg = readJsonSafe(CFG) || readJsonSafe(ALT)
  if (!cfg) die(`no config to copy from — ${rel(CFG)} not found. Run /project-setup here first, or drop --from-current for a blank template.`)
  const src = cfg.tlm ? cfg : { tlm: cfg }
  const doc = { tlm: JSON.parse(JSON.stringify(src.tlm || {})) }

  // Secrets: per-user by default. A shared Figma PAT attributes every read to the
  // lead and dies for the whole team the day it is rotated.
  doc.env = {}
  const tokenKey = doc.tlm?.design?.tokenEnvKey || 'FIGMA_ACCESS_TOKEN'
  if (doc.tlm?.design?.enabled === true) {
    doc.env[tokenKey] = withSecrets && src.env?.[tokenKey] ? src.env[tokenKey] : `<<FILL: ${tokenKey} — each teammate generates their own>>`
  }
  if (withSecrets) {
    for (const [k, v] of Object.entries(src.env || {})) if (!(k in doc.env)) doc.env[k] = v
  }

  for (const p of PER_MACHINE_STRIP) {
    let cur = doc
    for (let i = 0; i < p.length - 1; i++) cur = cur?.[p[i]]
    if (cur) delete cur[p[p.length - 1]]
  }
  // A sibling's path is where it lives on THIS machine; the git URL is what travels.
  for (const r of doc.tlm?.ecosystem?.repos || []) {
    if (r.gitUrl) delete r.path
  }
  return doc
}

function cmdTemplate(flags) {
  const outPath = path.resolve(expand(flags.out || 'tlm-init.json'))
  if (isFile(outPath) && !flags.force) die(`${outPath} already exists — pass --force to overwrite`)

  let body
  if (flags.fromCurrent) {
    const doc = fromCurrent(!!flags.withSecrets)
    const who = GIT ? (git(['config', 'user.name']).stdout || '').trim() : ''
    body = {
      $tlmInit: {
        templateVersion: TEMPLATE_VERSION,
        configVersion: Number(doc.tlm?.version) || REF_VERSION,
        createdBy: who || '',
        createdFor: flags.for || '',
        secrets: flags.withSecrets ? 'included' : 'per-user',
        notes: '',
        howToUse: [
          'Save this file into the project as .claude/tlm-init.json',
          'In Claude Code, run:  /project-setup init',
          'Everything in here is applied without asking; you are only asked for what it does not carry.',
        ],
      },
      ...doc,
    }
  } else {
    if (!isFile(TEMPLATE_FILE)) die(`template not found at ${TEMPLATE_FILE} (unusual install layout) — copy setup/tlm-init.template.json by hand`)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.copyFileSync(TEMPLATE_FILE, outPath)
    out(`wrote ${outPath} (blank template — fill it in, then send it)`)
    handoverMessage(outPath, false)
    return
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(body, null, 2) + '\n')
  const provided = flatPaths(prune({ tlm: body.tlm, env: body.env }) || {}).filter(Boolean)
  out(`wrote ${outPath} from ${rel(CFG)} — ${provided.length} value(s) carried`)
  out(`  secrets     : ${flags.withSecrets ? 'INCLUDED — treat this file as a credential' : 'per-user (left as a <<FILL>> marker)'}`)
  out('  stripped    : per-machine values (ecosystem.workspaceRoot, sibling paths, specDriven) — each machine re-derives them')
  out('')
  out('review it before sending — it carries your team\'s tracker ids, channel ids and repo URLs.')
  handoverMessage(outPath, !!flags.withSecrets)
}

function handoverMessage(outPath, withSecrets) {
  out('')
  out('── paste this with the file ─────────────────────────────────────────')
  out('Setup for this repo is pre-filled. Two steps:')
  out(`  1. Save the attached ${path.basename(outPath)} into the project as .claude/tlm-init.json`)
  out('  2. In Claude Code run:  /project-setup init')
  out('You will only be asked for what the file cannot carry (your own Figma token, and')
  out('clicking Connect on the ClickUp / Slack connectors).')
  out('────────────────────────────────────────────────────────────────────')
  if (withSecrets) {
    out('')
    out('⚠ This file now contains a real token. Send it over a channel you would send a')
    out('  password over, tell them to delete it after /project-setup init, and prefer')
    out('  per-user tokens next time — a shared PAT dies for everyone when it is rotated.')
  }
}

// --- cli --------------------------------------------------------------------

function parseFlags(argv) {
  const f = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--path' || a === '-p') f.path = argv[++i]
    else if (a === '--out' || a === '-o') f.out = argv[++i]
    else if (a === '--for') f.for = argv[++i]
    else if (a === '--json') f.json = true
    else if (a === '--dry-run') f.dryRun = true
    else if (a === '--prefer-local') f.preferLocal = true
    else if (a === '--no-gitignore') f.gitignore = false
    else if (a === '--from-current') f.fromCurrent = true
    else if (a === '--with-secrets') f.withSecrets = true
    else if (a === '--force') f.force = true
    else if (a === '-') f.path = '-'
    else if (!a.startsWith('-') && !f.path) f.path = a
    else die(`unknown flag: ${a}`)
  }
  return f
}

const [cmd, ...rest] = process.argv.slice(2)
const flags = parseFlags(rest)
if (cmd === 'detect') cmdDetect(flags)
else if (cmd === 'apply') cmdApply(flags)
else if (cmd === 'consume') cmdConsume(flags)
else if (cmd === 'template') cmdTemplate(flags)
else
  die(
    'usage: init.mjs {template [--out f] [--from-current] [--with-secrets] [--for "team"] | detect [--path f|-] [--json] | apply [--path f|-] [--dry-run] [--prefer-local] [--json] | consume}'
  )
