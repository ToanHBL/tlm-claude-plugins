# Interactive Affordances — the post-coding pass

Applies to every element a user can press, toggle, expand or drag. Layers on top of
`03-component-patterns` (semantics live in `Base*`) and `10-images-and-preview` (a thumbnail opens).

**Run this AFTER the component compiles, not while writing it.** Affordance defects are invisible in
the source — a button missing its pointer cursor reads perfectly in the diff and is only wrong on
screen. That is why this is a pass, not a paragraph.

---

## 1. Tailwind v4 removed the pointer cursor from buttons. Fix it once, globally.

Tailwind v4's upgrade guide, under **Preflight changes → Buttons use the default cursor**: *"Buttons
now use `cursor: default` instead of `cursor: pointer` to match the default browser behavior."*

A v3 codebase upgraded to v4 loses the hand cursor on **every** `<button>` at once and nothing fails —
no error, no lint, the button still works. This has already shipped in this ecosystem.

**On a Tailwind v4 project, put this in the global stylesheet** — it is the fix Tailwind itself
publishes, and it exempts disabled controls correctly:

```css
/* globals.css — restores the v3 affordance. */
@layer base {
  button:not(:disabled),
  [role='button']:not(:disabled) {
    cursor: pointer;
  }
}
```

`Base*` primitives still declare `cursor-pointer disabled:cursor-not-allowed` explicitly, so a
primitive rendered as a `span` (`<BaseButton as='span'>` inside a `<Link>`) is covered too — the base
layer only catches real `button` elements and `role="button"`.

---

## 2. `Base*` owns the affordance set. Screens inherit it.

Per `03-component-patterns`, semantics live in the primitive. So does this. A pressable built inline in
a Screen will get about half of the following right, and the half it misses is never the same twice.

| # | Requirement | Tailwind |
|---|---|---|
| 1 | Pointer cursor on anything clickable | `cursor-pointer` |
| 2 | A **visible** `:hover` change — background, border or text colour, not opacity alone | `hover:bg-…` + `transition-colors` |
| 3 | A **visible** `:focus-visible` ring | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600` |
| 4 | Disabled reads disabled and does not lie | `disabled:cursor-not-allowed` + a `disabled:` colour |
| 5 | Hit target ≥ 24×24 CSS px | `h-10` / `size-6` / `p-2` — see §4 |

Colours come from `@theme` tokens (`02-styling-ui-conventions`), never a hex.

```tsx
// ✅ One place. Every caller inherits all five.
className={clsx(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
  // Tailwind v4 Preflight sets `cursor: default` on <button> — ask for the pointer back.
  'cursor-pointer disabled:cursor-not-allowed',
  colorClasses[color], sizeClasses[size], className,
)}
```

```tsx
// ❌ A pressable hand-rolled in a Screen: no cursor (v4 Preflight), no focus ring,
//    hover is opacity-only (invisible on a light surface), and `pointer-events-none`
//    makes it look enabled while silently swallowing the click.
<Row onClick={onSelect} className='rounded-control p-1 hover:opacity-80 aria-disabled:pointer-events-none'>
```

**`focus-visible:`, not `focus:`.** `focus:` paints a ring after a mouse click too, so teams delete it
and the keyboard user loses their only position indicator. WCAG **2.4.7 Focus Visible (Level AA)** is
normative: *"Any keyboard operable user interface has a mode of operation where the keyboard focus
indicator is visible."*

**`outline`, not `ring` + `outline-none`.** An outline is drawn outside the box and survives
`overflow-hidden` ancestors. Never `outline-none` without a replacement — that is the most common way
an AA failure ships.

---

## 3. Anything that responds to a click is a control, not a styled `Col`

An `onClick` on a `Col` or `Row` is invisible to the keyboard and to assistive tech, and inherits none
of §2.

- Navigation → `<Link>` (`fe-coding` STEP 2 §3).
- An action → `<BaseButton>`, including a bare variant for an icon-only or image trigger
  (`10-images-and-preview` §1).
- A whole row that opens a record → **one** `<Link>` wrapping the row, not an `onClick` on the
  container (`09-data-listing` §1 — one tab stop per row).

An icon-only control carries `aria-label` through `t()`. There is no exception for "it's obvious".

---

## 4. Minimum hit target: 24×24 CSS px, and 44×44 where the thumb goes

WCAG 2.2 **2.5.8 Target Size (Minimum), Level AA**: *"The size of the target for pointer inputs is at
least 24 by 24 CSS pixels"*, with exceptions including **Spacing** — undersized targets pass if a
24px-diameter circle centred on each does not intersect another target's circle.

**2.5.5 Target Size (Enhanced)** is **Level AAA** and asks for **44 by 44 CSS pixels**. Apply 44×44 on
React Native and on any web view a phone user drives; 24×24 is the floor everywhere.

The usual offenders are small and repeated: a tag's ✕, a copy icon, a sort caret, a filter chip. A 16px
glyph needs padding, not a bigger glyph:

```tsx
// ✅ 16px icon, 32×32 target. Padding grows the hit area without changing the drawing.
<BaseButton variant='bare' aria-label={t('vehicle:removeTag', { tag })} className='p-2'>
  <IconClose className='size-4' />
</BaseButton>

// ❌ 16×16 target — fails 2.5.8 unless nothing sits within the spacing exception.
<BaseButton variant='bare' aria-label={t('vehicle:removeTag', { tag })}>
  <IconClose className='size-4' />
</BaseButton>
```

**2.4.11 Focus Not Obscured (Minimum), Level AA**: *"When a user interface component receives keyboard
focus, the component is not entirely hidden due to author-created content."* A sticky header or bottom
bar is the usual culprit — tab through the page and watch. **2.4.13 Focus Appearance** is Level AAA;
treat its 2px-perimeter / 3:1 contrast shape as a good default for the ring in §2.

---

## 5. THE PASS — run this after the component compiles

Not a re-read of the diff. Open the screen.

1. **Grep the diff for handlers on non-controls** — `grep -nE '<(Col|Row|div)[^>]*onClick' <files>`.
   Every hit is §3.
2. **Hover every pressable.** Cursor changes to a hand? Something visible changes?
3. **Tab through, mouse untouched.** Every control reachable, in reading order, with a ring you can see
   against its own background — and not hidden behind a sticky element (2.4.11).
4. **Look at each disabled control.** `not-allowed` cursor, visibly muted, no hover response.
5. **Measure the smallest target.** DevTools box model. `< 24` fails unless the spacing exception
   genuinely applies.
6. **On a Tailwind v4 project, confirm §1 is in `globals.css`.** If it is missing, that is the whole
   bug and it is one edit.

Report what you checked in one line. If something fails and you are not fixing it in this change, say
which — an unstated affordance gap gets reviewed as if it were intentional.

---

## Sources

Tailwind CSS [Upgrade guide — Preflight changes](https://tailwindcss.com/docs/upgrade-guide) ·
WCAG 2.2 [2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) ·
[2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) ·
[2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) ·
[2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) ·
[2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
