# Frontend Skills & Rules

Universal Claude Code **skills** for coding Next.js (App Router + Page Router) and React Native
(Expo Router) in a consistent house style — plus the finalized knowledge base they draw from.

Install once → Claude codes all three frameworks following the same architecture, navigation, and
validation conventions.

```
rules/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest (nextjs-react-native-skills)
│   └── marketplace.json     # Self-hosted marketplace (tony-frontend)
├── skills/                  # The installable skills
│   ├── frontend-conventions/    # Shared base — applies to ALL frontend code
│   ├── nextjs-app-router/       # App Router (app/, RSC, Server Actions)
│   ├── nextjs-page-router/      # Page Router (pages/, TanStack Query, static export)
│   └── react-native-expo/       # Expo Router (navigate-not-push, useLocalSearchParams)
├── ai/                      # Finalized knowledge base (deep reference for the skills)
│   ├── shared/ 01–08        # + 07-ai-workflow, 08-cross-platform-architecture
│   ├── templates/           # Requirement-intake templates
│   ├── nextjs/{app,page}-router/
│   └── reactnative/         # RN/Expo: StyleSheet, Expo Router, AsyncStorage, RHF+Zod
├── tests/                   # One project per ruleset — same User-CRUD spec, generated per skill
│   ├── nextjs-app-router/   ├── nextjs-page-router/
│   ├── react-native-cli/    └── react-native-expo/
└── raw/resource/            # Original source material (archive — superseded by ai/)
```

Each `tests/*` folder is a real project a skill generated from one shared spec, with a
`PROJECT-NOTES.md` mapping every file back to the rule it follows. See `tests/README.md`.

## What the skills do

| Skill | Triggers when… | Enforces |
|-------|----------------|----------|
| **frontend-conventions** | any React/Next/RN component, screen, hook, API client, or form | `_modules/` architecture, component hierarchy, Link-only nav, function minimalism, `Col/Row/Text` + Tailwind/HeroUI, no `as any`, Zod + React-Hook-Form |
| **nextjs-app-router** | working in `app/`, `layout.tsx`/`page.tsx`/`route.ts`, `'use server'` | Server vs Client Components, Server Actions + `revalidatePath/Tag`, streaming, `next/navigation` |
| **nextjs-page-router** | working in `pages/`, `_app.tsx`, `useQuery` hooks | static-export SPA, TanStack Query data hooks, `next/router`, migration path |
| **react-native-expo** | Expo/RN project, `_layout.tsx`, `expo-router` imports | `router.navigate` not `push`, `useLocalSearchParams`, RN primitives via `Col/Row/Text` wrappers |

The three framework skills all build on `frontend-conventions`. Each SKILL.md is concise; deep detail
lives in `ai/` (bundled with the plugin) and is loaded on demand.

## Install (universal, one-time)

This repo is both a **plugin** and a **marketplace**. From Claude Code:

```bash
# 1. Add this repo as a marketplace (use the git URL once it's pushed, or a local path)
/plugin marketplace add <git-url-or-local-path-to-this-repo>

# 2. Install the plugin — available in ALL your projects afterward
/plugin install nextjs-react-native-skills@tony-frontend

# 3. Verify
/help          # the 4 skills appear; frontend-conventions triggers automatically
```

To update after changes: `/plugin marketplace update tony-frontend`.

### Alternative: personal skills (instant, no marketplace)

Symlink or copy the skills into your personal skills dir for immediate global use:

```bash
mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/"* ~/.claude/skills/     # or cp -R
```

Trade-off: instant for you, but not versioned/shareable like the plugin.

## Verifying it works

Ask Claude, in any project: *"Create a product list screen."* It should place logic in
`_modules/pages/Product/ProductListScreen.tsx`, use `Col/Row/Text`, navigate with `Link`, fetch via a
`useQuery` hook (Page Router) or a Server Component (App Router), and skip pre-optimized handlers.

---

## Rules review — findings & recommendations

Review of the existing global rules (`~/.claude/rules/` and `~/.claude-telemax/rules/`) and the `ai/`
knowledge base, with the changes this repo makes.

### ✅ What this repo already fixed
- **Closed the `resource/` → `ai/` gaps**: added `shared/07-ai-workflow-integration.md`, the two
  `templates/`, and Link-compliant Global Navigation sections. (`ai/` is now the single source of truth;
  `resource/` can be archived.)
- **Packaged the conventions as skills** so they trigger automatically instead of relying on the reader.
- **Extended React Native coverage** beyond navigation (RN primitive mapping, `_modules` in RN).

### ⚠️ Recommendations for the global rules
1. **Deduplicate `expo-router.md`.** It is byte-identical in `~/.claude/rules/` and
   `~/.claude-telemax/rules/`. Two copies will drift. Keep one canonical copy (or let the
   `react-native-expo` skill be the source and delete the rule copies).
2. **Reconcile the two `context7.md` variants.** `~/.claude/rules/context7.md` describes the **MCP**
   flow (`resolve-library-id`/`query-docs`); `~/.claude-telemax/rules/context7.md` describes the
   **`ctx7` CLI** flow. They give different instructions for the same task — pick the one that matches
   your installed tooling and remove/redirect the other so Claude isn't told to do both.
3. **Point the RN skill and the `expo-router` rule at each other** to avoid drift — the skill embeds
   the navigation rule; note in the rule that the skill is the fuller version (or vice-versa).
4. **`typescript.md` is solid.** Optional additions: ban unchecked non-null assertions (`!`) in the same
   spirit as `as any`, and require `unknown` over `any` in catch clauses.
5. **Version note in `ai/README.md`**: framework line says "Next.js 13-15" — Next.js 15 + React 19 are
   current; keep this refreshed as versions move.
6. **Consider a `validation` and a `data-fetching` rule** at the global level, mirroring the skill
   content, for projects where the plugin isn't installed.

### Nice-to-haves (future)
- A `skill-creator`-style eval to catch skill-description over/under-triggering as models evolve.
- Bundle a couple of runnable example files under each skill (`examples/`) for copy-paste scaffolding.
# rules
