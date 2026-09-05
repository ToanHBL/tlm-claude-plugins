# End-to-End Tests — Playwright

Applies to any project with user-reachable routes. The suite is small on purpose: it exists to catch
the class of bug unit tests structurally cannot see — a page that renders while a request behind it
is quietly failing.

---

## 1. Ask before you write one. Ask at PLAN time, not after.

E2E is the only test layer that costs real wall clock, needs a browser and a running server, and goes
stale the moment a route moves. So it is **opt-in per feature**, and the moment to raise it is while
the plan is still being agreed — not once the code is written and the answer is expensive either way.

Put it in the plan as a line the user can strike out:

> *E2E: I'll add a Playwright spec covering `/vehicles → /vehicles/{id} → install record` — the
> navigation chain and a no-failing-request sweep. Say if you'd rather skip it.*

Two rules about the asking:

- **Ask once, in the plan.** Not per file, not again at the end.
- **When the project already has a suite, do not ask — update it.** An existing suite is a standing
  commitment; leaving it stale is the failure, not the work.

---

## 2. The sweep: no common page may produce an undeclared 4xx or 5xx

The cheapest test in the suite and the one that pays. A screen can look perfect while the request
behind it 500s, and nobody notices until a user does.

For every page a user can reach normally: navigate, wait for the network to settle, and assert that
**no response was ≥ 400** except the ones the test itself declares.

```ts
// ✅ Declared exceptions live on the test that needs them
const failures = collectFailedResponses(
  page,
  (response) => response.status() === 401 && response.url().includes('/api/'),
);

const response = await page.goto('/vehicles');
expect(response?.status()).toBeLessThan(400);
await page.waitForLoadState('networkidle');

expect(failures, 'unexpected failing requests on /vehicles').toEqual([]);
```

```ts
// ❌ A global allowance. It hides the failure it was written for, and every
//    failure that arrives after it.
const IGNORE = [400, 401, 403, 404, 500];
```

**Declare the exception on the test, never globally.** An allowance that applies everywhere is how a
new 500 ships green.

Also assert **that a redirect is a redirect** — a signed-out visit that lands on `/sign-in` is
correct behaviour and must not read as a failure — and that an unknown route renders **your**
not-found inside the app shell, not the framework's unstyled default.

---

## 3. The exception: endpoints that are SUPPOSED to refuse

A permission check is not an error. Test it by asserting the **exact status**, because the status IS
the contract, and collapsing statuses is how a config problem gets diagnosed as an outage.

| Case | Expect |
|---|---|
| No session | `401` |
| Signed in, feature/permission denied | `403` |
| Malformed input (a non-numeric id, an over-cap batch) | `400` — never a `500` |
| Not in the caller's scope, or absent | `404` |

```ts
test('a malformed vehicle id is rejected with 400, not a 500', async ({ request }) => {
  const response = await request.get('/api/vehicle-v2/not-a-number/page');
  expect(response.status()).toBe(400);
});
```

This is not academic. A backend feature flag returned a bare `403`; the proxy in front of it caught
everything non-OK and answered `502`, so a one-flag configuration problem read as a broken backend.
A test that pinned `403` would have named it in seconds.

**Assert the body only where it carries meaning** — a machine-readable reason code, not prose. Prose
is copy and copy changes.

---

## 4. Seed the session; do not drive the login form

Signing in for real needs a live account, a password in CI, and breaks the day 2FA is switched on for
it. Seed the session artefact directly — for a cookie-session app, add the cookie — and keep the
real login flow as **one** dedicated test if it is worth covering at all.

A structurally valid session whose token the backend rejects is useful in its own right: it is
exactly the state the permission expectations in §3 are written against. Take a real one from an env
var (`E2E_SESSION_COOKIE`) for the tests that genuinely need live data, and `test.skip` them when it
is absent rather than failing a suite for a missing secret.

**Never commit a real token.** It goes in the environment, and the fixture's default is an obviously
fake one.

---

## 5. Keep it small, and keep it honest

- **Cover the chain, not the pixels.** List → detail → sub-page, and the redirects between them.
  Layout assertions belong to the design review; they break on every restyle and teach the team to
  ignore red.
- **No sleeps.** `waitForLoadState`, `expect(locator)` and web-first assertions retry; a `waitForTimeout`
  is a flake with a timer on it.
- **Query by role and accessible name.** `getByRole('heading', { name: /page not found/i })` fails when
  the heading stops being a heading — which is a bug worth failing on. A CSS selector does not.
- **A skipped test says why.** `test.skip(!process.env.E2E_SESSION_COOKIE, 'needs a real account')`.
- **A stale green suite is worse than none**, because it is the thing people trust. If a change made
  a spec wrong, fix the spec in the same change or delete it.

---

## 6. When code changes, the suite changes with it

A route, a redirect, a new failure mode — each moves the surface the suite describes. The
`e2e-watch` hook fires on any edit to a page, layout, route handler or `*Screen` in a project that
already has a suite, and asks three questions: is an existing spec now wrong, is there a new
deliberate refusal to pin, and does the suite still pass.

Answer them in the same change. And say in your summary what you did **not** cover — an untested
path nobody names is assumed tested.

---

## Sources

[Playwright — best practices](https://playwright.dev/docs/best-practices) ·
[test fixtures](https://playwright.dev/docs/test-fixtures) ·
[web-first assertions](https://playwright.dev/docs/test-assertions)
