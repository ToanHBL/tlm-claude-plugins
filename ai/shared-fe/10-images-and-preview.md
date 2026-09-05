# Images and Preview

Applies to every image the app renders. Layers on top of `03-component-patterns` (Modal Architecture,
component hierarchy) and `02-styling-ui-conventions` (when `onClick` is acceptable).

---

## 1. A thumbnail opens

Any image in a list, table cell or card is a **thumbnail of something the user needs to read** — a
licence plate, a VIN, an odometer, damage on a panel. At tile size it is unreadable, so it must open
full-size. A gallery of thumbnails that do not open looks finished and is useless; it is the single
most common defect in UI built without a design.

Use the project's existing centralized modal — no new mechanism:

```tsx
// ✅ Inline handler, no useCallback, no named function (function minimalism)
<BaseButton
  variant='bare'
  aria-label={t('install:openPhoto', { label })}
  onClick={() => refModal.current?.onOpen(
    <ImagePreviewContent images={ordered} startIndex={index} />,
    { size: 'full' },
  )}
>
  <BaseImage src={url} alt={label} fallbackLabel={t('install:photoUnavailable')} className='h-20 w-28' />
</BaseButton>
```

Opening a modal is a listed **acceptable** use of `onClick` — it is not navigation, so the Link-only
rule does not apply.

---

## 2. The modal contract (MUST — `BaseModal` owns all of it, once)

These are not per-screen decisions. Implement them **inside `BaseModal`** so every caller inherits
them; a preview hand-built in a domain component will get at most half of them right.

| Requirement | Source |
|---|---|
| `role="dialog"`, `aria-modal="true"`, `aria-labelledby` or `aria-label` | APG Dialog (Modal) |
| Focus moves **into** the dialog on open | APG: "focus moves to an element inside the dialog" |
| Focus **returns to the invoking element** on close | APG |
| Tab cycles inside; Shift+Tab wraps backwards | APG |
| **Esc closes** | APG |
| **Click-outside closes** | not free — see below |
| Background scroll locked, background inert | native `<dialog>` + `showModal()` |

**Build it on native `<dialog>` + `showModal()`.** MDN: everything outside "should be rendered inert …
this behavior is provided by the browser", Esc-to-close "is provided by the browser", and the dialog
sits in the top layer with a `::backdrop` to style. That is the focus trap, the inerting and Esc for
free — the difference between an afternoon and a fortnight.

**Click-outside is the one thing it does not give you.** A dialog opened with `showModal()` "behaves as
if the value was `"closerequest"`" — Esc and close buttons, not light dismiss. Opt in with
`closedby="any"`, and keep an explicit close button regardless.

**If you hand-roll it, you own all of it.** MDN on `aria-modal`: "ARIA doesn't change anything about an
element's function or behavior. To create a modal effect you must use JavaScript to manage behavior,
focus, and ARIA states." A `<div role="dialog" aria-modal="true">` with no focus management announces
itself as modal and behaves as if it is not — worse than no ARIA at all.

**When the preview belongs to a set, ship keyboard next/prev.** ← / → move between images, the counter
reads `2 / 4` through `t()`, and the arrows wrap or disable consistently. `alt` on the full-size image
is the **same descriptive label** as the thumbnail, never `""` — inside the preview the image *is* the
content.

---

## 3. No layout shift, no broken-image glyph

- **Every image declares its box before it loads** — `width`/`height`, or `aspect-ratio` on the
  wrapper. web.dev: "Always include `width` and `height` size attributes … Alternatively, reserve the
  required space with CSS `aspect-ratio`." Without it, rows jump as photos arrive. Same principle as
  the existing "conditional mid-layout blocks reserve space" rule, applied to media.
- **This is not optional for lazy images.** MDN: "Lazy-loaded images will never be loaded if they do
  not intersect a visible part of an element … because unloaded images have a `width` and `height` of
  `0`." A lazy image with no dimensions can simply never appear.
- **`loading="lazy"` on list and card thumbnails; never on the one above-the-fold hero image.**
- **A failed image renders a labelled tile, not a broken glyph.** `onError` → a dashed tile carrying
  `role="img"` and an `aria-label`. Primer: "Don't try to conceal or downplay that something is wrong."
  A thumbnail whose URL 403s must read "Photo unavailable".
- **`alt` is content, not decoration.** MDN: `alt=""` says the image "is *not* a key part of the
  content" and makes browsers "hide the broken image icon" — on a vehicle photo that hides the failure
  instead of reporting it, exactly backwards. Use `alt=""` only for a genuinely decorative glyph.

**An image the backend serves under the caller's token needs a proxy, not a URL.** An `img` tag cannot
send an `Authorization` header, so a same-origin route handler streams the bytes and the session cookie
travels with the request. Pointing `src` at the stored blob URL only works if that blob is publicly
readable — which is usually a bug, not a feature.

**`next/image` caveats.** It needs the image host allow-listed at build time, so a host that is not
known then (a customer's storage account) rules it out — use a plain `img` in the `Base*` primitive and
say why in a comment. Where it is usable: **Next 16 deprecated `priority` in favour of `preload`**;
`onError` requires a Client Component; and `fill` needs a positioned parent plus `sizes`, or "the
browser assumes the image will be as wide as the viewport (`100vw`)".

---

## Sources

APG [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) ·
MDN [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) ·
[`showModal()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal) ·
[`aria-modal`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-modal) ·
[`<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) ·
[web.dev CLS](https://web.dev/articles/optimize-cls) ·
[Primer degraded experiences](https://primer.style/product/ui-patterns/degraded-experiences/) ·
[Next.js Image](https://nextjs.org/docs/app/api-reference/components/image)
