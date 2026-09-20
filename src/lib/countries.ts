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
