#!/usr/bin/env node
// Brings vendor/z-harness up to its master, and reports honestly when it cannot.
//
// z-harness is a submodule, and a submodule is the one thing a plain `git clone` leaves behind.
// `/plugin marketplace update` clones and pulls; nothing in that path passes --recurse-submodules,
// so on a fresh install vendor/z-harness is an empty directory and every hook it ships is absent —
// silently, which is the failure mode this whole plugin exists to argue against. Hence a script that
// is run on purpose rather than a step someone is told to remember.
//
// Node rather than a shell one-liner for the reason the hooks are Node: `git submodule update` in a
// .sh file does not run on Windows, and half this team is on Windows.
//
//   node scripts/sync-z-harness.mjs          # init if absent, then fast-forward to master
//   node scripts/sync-z-harness.mjs --check  # report only, touch nothing, exit 1 if out of date

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUB = 'vendor/z-harness'
const CHECK = process.argv.includes('--check')

const git = (args, cwd = ROOT) =>
  spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const say = (s) => process.stdout.write(`${s}\n`)
const die = (s) => {
  process.stderr.write(`${s}\n`)
  process.exit(1)
}

if (git(['rev-parse', '--git-dir']).status !== 0) {
  die(`not a git repository: ${ROOT}\n` +
      'This script updates a submodule, so it only works in a clone — not in an installed plugin\n' +
      'directory that was delivered as an archive.')
}

const subPath = path.join(ROOT, SUB)
// A submodule that has never been initialised is an existing but empty directory, not a missing one.
const present = fs.existsSync(path.join(subPath, '.git'))

if (CHECK) {
  if (!present) die(`${SUB} is not checked out. Run: node scripts/sync-z-harness.mjs`)
  const local = git(['rev-parse', 'HEAD'], subPath).stdout?.trim()
  if (git(['fetch', '--quiet', 'origin', 'master'], subPath).status !== 0) {
    say(`${SUB} is at ${local?.slice(0, 8)}; could not reach origin to compare.`)
    process.exit(0)
  }
  const remote = git(['rev-parse', 'origin/master'], subPath).stdout?.trim()
  if (local === remote) {
    say(`${SUB} is up to date with master (${local.slice(0, 8)}).`)
    process.exit(0)
  }
  const behind = git(['rev-list', '--count', `${local}..${remote}`], subPath).stdout?.trim()
  die(`${SUB} is ${behind} commit(s) behind master. Run: node scripts/sync-z-harness.mjs`)
}

// --remote is the whole point: without it the submodule moves to the commit this repo has pinned,
// which is the opposite of "pull z-harness master too".
if (!present) {
  say(`checking out ${SUB} …`)
  const init = git(['submodule', 'update', '--init', '--recursive', SUB])
  if (init.status !== 0) die(init.stderr || `could not initialise ${SUB}`)
}

const before = git(['rev-parse', 'HEAD'], subPath).stdout?.trim()
const res = git(['submodule', 'update', '--remote', '--recursive', SUB])
if (res.status !== 0) die(res.stderr || `could not update ${SUB}`)
const after = git(['rev-parse', 'HEAD'], subPath).stdout?.trim()

if (before === after) {
  say(`${SUB} already at master (${after.slice(0, 8)}).`)
} else {
  say(`${SUB}: ${before.slice(0, 8)} → ${after.slice(0, 8)}`)
  say('')
  say('The pointer this repo records has moved. Commit it, or the next clone gets the old one:')
  say(`  git add ${SUB} && git commit -m "Track z-harness master"`)
}
