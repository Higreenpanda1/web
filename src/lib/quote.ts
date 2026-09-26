/**
 * The company-registration price table behind the instant estimate on the
 * company-formation page. Whole yuan, from the owner's price list
 * "PRICE LIST HiGP.pdf" (Google Drive, 25 September 2026), which replaced the
 * quotation-system sheet of 23 September. `null` means "quoted separately" —
 * a physical office depends on the space.
 *
 * Numbers only; every label comes from `estimator.*` in the message
 * catalogues. Change a price here and the estimate, its note and the seed's
 * "from" prices should move together — the seed is the source for the latter,
 * so update src/seed/content.ts and catalogue.ts in the same change.
 */
export const QUOTE = {
  cities: ['shenzhen', 'guangzhou', 'shanghai', 'yiwu', 'hongkong'] as const,
  // In person is the cheaper route on the 2026 list; remote registration
  // carries the cost of legalising the documents abroad.
  registration: { inPerson: 7200, remote: 8200 } as const,
  address: { basic: 3200, residence: 12000, physical: null } as const,
  // One mainland price for yuan and foreign-currency accounts; the Hong Kong
  // account needs a Hong Kong company.
  bank: { none: 0, mainland: 1400, hongkong: 1700 } as const,
  // The work permit figure is the service fee; the ¥400 government fee is
  // itemised in the quote (list total ¥8,000).
  extras: { accounting: 3800, workPermit: 7600 } as const,
  workPermitGovernmentFee: 400,
  /**
   * Hong Kong is a different product: one all-in price that already includes
   * the registered address and the accounting, so the mainland choices do not
   * apply. The estimator switches to this block when the city is Hong Kong.
   */
  hongkong: { company: 8900, bank: 1700 } as const,
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

export function isHongKong(sel: Pick<QuoteSelection, 'city'>): boolean {
  return sel.city === 'hongkong'
}

export function quoteTotal(sel: QuoteSelection): { total: number; hasQuoted: boolean } {
  if (isHongKong(sel)) {
    return {
      total: QUOTE.hongkong.company + (sel.bank === 'none' ? 0 : QUOTE.hongkong.bank),
      hasQuoted: false,
    }
  }
  const address = QUOTE.address[sel.address]
  const extras = sel.extras.reduce((sum, key) => sum + QUOTE.extras[key], 0)
  return {
    total: QUOTE.registration[sel.registration] + (address ?? 0) + QUOTE.bank[sel.bank] + extras,
    hasQuoted: address === null,
  }
}
