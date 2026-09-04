// Shared helpers for the plugin's hooks.
//
// The hooks used to be bash + jq. They are Node now for one reason: a hook has to
// run identically on Windows, macOS and Linux. Shell-form hooks (`bash "…/x.sh"`)
// are a known breakage on Windows — Git Bash mangles backslash paths, .sh files
// fall through to the file-association handler, and `bash` is often not on PATH —
// while `node` is a real executable that exec-form spawns directly everywhere.
//
// Everything jq and coreutils were doing lives here instead, so the hooks need no
// companion tool beyond Node itself.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Read the hook payload from stdin. A hook must never break the turn it fires on,
// so an empty or malformed payload degrades to {} rather than throwing.
export function readStdinJson() {
  let raw = ''
  try {
    raw = fs.readFileSync(0, 'utf8')
  } catch {
    return {}
  }
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// The documented channel for feeding text back into Claude's context without
// surfacing an error to the user.
export function emitContext(hookEventName, additionalContext) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext } })
  )
}

// Normalize separators before any path comparison. Every path rule in these hooks
// is written in posix form (*/node_modules/*, */.claude/tlm-plugin/*), so a raw
// Windows path with backslashes would silently miss every one of them.
export function toPosix(p) {
  return String(p ?? '').replace(/\\/g, '/')
}

// `command -v`, cross-platform. Walks PATH by hand rather than spawning
// where/which: no shell involved, and no process spawn on a hot path.
export function which(cmd) {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  // On Windows try the bare name first — a file can be executable without one of
  // the PATHEXT suffixes — then each suffix.
  const exts =
    process.platform === 'win32'
      ? ['', ...(process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean)]
      : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, cmd + ext)
      try {
        if (fs.statSync(candidate).isFile()) return candidate
      } catch {
        // not here, keep looking
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// RULES ROOT + hook delegation
//
// Since v2.5.0 the rules a project runs on are the VENDORED copy in the repo
// (.claude/tlm-plugin/, committed) — not the read-only managed clone under
// ${CLAUDE_PLUGIN_ROOT}. The installed plugin is the delivery channel and the
// fallback; the vendored copy is the live source of truth.
//
// hooks.json can only ever point at ${CLAUDE_PLUGIN_ROOT}/hooks/<name>.mjs, so the
// installed hook has to hand off: if the project being edited carries a vendored
// copy of the same hook, re-exec that one with the identical payload and exit with
// its status. Without this, rule edits would take effect for the skills but not for
// the hooks that enforce them — the two would silently drift apart.

export const VENDOR_SEGMENT = '.claude/tlm-plugin'

// Read stdin ONCE, keeping the raw text: a delegating hook must forward the exact
// bytes it was given, and stdin cannot be read twice.
export function readStdinPayload() {
  let raw = ''
  try {
    raw = fs.readFileSync(0, 'utf8')
  } catch {
    return { raw: '', json: {} }
  }
  if (!raw.trim()) return { raw, json: {} }
  try {
    return { raw, json: JSON.parse(raw) }
  } catch {
    return { raw, json: {} }
  }
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
const real = (p) => {
  try {
    return fs.realpathSync(p)
  } catch {
    return path.resolve(p)
  }
}

// Nearest enclosing directory of `start` that holds .claude/tlm-plugin/. Walks up
// so a hook fired on a deeply nested file still finds the repo's vendored rules.
export function findVendorRoot(start) {
  let dir = path.resolve(String(start || '.'))
  for (;;) {
    if (isDir(path.join(dir, '.claude', 'tlm-plugin'))) return path.join(dir, '.claude', 'tlm-plugin')
    const up = path.dirname(dir)
    if (up === dir) return null
    dir = up
  }
}

// Where the rules actually live for this project: vendored copy first, installed
// plugin second. Skills state the same order in prose; this is its executable form.
export function resolveRulesRoot(startDirs = [process.cwd()]) {
  for (const d of startDirs.filter(Boolean)) {
    const v = findVendorRoot(d)
    if (v) return { root: v, source: 'vendored' }
  }
  const plugin = process.env.CLAUDE_PLUGIN_ROOT
  if (plugin && isDir(plugin)) return { root: plugin, source: 'plugin' }
  return { root: null, source: 'none' }
}

// Hand this hook's payload to the project's vendored copy of the same hook and
// exit with its status. No-op (returns) when there is nothing to delegate to, when
// the vendored file IS the running file, or when we are already the delegate —
// that last guard is what stops a vendored hook from re-invoking itself forever.
export function delegateToVendored({ selfUrl, startDirs, raw }) {
  if (process.env.TLM_HOOK_VENDORED === '1') return
  const selfPath = fileURLToPath(selfUrl)
  const name = path.basename(selfPath)
  for (const d of (startDirs || []).filter(Boolean)) {
    const vendorRoot = findVendorRoot(d)
    if (!vendorRoot) continue
    const candidate = path.join(vendorRoot, 'hooks', name)
    if (!isFile(candidate)) continue
    if (real(candidate) === real(selfPath)) return
    const res = spawnSync(process.execPath, [candidate], {
      input: raw ?? '',
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: false,
      env: { ...process.env, TLM_HOOK_VENDORED: '1' },
    })
    // A vendored copy that cannot run must not silently disable the check: fall
    // through and let the installed hook do the work instead.
    if (res.error || res.status === null) return
    process.exit(res.status)
  }
}
