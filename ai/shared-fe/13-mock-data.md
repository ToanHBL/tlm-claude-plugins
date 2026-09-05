# Mock Data — label what is not wired yet

Applies whenever a screen renders values that did not come from the real API. `skills/fe-coding`
STEP 1.5 and `07` §7b govern the mock's **shape**; this file governs its **visibility**. Both apply —
they are different failures.

---

## 1. Unlabelled mock data is the most expensive thing you can ship

A screen built against a mock looks finished. That is the whole problem:

- The reviewer reads a placeholder odometer as the vehicle's odometer and signs it off.
- QC files a bug against a value nobody has wired yet.
- Six weeks later the endpoint lands and nobody can enumerate what to replace.

**MUST: if a value on screen is not real, the screen says so, and the code can be grepped for it in one
command.** Both halves are required — a labelled screen with untraceable code is an archaeology dig,
and greppable code with an unlabelled screen ships fiction to a stakeholder.

---

## 2. Mock is scoped to what is not wired — not to the screen

The unit is the **field or section that has no endpoint**, never the whole page. A screen is normally
mixed: most of it comes from a real API, and one or two parts do not exist yet.

| The value… | Renders | Marker |
|---|---|---|
| has a real endpoint and is wired | live data | **none** — a marker on real data is as misleading as none on fake |
| has **no** endpoint yet | the mock | **`BaseMockBadge` beside it**, always, in every environment |
| has an endpoint that is failing right now | the error / unavailable state | none — that is `09-data-listing` §5, not a mock |

**The badge is not conditional on an env var.** A field with no endpoint is mock in development, in
staging and in production, until the endpoint exists. Hiding the badge in production would ship exactly
the fiction this rule exists to prevent.

**A whole-screen banner is for one case only:** nothing on the screen is wired yet — a design review
before any endpoint exists. The moment one field is real, drop the banner and mark the remaining mock
fields individually, because a banner over real data teaches the reviewer to distrust the page and stop
reporting anything.

Never a banner and badges together. Two warnings for one condition read as ambiguity, and the reader
resolves ambiguity by ignoring both.

---

## 3. What the marker looks like (MUST — one primitive, `BaseMockBadge`)

Two jobs, both required: **obvious in a screenshot**, and **impossible to mistake for a value**.

| Rule | Why |
|---|---|
| **Dashed** border | Nothing else in the system is dashed. It reads as "provisional" at a glance, including in a screenshot pasted into a ticket. |
| **Warning** tone, never a status colour | `success` / `danger` are data meanings. A mock marker must not look like a state the record is in. Needs `warning-*` tokens in `@theme` — adding them is a token change, not a per-component decision. |
| The literal word **`mock`**, lowercase | Not an emoji, not `⚠`, not `TEST`, not `DEMO`. Unambiguous, and it is the same token you grep for. |
| **Beside** the value, never replacing it | The reviewer still needs to see the placeholder's shape to tell you it is the wrong shape. |
| A `title` giving the reason | "Placeholder data — no API for this value yet". |
| Never a plausible value | No `—`, no `N/A`, no `0`, no `TBD`. Each of those is a legitimate real answer somewhere in this app. |

```tsx
// ✅ Mixed screen. The counts have no endpoint; everything around them is live.
<Row className='items-center gap-2'>
  <TextPrimary variant='bodyStrong'>{connectedTo.alertRulesMatching}</TextPrimary>
  {/* MOCK: no Telemax2 endpoint returns these counts yet. */}
  <BaseMockBadge />
</Row>
```

```tsx
// ❌ A plausible placeholder with no marker. Ships as fact.
<TextPrimary variant='bodyStrong'>{connectedTo.alertRulesMatching ?? 12}</TextPrimary>

// ❌ Marker replaces the value — the reviewer can't tell you the format is wrong
<TextPrimary variant='bodyStrong'>TBD</TextPrimary>
```

---

## 4. `MOCK` is the code token. One command finds every site.

`grep -rn MOCK src/` **must** return every mock in the codebase. That contract is what makes wiring the
endpoint a search instead of an archaeology dig.

| Kind | Form |
|---|---|
| Data constant | `MOCK_` prefix, or `…Mock` suffix on an exported payload |
| Mock module | `_modules/server/<domain>/<domain>Mock.ts` — one file per domain, never inline in a component |
| Inline explanation at a render site | `// MOCK: <why there is no endpoint>` |

`TODO(MOCK)` is **not** the token. `TODO` is already noisy, so a mock hides among fifty unrelated ones
and the grep that matters returns junk. `MOCK` alone is near-zero-false-positive.

**The badge and the marker die in the same commit that wires the endpoint.** A stale badge teaches the
reader that markers are unreliable, and then they stop reading them.

---

## 5. The seam is in the service layer, never in a component

A component must not know whether its data is real. It takes the field and renders it; the decision of
where that field came from is made once, server-side, in the service that assembles the payload.

```ts
// ✅ One place. Real endpoints for what exists; the mock fills only the gaps.
export async function fetchVehiclePage(token: string, vehicleId: number): Promise<VehicleV2PageItem> {
  const [detail, installRecord] = await Promise.all([
    get<VehicleV2DetailItem>(token, apiUrl.vehicleV2Details(vehicleId)),
    get<VehicleV2InstallRecordItem>(token, apiUrl.vehicleV2InstallRecord(vehicleId)),
  ]);

  return {
    detail,
    installRecord,
    // MOCK: no endpoint returns a reverse-geocoded position or these counts yet.
    lastPosition: vehicleV2Mock.lastPosition,
    connectedTo: vehicleV2Mock.connectedTo,
  };
}
```

```ts
// ❌ The decision made in a component. Now there are N places to find and flip.
const data = process.env.NEXT_PUBLIC_MOCK === '1' ? { odometerKm: 84_213 } : liveData;
```

**Everything downstream of the seam stays honest.** A route handler with nothing real to serve returns
`404`, not an invented success — the tile then renders its normal "unavailable" state
(`10-images-and-preview` §3) instead of a fabricated one.

**An env flag is for forcing the whole screen to mock during design review**, before any endpoint
exists. Default it to whatever the team reviews with, document it in `.env.example` in the same change,
and delete it once the screen is wired. It never controls whether a badge shows.

**The mock is typed to the real backend record.** A mock with an invented shape hard-codes the wrong
contract into every component that reads it.

---

## 6. Every mock is written down where the endpoint gap already lives

STEP 1.5 already requires a handoff doc (`_docs/<feature>-handoff.md`) for a contract that does not
exist yet. **The mock inventory goes in that same doc** — one table: the field or section, the proposed
endpoint, and where the mock is served from. Not a second document; the section that makes the handoff
actionable.

---

## Sources

Mock *shape* discipline: [`07-ai-workflow-integration`](./07-ai-workflow-integration.md) §7b ·
[`skills/fe-coding`](../../skills/fe-coding/SKILL.md) STEP 1.5.
