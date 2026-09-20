/**
 * Join class names. Deliberately not clsx or tailwind-merge — the components
 * here never build conflicting utility strings, so a dependency would buy
 * nothing and add another package to keep patched.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
