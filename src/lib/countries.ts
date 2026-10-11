/**
 * The countries this business actually serves, first, then the rest.
 *
 * A 250-entry <select> on a phone is a wall; the audience is Gulf, Yemen and
 * the wider MENA region (brief section 2), so those sit at the top in the order
 * enquiries actually arrive in, with a clear separator before everywhere else.
 * Names are stored in both languages because a Saudi importer should not have
 * to read "Saudi Arabia" on an otherwise Arabic form.
 */
export type Country = { code: string; ar: string; en: string }

export const PRIORITY_COUNTRIES: Country[] = [
  { code: 'SA', ar: 'السعودية', en: 'Saudi Arabia' },
  { code: 'YE', ar: 'اليمن', en: 'Yemen' },
  { code: 'AE', ar: 'الإمارات', en: 'United Arab Emirates' },
  { code: 'KW', ar: 'الكويت', en: 'Kuwait' },
  { code: 'QA', ar: 'قطر', en: 'Qatar' },
  { code: 'OM', ar: 'عُمان', en: 'Oman' },
  { code: 'BH', ar: 'البحرين', en: 'Bahrain' },
  { code: 'IQ', ar: 'العراق', en: 'Iraq' },
  { code: 'JO', ar: 'الأردن', en: 'Jordan' },
  { code: 'EG', ar: 'مصر', en: 'Egypt' },
  { code: 'LY', ar: 'ليبيا', en: 'Libya' },
  { code: 'SD', ar: 'السودان', en: 'Sudan' },
  { code: 'MA', ar: 'المغرب', en: 'Morocco' },
  { code: 'DZ', ar: 'الجزائر', en: 'Algeria' },
  { code: 'TN', ar: 'تونس', en: 'Tunisia' },
  { code: 'LB', ar: 'لبنان', en: 'Lebanon' },
  { code: 'SY', ar: 'سوريا', en: 'Syria' },
  { code: 'PS', ar: 'فلسطين', en: 'Palestine' },
  { code: 'MR', ar: 'موريتانيا', en: 'Mauritania' },
  { code: 'SO', ar: 'الصومال', en: 'Somalia' },
  { code: 'DJ', ar: 'جيبوتي', en: 'Djibouti' },
  { code: 'TR', ar: 'تركيا', en: 'Türkiye' },
]

export const OTHER_COUNTRIES: Country[] = [
  { code: 'CN', ar: 'الصين', en: 'China' },
  { code: 'IN', ar: 'الهند', en: 'India' },
  { code: 'PK', ar: 'باكستان', en: 'Pakistan' },
  { code: 'ID', ar: 'إندونيسيا', en: 'Indonesia' },
  { code: 'MY', ar: 'ماليزيا', en: 'Malaysia' },
  { code: 'NG', ar: 'نيجيريا', en: 'Nigeria' },
  { code: 'KE', ar: 'كينيا', en: 'Kenya' },
  { code: 'ET', ar: 'إثيوبيا', en: 'Ethiopia' },
  { code: 'ZA', ar: 'جنوب أفريقيا', en: 'South Africa' },
  { code: 'GB', ar: 'المملكة المتحدة', en: 'United Kingdom' },
  { code: 'US', ar: 'الولايات المتحدة', en: 'United States' },
  { code: 'CA', ar: 'كندا', en: 'Canada' },
  { code: 'DE', ar: 'ألمانيا', en: 'Germany' },
  { code: 'FR', ar: 'فرنسا', en: 'France' },
  { code: 'ES', ar: 'إسبانيا', en: 'Spain' },
  { code: 'IT', ar: 'إيطاليا', en: 'Italy' },
  { code: 'NL', ar: 'هولندا', en: 'Netherlands' },
  { code: 'SE', ar: 'السويد', en: 'Sweden' },
  { code: 'AU', ar: 'أستراليا', en: 'Australia' },
  { code: 'BR', ar: 'البرازيل', en: 'Brazil' },
  { code: 'OTHER', ar: 'دولة أخرى', en: 'Another country' },
]

export function countryName(country: Country, locale: 'ar' | 'en'): string {
  return locale === 'ar' ? country.ar : country.en
}

/** The "another country" choice, offered whenever a search finds nothing better. */
export const ANOTHER_COUNTRY = OTHER_COUNTRIES.find((country) => country.code === 'OTHER')!

/** Other names people type for a country, beyond its Arabic and English names. */
const ALIASES: Record<string, string[]> = {
  SA: ['KSA', 'المملكة'],
  AE: ['UAE', 'Emirates', 'دبي', 'Dubai'],
  US: ['USA', 'America', 'أمريكا'],
  GB: ['UK', 'Britain', 'England', 'بريطانيا'],
  TR: ['Turkey'],
  PS: ['Palestinian'],
}

/**
 * Folds the differences people do not type: case, Latin accents (Türkiye),
 * Arabic diacritics and tatweel, the hamza forms of alif, taa marbuta and
 * alif maqsura. So "اليمن", "يمن" and "Yemen" all find Yemen.
 */
export function normalizeCountryText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Countries whose Arabic name, English name or a common alias contains the
 * query, in either language whatever the page language. Names that start
 * with the query come first; otherwise the list keeps its usual order.
 */
export function searchCountries(query: string): Country[] {
  const q = normalizeCountryText(query)
  if (!q) return [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES]
  const ranked: Array<{ country: Country; rank: number }> = []
  for (const country of [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES]) {
    const names = [country.ar, country.en, ...(ALIASES[country.code] ?? [])].map(
      normalizeCountryText,
    )
    const starts = names.some(
      (name) => name.startsWith(q) || name.startsWith(`ال${q}`) || name.includes(` ${q}`),
    )
    if (starts) ranked.push({ country, rank: 0 })
    else if (names.some((name) => name.includes(q))) ranked.push({ country, rank: 1 })
  }
  return ranked.sort((a, b) => a.rank - b.rank).map((entry) => entry.country)
}
