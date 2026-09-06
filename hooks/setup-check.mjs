#!/usr/bin/env node
// SessionStart hook for the tlm-project-setup skill.
//
// Reports the state of this project's workflow-skill config so Claude can tell the
// user what's missing BEFORE a skill fails mid-task. Outcomes:
//   1. No .claude/settings.local.json at all -> stay SILENT (not every project uses
//      the workflow skills; nagging a plain coding repo is noise).
//   2. Config exists and looks complete    -> stay silent.
//   3. Config exists but is INCOMPLETE     -> print what's missing + how to fix.
// Independently:
//   - BASELINE companions missing (git; Node >= 20.19 when the repo is on OpenSpec)
//     -> always surface.
//   - the config file exists but is not valid JSON -> say so (the old jq-based
//     version failed silently here, which read as "config is fine").
//   - an openspec/ directory present -> emit the tlm-spec-driven reminder.
//   - a handed-over init doc (.claude/tlm-init.json) present -> always surface. This is
//     the one thing that must break outcome 1's silence: the doc IS the config, and a
//     teammate re-answering questions it already answers is the failure it prevents.
// These fire regardless of the tlm-config outcome. With the baseline healthy and no
// config/openspec, the hook stays silent.
//
// stdout on exit 0 is auto-injected into Claude's context.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readStdinPayload, delegateToVendored, which } from './lib/hook-io.mjs'

const { raw, json: input } = readStdinPayload()
const proj = input?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()

// Vendored rules win — see hook-io.mjs. A project that vendors the plugin runs its
// own copy of this check, so a change to it applies to that project immediately.
delegateToVendored({ selfUrl: import.meta.url, startDirs: [proj], raw })

const CFG = path.join(proj, '.claude', 'settings.local.json')
const ALT = path.join(proj, '.claude', 'tlm.local.json')

const exists = (p) => {
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

// Parse a config file. Unlike the jq version, a syntax error is reported rather
// than swallowed — a malformed settings.local.json used to look identical to a
// healthy one.
const parseErrors = []
function readJson(p) {
  if (!exists(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (err) {
    parseErrors.push(`  - ${p} is not valid JSON (${err.message}) — no skill can read this project's config until it parses.`)
    return null
  }
}

// jq's `//` alternative operator treats null and false as absent; `q()` keeps the
// same semantics so the checks below read the way they did in the shell version.
const q = (v) => (v === null || v === undefined || v === false ? '' : String(v))

// --- tlm-spec-driven (OpenSpec) detection --------------------------------------
// Independent of the tlm config: a repo can be spec-driven without using the
// other workflow skills. If an openspec/ directory exists, this repo is on
// OpenSpec -> remind Claude to drive it by default and announce each CLI call.
const onOpenSpec = isDir(path.join(proj, 'openspec'))
const OPENSPEC_MSG = onOpenSpec
  ? `[tlm-spec-driven] This repo is on OpenSpec (openspec/ present).
  - PER-TICKET GATE: when a ticket or a substantial feature starts (new domain/screen, new endpoint,
    altered flow), ASK the user once: apply OpenSpec for this one? Only if they say yes, run the
    tlm-spec-driven skill (/opsx:propose <id> -> present proposal -> /opsx:apply via tlm-fe-coding -> /opsx:sync
    -> /opsx:archive). If they decline, or it's a trivial fix/copy/rename, run the normal rules skills
    (tlm-fe-coding / tlm-ticket-workflow) and do NOT touch OpenSpec.
  - TRANSPARENCY (required): whenever you do run an openspec / npx openspec / /opsx:* command, print a
    one-line notice first so the user is aware, e.g.  "▶ OpenSpec: npx openspec@latest init --tools claude".
  - If Node < 20.19 or npm is unreachable, say so once and fall back to ordinary tlm-fe-coding.`
  : ''

// --- baseline companion tools ----------------------------------------------
// Node no longer needs checking — this hook IS Node, so reaching this line proves
// it. What remains: git (the gitignore safety check below and the contribute-back
// PR both shell out to it) and the Node version floor that OpenSpec requires.
const baseline = []
const gitBin = which('git')
if (!gitBin) {
  baseline.push(
    '  - git not found — the settings.local.json gitignore safety check and the contribute-back PR (plugin-pr.mjs) cannot run. Install Git (Git for Windows on Windows).'
  )
}
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number)
if (onOpenSpec && (nodeMajor < 20 || (nodeMajor === 20 && nodeMinor < 19))) {
  baseline.push(
    `  - Node ${process.versions.node} is below the 20.19 the OpenSpec CLI requires, and this repo is on OpenSpec. Upgrade Node or expect tlm-spec-driven to fall back to plain tlm-fe-coding.`
  )
}
const BASELINE_MSG = baseline.length
  ? `[baseline] Required companion tools are missing (install these first):\n${baseline.join('\n')}\n`
  : ''

// --- a handed-over init doc -------------------------------------------------
// The lead pre-fills one and sends it with the init command; the teammate drops it in
// the repo. It is the ONE case where a project with no config at all must still speak:
// staying silent here is how a teammate ends up hand-answering questions that are
// already answered in a file sitting next to them.
const INIT_DOC = ['.claude/tlm-init.json', '.claude/tlm-init.jsonc', '.claude/tlm-init.local.json', 'tlm-init.json', 'tlm-init.jsonc']
  .map((f) => path.join(proj, f))
  .find(exists)
let INIT_MSG = ''
if (INIT_DOC) {
  const relDoc = path.relative(proj, INIT_DOC)
  let notIgnored = false
  if (gitBin) {
    const inRepo = spawnSync(gitBin, ['-C', proj, 'rev-parse', '--git-dir'], { shell: false, stdio: 'ignore' })
    if (inRepo.status === 0) {
      notIgnored =
        spawnSync(gitBin, ['-C', proj, 'check-ignore', '-q', relDoc], { shell: false, stdio: 'ignore' }).status !== 0
    }
  }
  INIT_MSG = `[tlm-project-setup] A handed-over init doc is present: ${relDoc}
  - It carries this project's pre-filled config (tracker, status names, base branch, sibling repos) —
    decisions someone already made for this project.
  - ACTION: run /tlm-project-setup BEFORE asking the user any setup question. Its PHASE 0.5 applies the doc,
    then asks only for what a file cannot carry (their own Figma token, the OAuth connector clicks).
  - Apply it with the script, never by hand-copying values:
    node <rulesRoot>/skills/tlm-project-setup/init.mjs detect   # no writes
    node <rulesRoot>/skills/tlm-project-setup/init.mjs apply    # merges, drops placeholders, refuses
                                                            # permissions/hooks, lists what is still missing
  - If this project is ALREADY configured, the doc is leftover and goes stale: offer
    \`init.mjs consume\` to delete it.${
    notIgnored
      ? `
  - SECURITY: ${relDoc} is NOT gitignored and an init doc can hold a token — add it to .gitignore now.`
      : ''
  }
`
}

const out = []
const say = (s) => out.push(s)

// Emit any accumulated reminders and exit. Used at every point where the
// tlm-config check would otherwise stay silent, so tlm-spec-driven repos and repos
// with a broken baseline still get the reminder even without a tlm block.
function finish() {
  if (BASELINE_MSG) say(BASELINE_MSG)
  if (INIT_MSG) say(INIT_MSG)
  if (parseErrors.length) say(`[tlm-project-setup] Config file could not be read:\n${parseErrors.join('\n')}\n`)
  if (OPENSPEC_MSG) say(OPENSPEC_MSG)
  if (out.length) process.stdout.write(out.join('\n') + '\n')
  process.exit(0)
}

// Nothing configured at all -> only the baseline / OpenSpec reminders (if any).
if (!exists(CFG) && !exists(ALT)) finish()

const cfgJson = readJson(CFG)
const altJson = readJson(ALT)

// Locate the tlm block: settings.local.json first, then the fallback file.
const tlm = cfgJson?.tlm ?? (altJson && Object.keys(altJson).length ? altJson : null)

// settings.local.json exists but carries no tlm block. That is a normal, complete
// state for a project that only uses the coding skills -> nothing tlm to report.
if (!tlm) finish()

const missing = []
const add = (s) => missing.push(`  - ${s}`)

// --- schema version drift ---------------------------------------------------
// The plugin ships its own copy of the reference schema; a project's tlm.version
// lags behind it whenever the plugin has updated (e.g. auto-update) and added or
// changed a key since the project was last configured. This is a distinct concern
// from `missing` below: a project can be schema-current yet still have blank
// fields, or schema-behind yet have every currently-known field filled in.
const pluginRoot =
  process.env.CLAUDE_PLUGIN_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
let DRIFT = ''
try {
  const ref = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'setup', 'tlm-config.reference.json'), 'utf8'))
  // Coerce before comparing: the shell version used a numeric test, so a
  // hand-written "version": "1" counted just as much as 1.
  const pluginVer = Number(ref?.configVersion)
  const projVer = Number(tlm?.version)
  if (Number.isFinite(pluginVer) && Number.isFinite(projVer) && projVer < pluginVer) {
    const changes = (ref.changelog || [])
      .filter((c) => c.version > projVer)
      .map((c) => `  - v${c.version}: ${c.summary}${c.migration ? ` (${c.migration})` : ''}`)
      .join('\n')
    DRIFT = `[tlm-project-setup] tlm config schema is behind the plugin's: project is v${projVer}, plugin ships v${pluginVer}.
What changed since v${projVer}:
${changes}

Run /tlm-project-setup to sync — it only adds fields introduced by those versions (asking for any that need
your input, auto-filling any with a documented default) and never touches or overwrites a value you
already set.`
  }
} catch {
  // No reference schema reachable (unusual install layout) — skip the drift check.
}

// --- project ---------------------------------------------------------------
if (!q(tlm?.project?.type)) add('tlm.project.type is unset — tlm-fe-coding will re-detect the stack every session')
if (!q(tlm?.project?.baseBranch)) add('tlm.project.baseBranch is unset — tlm-ticket-workflow cannot cut branches')

// --- design / figma --------------------------------------------------------
if (tlm?.design?.enabled === true) {
  const tokenKey = q(tlm?.design?.tokenEnvKey) || 'FIGMA_ACCESS_TOKEN'
  const tokenVal = q(cfgJson?.env?.[tokenKey])
  if (!tokenVal || tokenVal.includes('REPLACE_ME')) {
    add(`${tokenKey} is missing or still a placeholder — tlm-figma-to-code will stop rather than guess a design`)
  }
}

// --- tickets ---------------------------------------------------------------
if (tlm?.tickets?.enabled === true) {
  if (!q(tlm?.tickets?.system)) add('tlm.tickets.system is unset')
  if (!q(tlm?.tickets?.idPattern)) add('tlm.tickets.idPattern is unset — ticket ids cannot be found in commits')
  if (!q(tlm?.tickets?.statuses?.inProgress)) add('tlm.tickets.statuses.inProgress is unset')
  if (!q(tlm?.tickets?.statuses?.inReview)) add('tlm.tickets.statuses.inReview is unset')
  const urlTemplate = q(tlm?.tickets?.urlTemplate)
  if (!urlTemplate || urlTemplate.includes('REPLACE_ME')) {
    add('tlm.tickets.urlTemplate is missing or a placeholder — release notes cannot link tickets')
  }
}

// --- chat / slack ----------------------------------------------------------
if (tlm?.chat?.enabled === true) {
  const channels = tlm?.chat?.channels || []
  if (channels.length === 0) add('tlm.chat.channels is empty — tlm-mobile-release-notes has nowhere to post')
  if (channels.some((c) => q(c?.id).includes('REPLACE_ME'))) add('a chat channel id is still a placeholder')
}

// --- rules source ----------------------------------------------------------
// Since v2.5.0 the project's own copy at .claude/tlm-plugin/ is the LIVE source of
// rules (skills read it, hooks delegate to it); the installed plugin is only the
// delivery channel. A configured project without that copy is running on whatever
// version happens to be installed, which is exactly the drift vendoring prevents.
if (!isDir(path.join(proj, '.claude', 'tlm-plugin'))) {
  add(
    'no .claude/tlm-plugin/ — this project has no live rules copy, so rules cannot be changed or shipped from here. /tlm-project-setup installs it.'
  )
}

// --- ecosystem -------------------------------------------------------------
// Sibling repos Claude may READ while working here (contracts, shared types, the
// backend a screen calls). A registered repo whose path has gone missing is worse
// than an unregistered one: the map claims a source that cannot be opened.
if (tlm?.ecosystem?.enabled === true) {
  const repos = Array.isArray(tlm?.ecosystem?.repos) ? tlm.ecosystem.repos : []
  if (repos.length === 0) {
    add('tlm.ecosystem.enabled is true but no repos are listed — nothing to reference')
  }
  const home = os.homedir()
  const expand = (p) => (q(p).startsWith('~') ? path.join(home, q(p).slice(1)) : q(p))
  const missing = repos
    .filter((r) => {
      const abs = expand(r?.path)
      return !abs || !isDir(path.isAbsolute(abs) ? abs : path.join(proj, abs))
    })
    .map((r) => q(r?.name) || q(r?.path) || '(unnamed)')
  if (missing.length) {
    add(
      `ecosystem repo(s) not on disk: ${missing.join(', ')} — run /tlm-project-setup (it re-clones from gitUrl), or drop them from tlm.ecosystem.repos`
    )
  }
  const indexFile = q(tlm?.ecosystem?.indexFile) || '.claude/ecosystem-map.md'
  if (repos.length && !exists(path.join(proj, indexFile))) {
    add(`${indexFile} is missing — the cross-repo map has never been built; /tlm-project-setup writes it`)
  }
}

// --- gitignore safety ------------------------------------------------------
// Spawn the resolved absolute path: with shell:false, Node on Windows is not
// dependable at resolving a bare command name off PATH.
if (exists(CFG) && gitBin) {
  const inRepo = spawnSync(gitBin, ['-C', proj, 'rev-parse', '--git-dir'], { shell: false, stdio: 'ignore' })
  if (inRepo.status === 0) {
    const ignored = spawnSync(gitBin, ['-C', proj, 'check-ignore', '-q', '.claude/settings.local.json'], {
      shell: false,
      stdio: 'ignore',
    })
    if (ignored.status !== 0) {
      add('SECURITY: .claude/settings.local.json is NOT gitignored but holds secrets — add it to .gitignore')
    }
  }
}

// Everything present and schema current -> only the baseline / init-doc / OpenSpec reminders (if any).
if (missing.length === 0 && !DRIFT) finish()

// Config is incomplete or schema-behind: lead with baseline + OpenSpec reminders (if present), then
// the schema drift notice, then the gaps.
// Each block carries its own trailing newline so join('\n') below leaves a blank
// line between them.
if (BASELINE_MSG) say(BASELINE_MSG + '\n')
if (INIT_MSG) say(INIT_MSG + '\n')
if (parseErrors.length) say(`[tlm-project-setup] Config file could not be read:\n${parseErrors.join('\n')}\n`)
if (OPENSPEC_MSG) say(OPENSPEC_MSG + '\n')
if (DRIFT) say(DRIFT + '\n')
if (missing.length) {
  say(`[tlm-project-setup] This project's workflow-skill config is incomplete:\n\n${missing.join('\n')}\n`)
}
say(`ACTION FOR CLAUDE (do this once, at the start of the session):
1. Mention the incomplete/outdated config briefly — do NOT dump either list verbatim, and do NOT
   block the user's actual request to fix it.
2. Offer /tlm-project-setup to complete or sync it. If they decline, continue normally and do not
   re-offer this session.
3. If a SECURITY line appears above, raise that one immediately and specifically — a tracked
   settings.local.json means credentials are about to be committed.
4. A capability that is ENABLED but incomplete is ALL-OR-NOTHING: when its workflow skill runs,
   REQUIRE the companion — finish /tlm-project-setup, or set the capability's enabled:false — rather
   than running a degraded / local-only version. Still-missing single VALUES (a channel id, a
   status name) within a connected capability are asked inline. Figma remains a HARD STOP:
   never write UI code from a guessed design.`)

process.stdout.write(out.join('\n') + '\n')
