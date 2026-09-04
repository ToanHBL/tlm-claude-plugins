#!/usr/bin/env node
// launch.mjs — cross-platform launcher for this plugin's npx-based MCP servers.
//
// Why this exists. `.claude-plugin/plugin.json` is static JSON: it cannot branch
// on the OS. But a bare `"command": "npx"` does not work on Windows — there `npx`
// is `npx.cmd`, a batch shim, and a plugin-shipped stdio MCP server spawned that
// way fails with `spawn npx ENOENT` (anthropics/claude-code#58510). The usual
// Windows fix, `cmd /c npx`, is not portable in the other direction: there is no
// `cmd` on macOS or Linux.
//
// So the manifest points at `node` — a real executable on every platform — and
// this shim does the OS-specific part:
//
//   1. Resolve npm's own npx-cli.js next to the running Node and execute it with
//      `process.execPath`. This bypasses the .cmd shim entirely, which is what
//      keeps the MCP stdio pipes correctly connected on Windows.
//   2. Fall back to `npx` / `npx.cmd` off PATH if that layout is not found.
//   3. Expand ${VAR} / ${VAR:-default} in its own arguments from process.env, so
//      the manifest can carry `--figma-api-key=${FIGMA_ACCESS_TOKEN:-}` and get
//      the same result everywhere instead of relying on shell expansion that
//      never happens in exec form.
//
// Usage (from plugin.json): node .../mcp/launch.mjs <npx args...>

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

// ${VAR} and ${VAR:-default}. Anything unset becomes the default, or empty.
function expand(arg) {
  return arg.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g, (_, name, fallback) => {
    const v = process.env[name]
    return v === undefined || v === '' ? fallback ?? '' : v
  })
}

function findOnPath(cmd) {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.CMD;.EXE;.BAT').split(';') : ['']
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

const args = process.argv.slice(2).map(expand)
if (args.length === 0) {
  process.stderr.write('launch.mjs: no arguments — expected the npx invocation to forward\n')
  process.exit(2)
}

const nodeDir = path.dirname(process.execPath)
const candidates = [
  // Windows official installer / nvm-windows layout
  path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  // unix prefix layout (homebrew, nvm, fnm, volta, distro packages)
  path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
]

let cmd
let cmdArgs
const npxCli = candidates.find((p) => {
  try {
    return fs.statSync(p).isFile()
  } catch {
    return false
  }
})

if (npxCli) {
  cmd = process.execPath
  cmdArgs = [npxCli, ...args]
} else {
  const onPath = findOnPath('npx')
  if (!onPath) {
    process.stderr.write(
      'launch.mjs: could not locate npx (neither next to Node nor on PATH). Install Node.js with npm, or configure this MCP server manually.\n'
    )
    process.exit(127)
  }
  cmd = onPath
  cmdArgs = args
}

// stdio:'inherit' hands our own descriptors to the child, so the MCP stdio
// transport talks to the server directly with no extra pipe in between.
const child = spawn(cmd, cmdArgs, { stdio: 'inherit', env: process.env, shell: false })

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    try {
      child.kill(sig)
    } catch {
      /* already gone */
    }
  })
}

child.on('error', (err) => {
  process.stderr.write(`launch.mjs: failed to start ${cmd}: ${err.message}\n`)
  process.exit(127)
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
