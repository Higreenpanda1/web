/**
 * The company-registration price table behind the instant estimate on the
 * company-formation page. Whole yuan, from the owner's price list (edition
 * October 2026). `null` means
 * "quoted separately" — a physical office depends on the space.
 *
 * Numbers only; every label comes from `estimator.*` in the message
 * catalogues. Change a price here and the estimate, its note and the seed's
 * "from" prices should move together — the seed is the source for the latter,
 * so update src/seed/content.ts and catalogue.ts in the same change.
 */
export const QUOTE = {
  cities: ['shenzhen', 'guangzhou', 'shanghai', 'yiwu', 'hongkong'] as const,
  registration: { inPerson: 7200, remote: 8200 } as const,
  address: { basic: 3200, residence: 12000, physical: null } as const,
  bank: { none: 0, inPerson: 1400, remote: 1400 } as const,
  extras: { accounting: 3800, workPermit: 7600 } as const,
  /** Yearly items, for the "per year" tag. */
  yearly: ['address', 'accounting'] as const,
}

export type QuoteSelection = {
  city: (typeof QUOTE.cities)[number]
  registration: keyof typeof QUOTE.registration
  address: keyof typeof QUOTE.address
  bank: keyof typeof QUOTE.bank
  extras: Array<keyof typeof QUOTE.extras>
}

export function quoteTotal(sel: QuoteSelection): { total: number; hasQuoted: boolean } {
  const address = QUOTE.address[sel.address]
  const extras = sel.extras.reduce((sum, key) => sum + QUOTE.extras[key], 0)
  return {
    total: QUOTE.registration[sel.registration] + (address ?? 0) + QUOTE.bank[sel.bank] + extras,
    hasQuoted: address === null,
  }
}
