// Central theme tokens — never hardcode colors/sizes; always use these tokens.
// Mirrors ai/reactnative/02-styling-stylesheet.md.

export const Colors = {
  background: '#FFFFFF',
  foreground: '#25262B',
  primary: '#33669A',
  primaryFg: '#FFFFFF',
  secondary: '#5C5F66',
  danger: '#EE4B2B',
  success: '#17C964',
  white: '#FFFFFF',
  border: '#CED4DA',
  muted: '#ADB5BD',
  surface: '#F1F3F5',
} as const;

export const FontSize = { tiny: 10, small: 12, medium: 16, large: 20, xl: 24 } as const;

export const Radius = { small: 6, medium: 12, large: 16, full: 9999 } as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
