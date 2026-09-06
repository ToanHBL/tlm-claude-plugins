#!/usr/bin/env node
// PostToolUse hook — fires when Claude edits the VENDORED copy of the plugin
// (tlm.pluginRepo.vendorDir, default .claude/tlm-plugin/) inside a consuming
// project, and reminds Claude to review the change and ship it to the team.
//
// Since v2.5.0 the vendored copy is the LIVE SOURCE of rules for that project: the
// skills read it and the hooks delegate to it, so the edit is already in effect
// locally. What it is NOT yet is shared — until it is committed and PR'd upstream,
// the rest of the team keeps hitting the problem it fixes. That is what this hook
// makes sure isn't forgotten.
//
// Advisory and silent unless the edited path is under a .claude/tlm-plugin/ dir.
// Emits hookSpecificOutput.additionalContext (same channel as lint-fe.mjs).

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

// Only react to edits inside a vendored-plugin directory. Match the default
// location and any custom vendorDir that still ends in the conventional segment.
// Normalize first — on Windows the payload path arrives with backslashes.
const MARKER = '/.claude/tlm-plugin/'
const posix = toPosix(file)
const at = posix.lastIndexOf(MARKER)
if (at === -1) process.exit(0)

const rel = posix.slice(at + MARKER.length)

emitContext(
  'PostToolUse',
  `[rules] You edited this project's LIVE rules copy: .claude/tlm-plugin/${rel}

It is already in effect here — skills read this copy and the hooks delegate to it. It is NOT yet
shared: teammates and other repos only get it once it is merged upstream and they run
/plugin marketplace update.

ACTION FOR CLAUDE:
1. Follow the tlm-rule-capture skill's PLUGIN scope (STEP 4): confirm this is a real house-rule change,
   not a stray edit.
2. Show the user the change and offer to ship it. When they agree, run — announcing each first:
     node "\${TLM_RULES_ROOT:-\${CLAUDE_PLUGIN_ROOT}}/skills/tlm-rule-capture/plugin-pr.mjs" diff
     node "\${TLM_RULES_ROOT:-\${CLAUDE_PLUGIN_ROOT}}/skills/tlm-rule-capture/plugin-pr.mjs" open <slug>
   'diff' is the review step (no writes, no push); 'open' clones the upstream, mirrors this copy onto a
   branch, bumps the version in lockstep, pushes, and opens the PR with gh (compare URL if gh is absent).
   Export TLM_* from tlm.pluginRepo first — see the script header.
3. Also remind the user to COMMIT the vendored change in this repo: it is the live rules source here, so
   an uncommitted edit means the rest of the repo's contributors do not have it.
4. Do NOT hand-edit \${CLAUDE_PLUGIN_ROOT} — a marketplace update overwrites it and nobody sees it.
If the user does not want to ship it, leave the copy as-is and move on; do not re-nag this session.`
)
