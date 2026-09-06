# Data Listing — tables, sort, filter, paging

Applies when a screen lists records and **the user gave no design**. With a design, the design wins
(`skills/tlm-fe-coding` STEP 0). Layers on top of `03-component-patterns` (component hierarchy, empty
states) and `07-ai-workflow-integration` §7b (types mirror the backend).

---

## 1. The default shape is a table

A list of records with more than one attribute per row renders as a **`BaseTable`**, not a stack of
cards. Cards are the default only for a genuinely single-attribute list, or where a design says so.
A table is scannable down a column; a card grid forces the reader to re-find each value in every card.

`BaseTable` is a `Base*` primitive, so it is the **only** layer allowed to emit `<table>`, `<thead>`,
`<th>` and ARIA — screens compose it and never write that markup themselves. Use a native `<table>`:
the APG "strongly encourage[s] … a native HTML `table` element whenever possible".

Four defaults hold unless the user says otherwise:

| Default | Value | Why |
|---|---|---|
| Numeric / date columns | **right-aligned**, `tabular-nums`; text left-aligned | Ragged-left digits cannot be compared by eye (Primer, Material). |
| Header row | **sticky**, opaque background | Scrolled past, an unlabelled column is unreadable (NN/g: freeze header rows). |
| Sort | **exactly one column sorted by default** | An unsorted first paint has no defined order, so rows move between refetches. |
| Row identity | the record's real id as `key` | Index keys reorder wrongly the moment the sort changes. |

`aria-sort` goes on the **sorted header only** — MDN: "should only be added to a single table or grid
header at a time", and it "doesn't have any impact on the actual sort order". It describes; it does
not sort.

```tsx
// ✅ BaseTable owns the semantics and the ARIA. Raw DOM is allowed HERE and nowhere else.
<th
  scope='col'
  aria-sort={sortKey === column.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
  className={clsx(
    'sticky top-0 z-10 bg-surface px-3 py-2 text-left font-medium',
    column.isNumeric && 'text-right tabular-nums',
  )}
>
```

```tsx
// ❌ Raw markup in a Screen, no aria-sort, numbers left-aligned, index as key
{rows.map((row, index) => <div key={index} className='flex'>…</div>)}
```

**Rows are links, not grids.** In a `table` "all focusable elements contained in a table are included
in the page tab sequence" (APG), so a 25-row listing with four controls per row is a 100-stop tab
journey. Give the row **one** `<Link>` (house rule 3) and keep the tab sequence at one stop per row.
Reach for the APG *grid* pattern only when cells genuinely need arrow-key navigation.

---

## 2. The server sorts, filters and pages. The client does neither.

What you render is **the page the API returned**. Never re-sort, re-filter or slice it in a component.
Client-side sorting of one page sorts 25 rows out of 4,000 and silently lies: the top row is the
largest *on this page*, not the largest. This is §7b's mapper rule applied to collections — the moment
the client re-derives what the server already decided, the two drift and nobody notices.

- **Wire params are the backend's.** Read the endpoint and send what it takes (STEP 1.5 — don't guess).
- **The response's total is what the pager trusts.** Never infer "there is a next page" from
  `rows.length === limit`; that shows a dead Next button on an exact multiple.
- **Filter state belongs in the query key.** It is part of the server's answer, so it is part of the
  cache identity.
- **Use `placeholderData: keepPreviousData`** (TanStack Query **v5** spelling — `keepPreviousData: true`
  is v4 and no longer valid). Without it "the UI jumps in and out of the `success` and `pending`
  states because each new page is treated like a brand new query": the table blanks to skeletons on
  every page click.

```tsx
// ✅ src/_modules/_api/apiClientVehicle.ts — limit/offset straight through, nothing derived
export function useQueryVehicleList(params: VehicleListParams) {
  return useQuery<VehicleListResult>({
    queryKey: [QUERY_KEY_VEHICLE_LIST, params],
    queryFn: ({ signal }) => {
      const query = new URLSearchParams({
        limit: String(params.limit),
        offset: String(params.offset),
        sort: params.sort,
        dir: params.dir,
      });
      return getJson(`${apiUrlInternal.vehicleList()}?${query}`, signal);
    },
    placeholderData: keepPreviousData, // no skeleton flash between pages
    staleTime: 30_000,
  });
}
```

```tsx
// ❌ Sorting the page the server already sorted — a wrong answer, confidently displayed
const ordered = [...data.items].sort((a, b) => b.odometerKm - a.odometerKm);

// ❌ Inferring the next page from the row count
<BaseButton disabled={data.items.length < limit}>Next</BaseButton>
```

**If the project later adopts TanStack Table**, the same rule reads `manualPagination`,
`manualSorting`, `manualFiltering` all `true` plus `rowCount` from the response. TanStack states it
plainly: "A `manual*` option does not fetch or transform data. It tells the table to use the data you
provide as already processed for that feature." Leaving them off makes the table re-page paged data.

**The one exception:** a list the server returns in full and that cannot grow — a fixed enum, a
four-photo strip — may be ordered at the render site. Say so in a comment.

---

## 3. `limit`, `offset`, `sort`, `dir` and every filter live in the URL

Not `useState`. A support engineer must be able to paste the URL of the thing they are looking at, and
Back must return to the filtered view rather than the unfiltered one.

**The URL carries the wire params verbatim — `?limit=25&offset=50`, not `?page=3&size=25`.** No
page-to-offset arithmetic anywhere: not in a component, not in a hook, not in a mapper. This is §7b
again — the backend's parameter name IS the app's parameter name, and a derived `page` is one more
place for the two to disagree. Page *numbers* are a rendering of `offset / limit`, computed at the
pager's render site and stored nowhere.

- **Canonical keys:** `limit`, `offset`, `sort`, `dir`, then one key per filter. Absent means default;
  **never write a default into the URL** — `?offset=0&dir=asc` on first paint is noise.
- **Any filter or sort change resets `offset` to 0.** Landing on offset 150 of a 2-row result is the
  most common bug in this whole area.
- **Default `limit` is 25** unless the user says otherwise — a screenful on a laptop, small enough to
  keep the request fast. This is a house choice, not a sourced one; say so when you apply it.
- **App Router:** `useSearchParams` is "a **Client Component** hook" returning "a **read-only** version
  of the `URLSearchParams` interface", and a statically-rendered page that calls it "must be wrapped in
  a `Suspense` boundary, otherwise the build fails". The segment's `loading.tsx` already provides that
  boundary.

**This narrows house rule 3 (Link-only navigation) rather than loosening it.** Paging and sorting are
**destinations** and stay `<Link>` — a user must be able to middle-click page 3. Only a filter
*control* uses `router.replace`, and only on Apply (§4).

```tsx
// ✅ Paging and sorting are navigation → Link, per house rule 3
<Link href={`${pathname}?${withParams({ offset: String(offset + limit) })}`} className='no-underline'>
  <BaseButton as='span' disabled={offset + limit >= total}>{t('common:next')}</BaseButton>
</Link>

// ❌ Local state — unshareable, Back leaves the filter applied, refresh loses it
const [offset, setOffset] = useState(0);
<BaseButton onClick={() => setOffset((o) => o + limit)}>Next</BaseButton>
```

---

## 4. Filters apply on **Apply**, not on every keystroke

A filter bar collects a draft and commits it in one go. NN/g's *User Intent Affects Filter Design*
recommends letting "users tell you when they're done selecting filters"; it is also far cheaper on the
backend than a request per keystroke, and it makes the URL change exactly once per intent.

- The draft lives in local state — this is the one thing on a listing that legitimately does.
- **Apply** writes the whole draft to the URL in a single `router.replace(…, { scroll: false })`,
  resetting `offset` to 0.
- **Apply is disabled when the draft equals what is already applied**, so the button says whether
  there is anything to commit.
- **Clear filters** is a `<Link>` to the same path with no filter params — it is a destination.
- Enter inside a filter input submits the bar, so the keyboard path matches the mouse path.

---

## 5. A listing ships four states — and *filtered-empty* is its own

`03-component-patterns` already makes a visible empty state a MUST. A **filtered** listing has a
fourth state that rule does not cover, and it is the one that generates support tickets: the user
filtered to zero results and cannot tell "nothing matches" from "the fleet is empty" or "it broke".

| State | What renders |
|---|---|
| Loading, first paint | `BaseSkeleton` rows at the table's real row height — never a centred spinner that collapses the layout |
| Loading, page change | previous rows stay (`keepPreviousData`), header and pager stay enabled, a subtle busy affordance |
| Error | `BaseAlert` + a retry wired to `refetch`, **table header still rendered** |
| Empty, no filters | `BaseEmptyFallBack` — "no records yet" |
| **Filtered-empty** | distinct copy naming the active filters, plus **Clear filters** |

The header row, the filter bar and the pager **always render, in every state** — same reasoning as the
existing MUST: a control that disappears is indistinguishable from a control that is broken, and a
tester cannot clear a filter whose bar vanished with the rows.

```tsx
// ✅ Filters and pager sit outside the state switch; only the body swaps
<Col className='gap-3'>
  <VehicleListFilters />                    {/* always visible — the way out of filtered-empty */}
  {isError ? (
    <BaseAlert message={t('vehicle:listLoadFailed')} />
  ) : isPending ? (
    <BaseTableSkeleton rows={limit} columns={COLUMNS} />
  ) : (
    <BaseEmptyFallBack
      isEmpty={rows.length === 0}
      title={hasFilters ? t('vehicle:noMatchesTitle') : t('vehicle:listEmptyTitle')}
      message={hasFilters ? t('vehicle:noMatchesMessage') : t('vehicle:listEmptyMessage')}
    >
      <BaseTable columns={COLUMNS} rows={rows} sortKey={sort} sortDir={dir} />
    </BaseEmptyFallBack>
  )}
  <VehicleListPager limit={limit} offset={offset} total={data?.total ?? 0} />
</Col>
```

```tsx
// ❌ The filter bar unmounts with the rows — the user is trapped in zero results
{rows.length > 0 ? (<><VehicleListFilters /><BaseTable … /></>) : <BaseEmptyState />}
```

Every string goes through `t()`, and filtered-empty copy composes filter values with `joinWith`, never
a template literal (`02-styling-ui-conventions`).

---

## Sources

APG [Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/) ·
[Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) ·
MDN [`aria-sort`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-sort) ·
[Primer DataTable](https://primer.style/product/components/data-table/) ·
[Material 1 data tables](https://m1.material.io/components/data-tables.html) ·
NN/g [Data Tables](https://www.nngroup.com/articles/data-tables/) ·
[Filter design](https://www.nngroup.com/articles/applying-filters/) ·
[Empty states](https://www.nngroup.com/articles/empty-state-interface-design/) ·
TanStack Query [Paginated Queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries) ·
TanStack Table [client vs server](https://tanstack.com/table/latest/docs/guide/client-side-vs-server-side) ·
Next.js [`useSearchParams`](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
