/**
 * "Is this topic already covered?" — the question the research job must
 * answer before it queues anything, in a language where the same phrase can
 * be written five ways. Tokens are normalised (Arabic diacritics and letter
 * variants folded, the definite article stripped, stop words dropped) and
 * compared as sets.
 */
const ARABIC_STOP = new Set([
  'من',
  'في',
  'على',
  'الى',
  'إلى',
  'عن',
  'ما',
  'ماذا',
  'هي',
  'هو',
  'كيف',
  'كم',
  'هل',
  'و',
  'أو',
  'او',
  'مع',
  'بين',
  'لل',
  'ثم',
  'دليل',
  'الدليل',
  'كامل',
  'الكامل',
  'شامل',
  'بالتفصيل',
  'خطوات',
  'خطوة',
  'أهم',
  'اهم',
  'افضل',
  'أفضل',
  'عبر',
  'حول',
  'لك',
  'التي',
  'الذي',
  'هذا',
  'هذه',
  'ذلك',
  '2024',
  '2025',
  '2026',
  '2027',
])

const ENGLISH_STOP = new Set([
  'the',
  'a',
  'an',
  'to',
  'of',
  'in',
  'for',
  'from',
  'how',
  'what',
  'is',
  'are',
  'and',
  'or',
  'with',
  'your',
  'you',
  'on',
  'vs',
  'versus',
  'guide',
  'complete',
  'full',
  'step',
  'steps',
  'by',
  'do',
  'does',
  'it',
  'at',
  'as',
  'be',
  'can',
  'should',
  'that',
  'this',
  'why',
  'when',
  'which',
  'best',
  'top',
  '2024',
  '2025',
  '2026',
  '2027',
])

/** Stop words in the same normalised form the tokens take, so "إلى" meets "الي". */
const STOP = new Set(
  [...ARABIC_STOP, ...ENGLISH_STOP].map((word) => normaliseArabic(word.toLowerCase())),
)

export function normaliseArabic(text: string): string {
  return text
    .replace(/[ً-ْٰـ]/g, '') // harakat, superscript alef, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
}

export function tokens(text: string): Set<string> {
  const cleaned = normaliseArabic(text.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const out = new Set<string>()
  for (let token of cleaned) {
    if (STOP.has(token)) continue
    // Definite article and the common prefixes that glue to it (و، ب، ل، ك),
    // plus "لل" (ل + ال contracted).
    token = token.replace(/^(و|ف)?(ب|ل|ك)?ال(?=\p{L}{3,})/u, '')
    token = token.replace(/^(و|ف)?لل(?=\p{L}{3,})/u, '')
    if (token.length < 2) continue
    if (STOP.has(token)) continue
    out.add(token)
  }
  return out
}

/** Jaccard similarity of the two texts' token sets, 0 to 1. */
export function similarity(a: string, b: string): number {
  const left = tokens(a)
  const right = tokens(b)
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const token of left) if (right.has(token)) shared++
  return shared / (left.size + right.size - shared)
}

/**
 * True when the candidate says the same thing as something already covered.
 * The threshold is deliberately low: two titles sharing 55 percent of their
 * content words are the same article to a search engine, whatever the rest says.
 */
export function isCovered(
  candidate: string,
  existing: Iterable<string>,
  threshold = 0.55,
): boolean {
  for (const other of existing) {
    if (similarity(candidate, other) >= threshold) return true
  }
  return false
}

/** The closest existing text, for the report. */
export function closest(
  candidate: string,
  existing: Iterable<string>,
): { text: string; score: number } | null {
  let best: { text: string; score: number } | null = null
  for (const other of existing) {
    const score = similarity(candidate, other)
    if (!best || score > best.score) best = { text: other, score }
  }
  return best
}
