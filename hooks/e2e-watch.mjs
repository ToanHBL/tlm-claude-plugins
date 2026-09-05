#!/usr/bin/env node
// PostToolUse hook — fires when Claude edits a ROUTE or SCREEN in a project that
// already has an e2e suite, and reminds it to bring that suite up to date in the
// same change.
//
// Why only routes and screens: an e2e test asserts what a user can reach and
// what the network does behind it. A util or a type changing does not move that
// surface, so reminding on every edit would be noise and the reminder would stop
// being read. A page, a layout, a route handler or a *Screen is exactly the set
// an e2e spec is written against.
//
// Silent unless BOTH are true: the project has an e2e suite, and the edited file
// is on that surface. Advisory only — it emits context, it never blocks.

import fs from 'node:fs'
import path from 'node:path'
import { readStdinPayload, delegateToVendored, emitContext, toPosix } from './lib/hook-io.mjs'

const { raw, json: input } = readStdinPayload()
const file = input?.tool_input?.file_path
if (!file) process.exit(0)

delegateToVendored({
  selfUrl: import.meta.url,
  startDirs: [path.dirname(file), input?.cwd, process.env.CLAUDE_PROJECT_DIR],
  raw,
})

const posix = toPosix(file)

// Editing the suite itself is the thing this hook asks for — do not nag about it.
if (/(^|\/)(e2e|tests?\/e2e)\//.test(posix) || /\.(spec|e2e)\.[tj]sx?$/.test(posix)) process.exit(0)

/** Walk up for a project root that actually holds an e2e suite. */
function findE2eRoot(start) {
  let dir = start
  for (let i = 0; i < 12 && dir && dir !== path.dirname(dir); i += 1) {
    const hasConfig = ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs']
      .some((name) => fs.existsSync(path.join(dir, name)))
    const hasSuite = fs.existsSync(path.join(dir, 'e2e')) || fs.existsSync(path.join(dir, 'tests', 'e2e'))
    if (hasConfig || hasSuite) return dir
    dir = path.dirname(dir)
  }
  return null
}

const root = findE2eRoot(path.dirname(file))
if (!root) process.exit(0) // no suite yet — STEP 1.7 decides whether to start one

// The user-reachable surface an e2e spec is written against.
const isRouteOrScreen =
  /\/(page|layout|route|not-found|error|loading)\.[tj]sx?$/.test(posix) ||
  /Screen\.[tj]sx?$/.test(posix) ||
  /\/(app|pages)\/.*\/route\.[tj]s$/.test(posix)

if (!isRouteOrScreen) process.exit(0)

const rel = toPosix(path.relative(root, file))

emitContext(
  'PostToolUse',
  `[e2e] You changed a user-reachable surface: ${rel}

This project has an e2e suite, so that suite is now possibly out of date. Before you finish:

1. Does an existing spec cover this route or screen? If so, does it still describe the truth —
   the URL, the redirect, the statuses the page's requests return?
2. Did you add a route, a redirect, or a new failure mode (a 400/401/403/404 the page can now
   produce)? A refusal that is deliberate belongs in the permissions spec asserting its EXACT
   status; anything else belongs in the no-failing-request sweep.
3. Run the suite. A stale green suite is worse than none: it is the thing people trust.

Rule: ai/shared-fe/14-e2e-testing.md. Do not add a spec for a surface the user did not ask to
cover — say what you did not cover instead.`,
)
