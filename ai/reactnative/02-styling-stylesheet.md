# RN Styling — StyleSheet & Theme

> Replaces the web styling layer (`ai/nextjs` uses Tailwind CSS). React Native has no CSS/Tailwind.

## Rule: always `StyleSheet.create`, never inline objects

```js
// ✅ CORRECT
import { StyleSheet, View } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column', backgroundColor: Colors.background },
});

// ❌ WRONG — inline objects bypass optimization
<View style={{ flex: 1, backgroundColor: '#fff' }} />
```

## Theme constants (replace Tailwind theming)

Central `_modules/values/theme.js` — **never hardcode colors/sizes**; always use these tokens.

```js
export const Colors = {
  background: '#FFFFFF', foreground: '#25262B',
  primary: '#33669A', primaryFg: '#FFFFFF', secondary: '#5C5F66',
  danger: '#EE4B2B', success: '#17C964', white: '#FFFFFF',
  border: '#CED4DA', muted: '#ADB5BD',
};
export const FontSize = { tiny: 10, small: 12, medium: 16, large: 20, xl: 24 };
export const Radius   = { small: 6, medium: 12, large: 16, full: 9999 };
export const Spacing  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
```

## Structural components — `Col` / `Row` / `TextPrimary`

Use these instead of raw `View`/`Text` (the RN equivalent of the web "never raw HTML" rule).

```js
// _modules/common/components/Col.js
import { View } from 'react-native';
export default function Col({ children, style }) {
  return <View style={[{ flexDirection: 'column' }, style]}>{children}</View>;
}
// Row.js — identical but flexDirection: 'row'

// _modules/common/components/TextPrimary.js
import { Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../../values/theme';
export default function TextPrimary({ text, style, colon = false, dot = false, uppercase = false }) {
  const display = uppercase ? text?.toUpperCase() : text;
  return (
    <Text style={[styles.text, style]}>
      {display ?? ''}{colon ? ': ' : ''}{dot ? '.' : ''}
    </Text>
  );
}
const styles = StyleSheet.create({ text: { fontSize: FontSize.medium, color: Colors.foreground } });
```

```js
// ✅ CORRECT
<Col style={styles.container}>
  <Row style={styles.header}><TextPrimary text={product.title} style={styles.title} /></Row>
</Col>
// ❌ WRONG — raw View/Text with inline flex
<View style={{ flexDirection: 'column' }}><Text>{product.title}</Text></View>
```

> `TextPrimary` here == `Text` in the web KB. Same role, RN naming.

## Base components (themed RN wrappers)

`Base*` components wrap RN primitives with theme-aware styling and a consistent prop API
(`variant`, `size`, `isLoading`, `isDisabled`). Keep them in `_modules/common/components/`.

> **Missing a structural/semantic component? BUILD a `Base*` for it — don't scatter raw primitives.**
> `Base*` is the single layer that wraps raw RN primitives (`View`/`Text`/`FlatList`/…). When a screen
> needs a structural piece the Basic set (`Col`/`Row`/`TextPrimary`) doesn't cover — a table, a list
> shell, a card — build an in-house `BaseTable` / `BaseList` / `BaseCard` wrapper rather than dropping
> raw `View`/`Text`/`FlatList` into screens. (RN has no DOM, but this is the same "build a Base
> component when one is missing" principle as the web KB's "never raw HTML for content" rule.)

```js
// _modules/common/components/BaseButton.js (abridged)
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../values/theme';

export default function BaseButton({ onPress, children, variant = 'primary', size = 'md',
  isLoading = false, isDisabled = false, style }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled || isLoading} activeOpacity={0.75}
      style={[styles.base, styles[variant], styles[`size_${size}`], isDisabled && styles.disabled, style]}>
      {isLoading
        ? <ActivityIndicator color={variant === 'primary' ? Colors.primaryFg : Colors.primary} />
        : <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>{children}</Text>}
    </TouchableOpacity>
  );
}
// styles: base + variants (primary/secondary/bordered/light/danger) + size_sm/md/lg + label variants
```

`BaseInput` follows the same shape and exposes `label`, `value`, `onChangeText`, `isInvalid`,
`errorMessage`, `secureTextEntry`, `keyboardType`. By default it also takes `name` + the form's
`register`/`setValue` and binds the field internally (register-first), so screens write
`<BaseInput name="email" .../>` with no `Controller` boilerplate. Reserve `Controller`/`useController`
for genuinely custom fields (see `05-validation-forms.md`).

## Responsive sizing — `scale()`

RN has no CSS breakpoints, but device widths still range from a 5" phone to a tablet. Fixed pixel
values that look right on the design device are cramped or comically small elsewhere. **Every icon size
and every fixed dimension goes through `scale()`**, which maps a design-baseline value onto the actual
screen width.

Put it in the shared utils (`_modules/common/utils/mixins.ts`) alongside `scaleFont`:

```ts
// _modules/common/utils/mixins.ts
import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 375; // design baseline (iPhone X-class)
const { width } = Dimensions.get('window');

/** Scale a design-baseline dimension to the current screen width. */
export const scale = (size: number) =>
  PixelRatio.roundToNearestPixel((width / BASE_WIDTH) * size);

/** Scale a font size — damped so text doesn't balloon on tablets. */
export const scaleFont = (size: number) => scale(size) * 0.9;
```

```tsx
import { scale, scaleFont } from '@/_modules/common/utils/mixins';

// ❌ Fixed pixels — wrong on every device that isn't the design device
<IconCheck size={20} />
<View style={{ width: 48, height: 48 }} />

// ✅
<IconCheck size={scale(20)} />
```

```ts
const styles = StyleSheet.create({
  avatar: { width: scale(48), height: scale(48), borderRadius: scale(24) },
  title:  { fontSize: scaleFont(18) },
  card:   { padding: Spacing.md, minHeight: scale(64) },
});
```

**What gets scaled:**

| Scale it | Leave it |
|----------|----------|
| Icon `size` props | `flex`, `flexGrow`, percentage widths (`'100%'`) |
| Fixed `width` / `height` / `minHeight` | `borderWidth: 1` (hairlines) |
| `borderRadius` on sized elements | Values already read from theme constants (`Spacing`, `Radius`) — those are pre-scaled once, at definition |
| `fontSize` — via `scaleFont`, not `scale` | Opacity, z-index, durations |

**Define theme constants pre-scaled, once** — then screens use the token and never call `scale()` on it
again (double-scaling is the common bug):

```ts
// _modules/config/theme.ts
export const Spacing = { xs: scale(4), sm: scale(8), md: scale(16), lg: scale(24) };
export const Radius  = { sm: scale(6), md: scale(12), full: 9999 };
```

## Conditional blocks — reserve space, don't unmount

Same rule as web (`ai/shared-fe/02` → "Avoid Layout Flicker"): a block appearing **mid-layout** (error
banner, validation message) must always render, with space reserved via `minHeight: scale(n)`; only the
inner content toggles, and the background goes transparent when inactive.

```tsx
// ✅ Container always occupies space — nothing below it jumps
<Row style={[styles.formError, !formError && styles.formErrorHidden]} accessibilityRole="alert">
  {formError && <IconWarning size={scale(16)} color={Colors.danger} />}
  {formError && <TextPrimary style={styles.formErrorText}>{formError}</TextPrimary>}
</Row>
```

```ts
formError: {
  minHeight: scale(45), // reserve space so the layout doesn't jump when the error toggles
  alignItems: 'center',
  paddingHorizontal: Spacing.sm,
  backgroundColor: Colors.dangerSoft,
},
formErrorHidden: { backgroundColor: 'transparent' },
```

Use `minHeight`, not `height`, so multi-line messages can still grow. A block at the **end** of a
layout is exempt — nothing below it to push.

## Animation — Moti (optional, Framer-Motion equivalent)

> Animations are optional — Moti / Reanimated are **not** default dependencies (see `01-architecture`
> dependency policy). Add Moti only when a screen genuinely needs animation.

```js
import { MotiView } from 'moti';
<MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }}
  transition={{ type: 'timing', duration: 300 }}>{children}</MotiView>
<MotiView from={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} />
```

## Assets

```js
const logo = require('../../assets/logo.png');           // static
<Image source={logo} style={styles.logo} />
<Image source={{ uri: product.imageUrl }} style={styles.image} />  // remote
```

## Best practices
1. Always `StyleSheet.create` — never inline style objects.
2. Use theme constants (`Colors`, `Spacing`, `FontSize`, `Radius`) — never hardcoded values.
3. `Col`/`Row` instead of raw `<View style={{ flexDirection }}>`; `TextPrimary` instead of raw `<Text>`.
4. **Mobile-only** — no responsive breakpoints; use `scale()` for every icon size and fixed dimension,
   `scaleFont()` for font sizes. Theme constants are pre-scaled once — never `scale()` them again.
5. **Safe area** — wrap root screens with `SafeAreaView` from `react-native-safe-area-context`.
6. **Platform differences** — `Platform.OS === 'ios'` for platform-specific tweaks.
7. **No layout flicker** — mid-layout conditional blocks always render with `minHeight: scale(n)`
   reserved; only the inner content toggles.
