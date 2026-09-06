# Monorepo layout — Turborepo starter for multi-app products

## The rule

**A product that is (or will become) more than one app — an internal ops app plus a customer portal, a
web app plus a mobile twin, anything sharing a wire contract — starts as a Turborepo monorepo, not as
sibling repos.** One repo, npm workspaces, `turbo` for the task pipeline:

```
<product>/
├── package.json           # "workspaces": ["apps/*", "packages/*"], "packageManager" pinned
├── turbo.json             # build/lint/typecheck/test pipeline (dependsOn: ["^build"])
├── apps/
│   ├── web/               # a Next.js app — own next.config, tsconfig, eslint config
│   └── portal/            # another app; apps NEVER import each other
└── packages/
    ├── contracts/         # Zod schemas + z.infer types + `satisfies`-pinned fixtures (see 14)
    ├── ui/                # (when 2+ apps share Base* primitives — not before)
    └── config/            # (when 2+ apps share tsconfig/eslint presets — not before)
```

Each workspace keeps its own `typecheck` script; root `turbo run typecheck` fans out. Inside each app,
everything in this rule set still applies unchanged (`_modules/`, thin routing, Base* hierarchy).

## Why

The alternative was audited twice and failed both times in the same way:

- **Sibling repos**: the contract the portal needs lives in the ops repo, so it gets guessed, and a
  guessed contract looks right and fails at runtime. The whole `ecosystem-map` machinery exists to
  mitigate this — a monorepo removes the problem instead: the contract is a workspace dependency,
  `import { zOrder } from '@product/contracts'`, and drift fails `tsc`.
- **One app that grows a second one inside it**: the second app's routes/components tangle into the
  first, and separating them later is a rewrite.

The reference implementation is Telemax-Ops: root ops app + `portal/` workspace + `packages/contracts`
(`@telemax/contracts`, exported as `.` and `./fixtures`), the portal consuming fixtures typed by the
same schemas the future API will be parsed with — so the fixture→API swap is a service-file change,
not a portal rewrite. It uses plain npm workspaces; **the house starter adds Turborepo on the same
layout** for task orchestration and caching — the workspace shape is identical, `turbo.json` is the
only addition.

## Starter contents (what `tlm-project-setup` scaffolds on an empty repo)

1. **Root `package.json`** — `"private": true`, `"workspaces": ["apps/*", "packages/*"]`,
   `"packageManager"` pinned, scripts delegating to turbo:
   ```json
   {
     "scripts": {
       "dev": "turbo run dev",
       "build": "turbo run build",
       "lint": "turbo run lint",
       "typecheck": "turbo run typecheck",
       "test": "turbo run test"
     },
     "devDependencies": { "turbo": "^2" }
   }
   ```
2. **`turbo.json`**:
   ```json
   {
     "$schema": "https://turborepo.com/schema.json",
     "tasks": {
       "build":     { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
       "typecheck": { "dependsOn": ["^build"] },
       "lint":      {},
       "test":      { "dependsOn": ["^build"] },
       "dev":       { "cache": false, "persistent": true }
     }
   }
   ```
3. **`packages/contracts`** — even with one app. It costs one folder now and prevents the
   guessed-contract failure the day app #2 arrives. `name: "@<product>/contracts"`, `exports`:
   `{ ".": "./src/index.ts", "./fixtures": "./src/fixtures/index.ts" }`, a `typecheck` script, Zod as
   its only dependency. Schemas follow `15-zod-contract-first.md`.
4. **`apps/web`** — the first Next.js app, laid out per the stack's rules (`_modules/`, thin routing),
   with `@<product>/contracts` as a workspace dependency (`"@<product>/contracts": "*"`).
5. **Root hygiene** — one `.gitignore`, one lockfile at the root (never per-workspace), CI running
   `turbo run lint typecheck test build`.

## Hard rules inside the monorepo

- **Apps never import from other apps.** Shared code moves *down* into a package; a cross-app import
  is the tangle this layout exists to prevent.
- **No deep imports across packages** — only the package's `exports` map
  (`@product/contracts/src/orders` ❌, `@product/contracts` ✅). Deep imports bypass the public
  contract and make refactors breaking.
- **Extract a package only at 2+ consumers** (contracts is the standing exception — it starts
  extracted). A `packages/ui` with one consumer is indirection, not reuse.
- **The contracts package has no app dependencies** — Zod only. Never let Prisma types, `next`, or
  React leak into it; it must stay importable from any runtime, including React Native.
- **Version drift**: shared deps (react, next, zod, typescript) are aligned across workspaces —
  `npm ls <dep>` shows one version. Pin overrides at the root, not per app.

## When NOT to use this

- A genuinely single app with no second consumer on any horizon — a plain repo is simpler; adopt the
  layout when the second app is real, not speculative. (Moving *into* `apps/` later is mechanical if
  `_modules/` discipline held.)
- Apps owned by different teams with different release cadences and no shared contract — those are
  separate repos, registered with each other via `tlm.ecosystem` (`ecosystem.mjs add`) instead.

## Relation to the ecosystem registry

The monorepo replaces the ecosystem map only for repos *inside* it. External systems — a C# backend, a
device-facing service — remain separate repos, registered per `tlm.ecosystem`, and their contracts are
still read from the real files (tlm-fe-coding STEP 1.5), then mirrored into `packages/contracts` as Zod
schemas per `15-zod-contract-first.md`.
