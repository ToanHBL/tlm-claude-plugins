# Mock Data — label what is not wired yet

Applies whenever a screen renders values that did not come from the real API. `skills/tlm-fe-coding`
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

## 2. Mock is scoped to the field, and it never blocks the screen

The unit is the **field or section that has no endpoint**. Never the screen, and never a
mock-versus-live mode.

| The value… | Renders | Marker |
|---|---|---|
| has an endpoint | **live data, always** | **none** — a marker on real data is as misleading as none on fake |
| has **no** endpoint yet | the mock, so the screen still works | **a `mock` badge beside it**, in every environment |
| has an endpoint that is failing right now | the error / unavailable state | none — that is `09-data-listing` §5, not a mock |

**Show the mock; do not block on it.** A missing endpoint must not leave a hole, a spinner or a
disabled screen. The user gets the layout, the shape of the value and a clear mark that this
particular number is not real yet — which is strictly more useful than an empty panel, and it lets
design review and QC proceed on everything around it.

**There is no mock/live switch.** A flag that swaps the whole screen creates two products: one
everybody demos and one that ships, and only the second is ever really tested. It also makes the
badge lie — with the flag on, twenty fake fields sit behind two badges. If a screen has an endpoint,
read it. If it does not, mock that field and badge it. Nothing in between.

**Do not add a whole-screen banner.** Marking the individual fields is what tells the reader *which*
values are waiting; a banner over a mostly-real page teaches them to distrust all of it and stop
reporting anything. The only case for one is a screen where literally nothing is wired — and that is
a screen that should not have been built yet.

## 3. What the marker looks like (MUST — one primitive, `BaseMockBadge`)

Two jobs, both required: **obvious in a screenshot**, and **impossible to mistake for a value**.

| Rule | Why |
|---|---|
| **Dashed** border | Nothing else in the system is dashed. It reads as "provisional" at a glance, including in a screenshot pasted into a ticket. |
| **Warning** tone, never a status colour | `success` / `danger` are data meanings. A mock marker must not look like a state the record is in. Needs `warning-*` tokens in `@theme` — adding them is a token change, not a per-component decision. |
| The literal word **`mock`**, lowercase | Not an emoji, not `⚠`, not `TEST`, not `DEMO`. Unambiguous, and it is the same token you grep for. |
| **Beside** the value, never replacing it | The reviewer still needs to see the placeholder's shape to tell you it is the wrong shape — and the screen keeps working. |
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
    detail,          // live
    installRecord,   // live
    // MOCK: no endpoint joins DeviceLastKnownPosition + IAddressService yet.
    lastPosition: vehicleV2UnwiredMock.lastPosition,
    // MOCK: no controller exposes a per-vehicle count for rules/zones/reminders.
    connectedTo: vehicleV2UnwiredMock.connectedTo,
  };
}
```

```ts
// ❌ A mode switch. Two products, one of them untested, and the badges now lie
//    about how much of the screen is fake.
if (USE_MOCK) return wholePageMock;
```

**Everything downstream of the seam stays honest.** A route handler with nothing real to serve returns
`404`, not an invented success — the tile then renders its normal "unavailable" state
(`10-images-and-preview` §3) instead of a fabricated one.

**No env flag.** The service assembles the payload from whatever exists and fills the rest from the
mock module — one function, one path, the same in every environment. A component receives a field and
renders it; it never learns which of the two it got, and it never branches on an environment variable.

**The mock is typed to the real backend record — and reuses one where it exists.** Before inventing a
shape for something unwired, search the backend for a record that already carries that data: a
position DTO, an address type, a paged-result wrapper. Inventing `{ latitude, longitude, addressLine }`
next to an existing `LatLngAddress { Lat, Lng, Address }` guarantees a rename the day it is wired. A
mock with an invented shape hard-codes the wrong contract into every component that reads it.

---

## 6. Every mock is written down where the endpoint gap already lives

STEP 1.5 already requires a handoff doc (`_docs/<feature>-handoff.md`) for a contract that does not
exist yet. **The mock inventory goes in that same doc** — one table: the field or section, the proposed
endpoint, and where the mock is served from. Not a second document; the section that makes the handoff
actionable.

---

## Sources

Mock *shape* discipline: [`07-ai-workflow-integration`](./07-ai-workflow-integration.md) §7b ·
[`skills/tlm-fe-coding`](../../skills/tlm-fe-coding/SKILL.md) STEP 1.5.
