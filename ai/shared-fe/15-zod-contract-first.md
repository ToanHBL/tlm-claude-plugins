# Zod Contract-First — schemas are the source of truth, responses are parsed, not cast

## The rule

**Every wire contract is a Zod schema first. The TypeScript type is derived from it (`z.infer`), never
written by hand next to it. Data crossing a boundary is parsed through that schema — in BOTH
directions.**

- **Inbound** (request body, form data, query params, route params): `schema.safeParse` at the top of
  the handler/action → `400` with field errors on failure. (Already a hard rule — see
  `05-validation-patterns.md`.)
- **Outbound / responses you consume**: the JSON a backend returns to your service layer is
  `schema.parse`d (or `safeParse`d) at the service boundary — **never** bare-cast with
  `await res.json() as T`.
- **Fixtures / mocks** are pinned with `satisfies`, so fixture drift is a compile error, not a runtime
  surprise.

## Why

A hand-written interface behind `as T` is a promise the compiler believes and nobody checks. This is
not hypothetical — it is the single biggest gap found when auditing a house-style codebase (tlm-test):
253 lines of interfaces mirroring backend C# records field-for-field, and every response consumed via
`return (await res.json()) as VehicleV2PageResponse`. The types were perfect; the *enforcement* was
zero. If the backend renames a field or renumbers an enum, TypeScript stays green and the UI silently
renders em-dashes — the failure is invisible until a user reports wrong data.

The schema closes the loop: the same file that documents the contract also *checks* it, at the one
place data enters the app. A drift becomes a loud, located error (`ZodError` naming the exact field)
on the first request, in dev, instead of a silent wrong screen in production.

The counter-example that proves the pattern works at scale: Telemax-Ops' `packages/contracts` — every
portal endpoint is a Zod schema with the type inferred, and every fixture is declared
`satisfies OrdersResponse`, so the fixture cannot drift from the contract without failing `tsc`.

## The pattern

```ts
// _modules/_api/schemasVehicleV2.ts  (or packages/contracts in a monorepo — see 16-monorepo-turborepo.md)
import { z } from 'zod';

// Mirrors the backend record field-for-field (STEP 2 §10 still applies — the SCHEMA mirrors,
// the TYPE is inferred). Name the source file, as the hand-written types already do.
/** `VehicleV2IdentityItem` — Telemax.Dashboard.Shared/VehicleV2/. */
export const zVehicleIdentity = z.object({
  vehicleId: z.number().int(),
  recordName: z.string(),
  imei: z.string().nullish(),
  connection: z.nativeEnum(EConnectionState),   // enums via nativeEnum — bounds never drift
  lastReportedUtc: z.string().nullish(),        // DateTime? arrives as ISO string
});
export type VehicleIdentity = z.infer<typeof zVehicleIdentity>;
```

```ts
// ❌ WRONG — the cast is a lie the compiler believes
const data = (await res.json()) as VehicleV2PageResponse;

// ✅ CORRECT — parse at the service boundary; everything downstream gets a checked type
const data = zVehicleV2PageResponse.parse(await res.json());

// ✅ When the caller can degrade gracefully, safeParse and map to the app's error type
const parsed = zVehicleV2PageResponse.safeParse(await res.json());
if (!parsed.success) throw new UpstreamContractError('vehicle-v2/page', parsed.error);
```

```ts
// ✅ Fixtures pinned with `satisfies` — drift from the contract fails tsc, not QA
export const vehiclePageFixture = {
  identity: { vehicleId: 101, recordName: 'PRIME-042', /* … */ },
} satisfies VehicleV2PageResponse;
```

Money and physical units follow the same discipline inside the schemas: integer minor units + explicit
ISO-4217 currency (`{ amountCents: z.number().int(), currency: z.string().length(3) }`), units in the
field name (`weightGrams`, `lengthMm`) — never floats on the wire.

## Where schemas live

- **Single app**: `_modules/_api/schemas[Domain].ts` next to the client; the old `types[Domain].ts`
  becomes re-exports of `z.infer` types (keep the file so imports don't churn).
- **Monorepo with more than one consumer** (an ops app + a portal, web + mobile): a dedicated
  `packages/contracts` workspace — schemas + inferred types + `satisfies`-pinned fixtures, exported as
  `.` and `./fixtures`. See `16-monorepo-turborepo.md`.
- **Server Actions / route handlers you own**: the same schema validates the request in the handler and
  types the client call — one definition, both sides. Use `zodResolver(schema)` in RHF so client rules
  and server rules are literally the same object, not two definitions that drift (tlm-test's sign-in
  form validated `required + maxLength` client-side while the server checked `z.email()` — the drift
  shipped).

## Exceptions (each one stated in code, not silent)

- **Streams / SSE frames**: parse the *assembled* message, not every chunk; the frame-reader itself may
  work on raw text.
- **Genuinely hot paths** (a poll loop over a large payload) may guard with `schema.parse` in
  development and skip in production — via one shared helper (`parseContract(schema, data)`), never an
  inline `NODE_ENV` check, and only with a comment saying why.
- **Third-party SDK responses** already typed by the SDK (Stripe, Prisma) are the SDK's contract — do
  not re-wrap them; the rule targets *your* backends' raw `fetch`/`res.json()` seams.
- `as unknown as T` remains a commented last resort for non-wire code (STEP 2 §8); it is **never**
  acceptable on a response body.

## Checklist hooks

- `hooks/lint-fe.mjs` flags `.json() … as T` (response cast) mechanically.
- Review checklist (`07-ai-workflow-integration.md` §9): "Backend responses parsed through their Zod
  schema at the service boundary — never `res.json() as T`."
