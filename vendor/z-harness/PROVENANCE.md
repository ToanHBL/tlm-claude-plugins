# vendor/z-harness — a copy, not a submodule

Everything beside this file is a verbatim copy of another repository. It is **not** maintained here:
edit it upstream, then re-copy. A fix made only in this directory is a fix that disappears the next
time anyone syncs, and nobody will be watching for it.

| | |
|---|---|
| Upstream | `git@github.com-hbl:ndk98z/z-harness.git` |
| Copied from | `feat/plan-gate-exemptions` @ `9dbec79` |
| Copied on | 2026-09-06 |
| Upstream `master` at that time | `65a43e1` |

## Read the branch line before syncing

This copy is **ahead of upstream `master`**, deliberately. `master` gates every path under
`.claude/`, and this plugin's rules copy lives at `.claude/tlm-plugin/` — a directory whose entire
design is that you edit it mid-conversation and the change is live on the next turn. Under `master`
that is a plan file per typo. `feat/plan-gate-exemptions` adds the `planExempt` key that excuses it.

So: **merge that branch into `master` before the first sync**, or the sync silently reverts the
exemption and the plan gate starts firing on every rule edit. Once it is merged, `master` is the only
thing to track and this note can go.

## Syncing, until something automated exists

```bash
git -C <a clone of z-harness> archive master | tar -x -C vendor/z-harness
```

Then update the table above.

## The tests do not run from here, and that is not a defect

`tests/test-hooks.sh` is copied too, but running it **in place reports failures that are artifacts of
the location**. It assumes it sits at the root of its own git repository, and two of its assumptions
break in a vendored subdirectory:

- `REPO` is resolved as `tests/..`, so the write detector is asked about paths under
  `vendor/z-harness/` rather than under a repository root of its own.
- z-harness exempts `/tmp` and `/var/folders` from every check, by design. A checkout that happens to
  live under either — a scratch clone, a CI temp dir — has its own fixtures exempted, and cases that
  should flag come back allow.

Verified rather than assumed: this exact copy scores **180 passed, 0 failed** when unpacked at the
root of a git repository outside `/tmp`, and reports 1–2 failures otherwise. So to check a sync, unpack
it somewhere real and run it there:

```bash
cp -R vendor/z-harness/. ~/z-harness-check && cd ~/z-harness-check && git init -q .
bash tests/test-hooks.sh    # expect: hooks: 180 passed
```

Requires `bash` and `jq`, which is also why these hooks are **not** wired into this plugin's own
`hooks.json` — they would not run on Windows, and this plugin's hooks are Node precisely so they do.
z-harness stays a separate plugin, installed on its own where it is wanted. See the README's
*Guardrails* section.
