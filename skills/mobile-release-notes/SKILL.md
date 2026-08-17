---
name: mobile-release-notes
description: Build a release note for a MOBILE app build (React Native, Expo, or Flutter) from a range of git commits — reads the diffs for root cause, pulls the linked tickets for the user-reported symptoms, writes numbered plain-language items for testers and end users, collects the iOS/Android build numbers and install link, then posts it as a DRAFT to the release chat channel. Mobile only. TRIGGER when the user gives a commit hash or range and asks for release notes for a build, or says "release notes", "changelog", "what's new", "build notes", "summarize changes for testers", "tổng hợp changes", "tóm tắt thay đổi cho build", "note bản build".
---

Turn commits into something a tester or end user can read, then hand it to a human to send:

**Pre-flight → Inspect diffs → Pull tickets → Find root cause → Write → Build info → Assemble → Draft to chat**

**Mobile only** — React Native (CLI), React Native + Expo, or Flutter. The note is built around what a
mobile build distribution needs: a TestFlight number, an Android build number, an install link, and a
list of changes phrased for someone tapping through the app on a phone.

The audience is **non-technical** — testers, support, customers. No file names, no function names, no
library names, no jargon.

**Input** `$ARGUMENTS`: a starting commit hash, a range `A..B`, or nothing.
- Single hash → `<hash>..HEAD`
- Range → as given
- Nothing → last release tag, else `HEAD~5..HEAD`. Say which range you used.

---

## PHASE 0 — PRE-FLIGHT

**1. Confirm this is a mobile project.** Read `tlm.project.type` from `.claude/settings.local.json`
(fall back to `.claude/tlm.local.json`), or detect:

```bash
grep -o '"\(expo\|react-native\)"' package.json 2>/dev/null | sort -u   # RN / Expo
ls pubspec.yaml 2>/dev/null && echo "flutter"                            # Flutter
```

| Signal | Platform |
|--------|----------|
| `package.json` has `expo` | React Native + Expo |
| `package.json` has `react-native`, no `expo` | React Native CLI |
| `pubspec.yaml` present | Flutter |

**If it's a web project** (Next.js and nothing mobile), say so and stop — this skill's whole shape
(TestFlight numbers, Android build numbers, install links) doesn't fit a web deploy. Offer
`/deployment-checklist` instead, which is what web releases actually need. A **monorepo** containing
both is fine: scope to the mobile app's path and carry on.

**2. Config.** Uses `tickets.system` + `tickets.idPattern` + `tickets.urlTemplate` (to link each item),
`chat.enabled` + `chat.channels` + `chat.sendMode` (where to post), `project.apps` (which app a commit
range belongs to). Key meanings: `${CLAUDE_PLUGIN_ROOT}/setup/tlm-config.reference.json`.

**Degrade, don't stop.** The note itself only needs git:
- No tracker → build it from diffs alone; say the ticket context is missing.
- No Slack, or `chat.enabled` false → produce the note and **print it for manual posting**.
- Missing channel id → ask for it inline here, then offer to persist it.

---

## PHASE 1 — INSPECT THE CHANGES

```bash
git log --oneline <range>
git diff --stat <range>
git diff <range> -- <the files that matter>
```

Read the real diffs of screen, component, and native-config files. You need to explain **why** each
change was made, and that isn't in the commit subject.

Watch specifically for the mobile-only things a tester will notice: safe-area and notch handling, status
bar, keyboard avoidance, permissions prompts, splash screen and icons, deep links, push notifications,
offline/storage behavior, and anything under `ios/`, `android/`, `app.json`, `app.config.*`,
`Info.plist`, `AndroidManifest.xml`, or `pubspec.yaml`.

---

## PHASE 2 — PULL THE LINKED TICKETS

Scan commit messages in `<range>` for ids matching `tickets.idPattern`. For each unique id:

- Fetch it to learn **what the user actually reported** and the acceptance criteria.
- Build its link from `tickets.urlTemplate` (`{id}` → the id).

The ticket gives you the user's language and the reported symptom; the diff gives you the mechanism.
You need both. A commit with no ticket id still belongs in the note — just without a link.

---

## PHASE 3 — FIND THE ROOT CAUSE

For each meaningful change, work out from diff + ticket:

- **Symptom** the tester saw — button cut off at the bottom, icon invisible in dark mode, app closing on
  launch, wrong data on a screen
- **Actual cause** — a hardcoded height, a wrong default, the build pointing at the test server
- **What fixed it**

Group related commits, files and tickets into a single user-facing item. Drop pure noise — formatting,
lockfiles, quote-style churn — unless it changed behavior.

---

## PHASE 4 — WRITE THE ITEMS

This is the part that's easy to get wrong. Rules:

- **English always.** The note is written in English regardless of the chat language.
- **Prefer the ticket's own copy verbatim.** If a ticket already carries "What's New"-style user-facing
  text matching the change, **copy it as-is**. Don't paraphrase it into something worse. Write your own
  plain-language summary only when the ticket has no user-facing copy, or when the code actually does
  something different from what the ticket describes.
- **Numbered items** (`1.`, `2.`, …), each a short **bold heading** (the outcome) + 1–2 plain sentences.
- **Translate every technical concept into phone language.** No `safe-area inset`, `edge-to-edge`,
  `ripple`, `versionCode`, `AsyncStorage`, `FlatList`. Say "the phone's gesture bar", "newer Android
  devices", "the startup screen", "the list scrolls smoothly now".
- Append the ticket link on its own line: `👉 <url>`
- Prioritize what someone tapping through the build would actually notice.

---

## PHASE 5 — ASK FOR THE BUILD INFO

Never invent these. Ask the user:

1. **iOS TestFlight build number** — the `#` after the version
2. **Android build number** — Firebase App Distribution / Play internal track
3. **Install link** — the URL testers open to install the Android build
4. **Pending / additional requirements** — free text. If they say none, **omit the whole Pending
   section**; don't print "Pending: None".

Confirm the version string if it isn't `1.0.0`. If only one platform was built this round, ask which,
and omit the other line rather than printing a blank.

---

## PHASE 6 — ASSEMBLE

Determine which app the range belongs to by matching changed paths against `project.apps[].pathPrefix`.
Mixed or unclear → ask.

```
# <Project> <App> new version notes

IOS Testflight: <version> #<ios_build>
Android Firebase: <version> #<android_build>
Firebase link: <install_link>

Changes:
<numbered items, English, one ticket link per item>
```

Only when there are pending items, append:

```
Pending
Additional requirements:
<pending items>
```

---

## PHASE 7 — POST AS A DRAFT

Pick the channel from `chat.channels` by matching `app`. Post with the **draft** action —
`chat.sendMode` is `draft` by default and should stay there.

**Always draft, never send directly.** Mobile release channels are frequently Slack Connect /
externally shared with the client, where a direct send is blocked outright — and more importantly a
human should read the note before testers and customers do. Only send directly if `sendMode` is `send`
**and** the user confirms on this run.

Return the channel link so the user can open, review, and send.

---

## PHASE 8 — NATIVE REBUILD REMINDER

If native config changed in this range, remind the user of the rebuild step — a JS-only OTA update
won't carry these:

| Changed | Reminder |
|---------|----------|
| `app.json` / `app.config.*`, icons, splash, plugins, permissions (Expo) | `npx expo prebuild` before the next EAS build (bare workflow) |
| `ios/`, `Info.plist`, Podfile | `pod install`, then a full native rebuild |
| `android/`, `AndroidManifest.xml`, Gradle files | full native rebuild |
| `pubspec.yaml` native deps (Flutter) | `flutter pub get`, then rebuild both platforms |
| A native module added or removed | full rebuild both platforms — OTA cannot ship it |

Only mention the rows that actually changed in the range.

---

## RULES

- **Mobile only.** Web-only project → stop and point at `/deployment-checklist`.
- The note is **English** and **numbered**, always.
- When a ticket already has release-note copy, **copy it verbatim** — don't rewrite it.
- Never send directly to a release channel without explicit per-run confirmation.
- No code, no file paths, no library names in the note.
- Never invent build numbers, install links, or ticket ids.
