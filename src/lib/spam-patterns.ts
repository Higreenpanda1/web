/**
 * The old site was injected with Indonesian gambling spam in July 2026 and
 * those URLs are still in Google's index (brief section 8). A 404 tells a
 * crawler "not right now"; a 410 tells it "this is gone, drop it", and Google
 * acts on a 410 considerably faster. Everything matching here is answered 410.
 *
 * These are shapes, not a list: the injected pages were generated, so the exact
 * paths are unknowable. Anything Search Console later reports that these miss
 * can be added to the Redirects collection as a 410 by the client, with no
 * deploy.
 *
 * The matching is deliberately in two tiers. A wrongly-410'd page is worse than
 * a missed one — it permanently removes a real page from search — so only terms
 * that cannot plausibly appear in a China-trade blog fire on their own. Words
 * like "slot", "casino" or "online" are ambiguous (slotting fees, landed cost
 * articles, "start your online store") and need a second signal before the path
 * is called spam.
 */

/** Requested by scanners and by stale index entries for the WordPress install
 *  that no longer exists. None of these can be a page on this site. */
const DEAD_SURFACE_PATTERNS: RegExp[] = [
  /^\/wp-(?:admin|login|content|includes|json|cron|config|signup|comments-post)/i,
  /^\/xmlrpc\.php$/i,
  /^\/(?:wordpress|blog\/wp-admin|old|cms)(?:\/|$)/i,
  /\.(?:php|phtml|php[3-8]|asp|aspx|jsp|cgi|pl|sh|bak|sql|env|ini|conf)$/i,
  /^\/(?:\.env|\.git|\.aws|\.ssh|\.vscode|vendor|node_modules)(?:\/|$)/i,
  /^\/(?:config\.json|dump|backup|shell|adminer|phpmyadmin)(?:\/|$)/i,
]

/** Indonesian gambling vocabulary with no plausible legitimate use on a site
 *  about importing from China. One of these is enough. */
const UNAMBIGUOUS_SPAM_TERMS = [
  'judi',
  'togel',
  'gacor',
  'maxwin',
  'sbobet',
  'joker123',
  'pkv',
  'dominoqq',
  'bandarqq',
  'situs',
  'bandar',
  'slot88',
  'slot-?gacor',
  'idn-?play',
  'pragmatic-?play',
  'link-?alternatif',
  'deposit-?pulsa',
  'terpercaya',
  'gampang-?menang',
] as const

/** Words that appear in gambling spam but also in ordinary copy. Two or more
 *  of these in one path is the signal; one on its own is not. */
const AMBIGUOUS_SPAM_TERMS = [
  'slot',
  'casino',
  'poker',
  'toto',
  'rtp',
  'jackpot',
  'betting',
  'daftar',
  'resmi',
  'thailand',
  'gacor',
  'live-?draw',
] as const

const UNAMBIGUOUS_RE = new RegExp(
  `(?:^|[\\/_-])(?:${UNAMBIGUOUS_SPAM_TERMS.join('|')})(?:[\\/_-]|$)`,
  'i',
)

const AMBIGUOUS_RES = AMBIGUOUS_SPAM_TERMS.map(
  (term) => new RegExp(`(?:^|[\\/_-])(?:${term})(?:[\\/_-]|$)`, 'i'),
)

export function isInjectedSpamPath(pathname: string): boolean {
  // Normalise away the locale prefix so /en/slot-gacor is caught as well.
  const path = (pathname.replace(/^\/en(?=\/|$)/, '') || '/').replace(/\/+$/, '') || '/'
  if (path === '/') return false

  if (DEAD_SURFACE_PATTERNS.some((pattern) => pattern.test(path))) return true
  if (UNAMBIGUOUS_RE.test(path)) return true

  const ambiguousHits = AMBIGUOUS_RES.reduce(
    (count, pattern) => count + (pattern.test(path) ? 1 : 0),
    0,
  )
  return ambiguousHits >= 2
}

export const __testing = { DEAD_SURFACE_PATTERNS, UNAMBIGUOUS_RE, AMBIGUOUS_RES }
