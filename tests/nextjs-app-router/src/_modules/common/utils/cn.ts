// Tiny className joiner — filters falsy values so conditional Tailwind classes stay readable.
export default function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
