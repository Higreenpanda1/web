# HiGreenPanda

The website for **HiGreen Panda Marketing** (هاي جرين باندا للتسويق) — a
China-based trade services company serving Arabic-speaking traders.

Arabic-first and bilingual, with a CMS the client edits themselves, built to
replace a WordPress site that was taken over and injected with spam.

- **Content and brand:** [`WEBSITE-BRIEF.md`](./WEBSITE-BRIEF.md) — positioning,
  the services, the founder, the colour and type systems. Authoritative.
- **Original instructions:** [`BUILD-PROMPT.md`](./BUILD-PROMPT.md)
- **Deployment:** [`DEPLOY.md`](./DEPLOY.md) — provisioning, bringing the stack
  up, DNS, backups and the restore drill.

---

## Running it locally

Needs Node 22 and either Docker or a local PostgreSQL 16.

```bash
cp .env.example .env         # then fill in PAYLOAD_SECRET and POSTGRES_PASSWORD
docker compose up -d db      # or point DATABASE_URI at your own Postgres
npm install
npm run migrate
npm run seed                 # services, founder, 12 categories, 112 recovered articles, redirects, an admin user
npm run dev
```

- Arabic site: <http://localhost:3000>
- English site: <http://localhost:3000/en>
- CMS: <http://localhost:3000/hgp-studio> (via the sign-in gate)

`openssl rand -base64 32` generates a secret. Never commit `.env`.

### Checks

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # 57 unit tests: TOTP, rate limiter, form guard, spam patterns, Lexical helpers
npm run build && npm start
npm run test:e2e      # Chromium: routes, RTL, type scale, the form, CSP, keyboard
npm run test:admin    # the 2FA gate — needs real credentials, see the file header
```

### The blog jobs

```bash
npm run posts:distribute -- --dry-run   # what would be announced (IndexNow, Metricool)
npm run posts:enrich -- 3               # takeaways + questions for 3 articles (needs ANTHROPIC_API_KEY)
npm run posts:translate                 # English draft for one Arabic-only article
npm run posts:research -- --dry-run     # weekly market research: the report, nothing queued
npm run posts:research                  # …and queue the topics it chose (needs ANTHROPIC_API_KEY)
npm run posts:draft -- --dry-run        # write the next article and print its quality report
npm run posts:draft -- 2                # write two articles from the queue
npm run posts:digest -- --dry-run       # the weekly owner email, printed
npm run posts:plan-pack                 # no API: the research brief for a person or a Claude session
npm run posts:write-packs               # no API: writing briefs from .plan/topics.json
npm run posts:write-apply               # no API: validate .write/out/*.json into src/seed/wp/posts.json
npm run seo:indexnow                    # submit every live URL to IndexNow once
```

In production the same jobs run on a timer inside the app
(`src/instrumentation.ts`): research on Saturday night, articles on Sunday,
Tuesday and Thursday, all China time; see DEPLOY.md §8b for the switches,
including `BLOG_AUTOPUBLISH`.

`npm run test:e2e` needs a server already running. It drives a real browser at
phone width: 23 routes for the status they should return, then the Arabic type
scale, RTL layout, the language switcher, an enquiry reaching the database, the
keyboard entry point, dark mode, and whether the strict CSP blocks anything.

`npm run test:admin` checks that the admin panel is actually protected — that
`/hgp-studio` redirects when signed out, `/admin` is not a route, a
password-only REST login is refused, a wrong code is refused, a right one is
not, and a backup code works exactly once. It needs a real enrolled secret and
password, so it is run by hand rather than in CI; see the header of
`tests/admin-gate.mjs`.

---

## How it is put together

| Layer     | Choice                                                               |
| --------- | -------------------------------------------------------------------- |
| Framework | Next.js 15 (App Router, TypeScript strict)                           |
| CMS       | Payload 3, installed into the same app                               |
| Database  | PostgreSQL 16, migrations checked in                                 |
| Styling   | Tailwind CSS 4 reading brand tokens from CSS custom properties       |
| Hosting   | Hostinger KVM 2 VPS, Docker Compose, Caddy for TLS                   |
| Email     | Resend — form notifications must not depend on the domain's own mail |
| Analytics | Plausible or Umami, self-hosted, no cookies                          |

```
src/
  app/
    (frontend)/[locale]/   the public site — one route tree, both languages
    (frontend)/gone/       410 Gone for the spam URLs still in Google's index
    (gate)/                the two-factor sign-in gate
    (payload)/             the admin panel and REST API
    actions/enquiry.ts     the only way an enquiry is created
  blocks/                  page builder blocks (CMS side)
  collections/             Payload collections
  components/blocks/       one component per block (render side)
  i18n/                    routing, navigation, number and date formatting
  lib/                     queries, SEO, security headers, TOTP, rate limiting
  messages/                ar.json and en.json — Arabic written first
  migrations/              generated, checked in, applied explicitly
  seed/                    content from the brief
  styles/tokens.css        the single source of truth for colour and type
```

---

## Decisions worth knowing

**Arabic is the site, not a translation.** Arabic lives at `/` with no prefix,
English at `/en`. `dir` and `lang` on `<html>` are the entire RTL system:
every component uses CSS logical properties, so there is no RTL override
stylesheet and nothing branches on direction. Slugs are shared between
languages, which is what lets the language switcher stay on the equivalent page
instead of bouncing home.

**The contrast rule is in the token names.** `--brand-600` `#378D42` is the
logo green and scores 4.16:1 on white, which fails WCAG AA for normal text.
`--text-brand` therefore resolves to `--brand-700` `#276B34` (6.48:1) and the
600 is reserved for the logo, large headings and colour fields. The browser
test asserts this rather than trusting it.

**Arabic type steps up one size with line-height 1.9**, driven by
`:root:lang(ar)` in `tokens.css`. Headings are fluid — exactly the brief's
sizes at 1280px, scaling down on a phone, because 56px of heading fills an
entire 390px screen.

**Two weights per language, no font preload.** Fonts were 189 KiB and were
blocking first paint; text now renders immediately in a metric-adjusted
fallback and swaps. First load carries 38 KiB of fonts.

**The enquiry form stores first and emails second.** An email failure never
fails the request: a provider outage or an expired API key should cost a
notification, never a lead. Three server-side guards instead of a CAPTCHA:
a honeypot, an HMAC-signed timing token, and a per-network rate limit. A
CAPTCHA would cost this audience half a megabyte over 4G and lock out anyone
using a screen reader.

**`create` is closed on the Enquiries collection.** Submissions come through a
server action using Payload's local API, which bypasses access control on
purpose, so `POST /api/enquiries` stays shut to the internet.

**The admin is at `/hgp-studio` behind a TOTP gate.** `/admin` returns 404.
The second factor is enforced in `Users.beforeLogin`, not in the UI, so
`POST /api/users/login` is closed to a password-only attacker too. TOTP is
implemented on `node:crypto` and verified against the RFC 6238 vectors — an
auth primitive is the worst place to add a dependency nobody audits.

**Injected spam paths answer 410, not 404.** Google drops a 410 far faster,
and those URLs are still indexed from the July compromise. Matching is
two-tier: a word like "slot" or "casino" needs a second signal before a path
is called spam, because wrongly removing a real page is worse than missing a
fake one. Anything the patterns miss can be added in the CMS as a 410 with no
deploy.

**Every page renders dynamically.** A nonce-based CSP and static prerendering
are mutually exclusive — a nonce baked into static HTML is not a nonce. Every
database read goes through `unstable_cache`, so a dynamic render is a React
render against warm data, not a round trip. `script-src` keeps its nonce and
`strict-dynamic`; `style-src` allows inline, because a CSP nonce cannot cover
`style="..."` attributes at all and React, next/font and Payload all emit them.

**Phase 2 is unblocked, not built.** `Customers` is a separate auth collection
with a `role`, and `Enquiries` already carries `status`, `assignedTo` and a
`customer` relation. See DEPLOY.md §10.

### Where this differs from the brief

- **Next 15.4.11 specifically.** `@payloadcms/next@3.90.1` excludes the 15.5
  line from its peer range, so 15.4.11 is the only Next 15 release it accepts.
- **Two font weights, not three.** The brief's scale asks for 600 on H2 and H3
  and also says two weights per language is enough. The 600 files cost 67 KiB;
  on this audience's connection that is worse than a heading one step heavier.
- **Headings are fluid rather than fixed.** The brief's sizes are a desktop
  scale and are reached exactly at 1280px.
- **Trade-fair accompaniment is a ninth service.** Brief §4 proposes it and
  marks it `[confirm]`; the client confirmed on 20 September 2026 that they
  offer it. The founder's 100+ fairs make it credible and Arabic-speaking
  buyers search for it, but it was never a listed service before.

---

## Measured

Lighthouse, simulated mobile, production build:

| Page                                            | Performance | Accessibility | Best Practices | SEO |
| ----------------------------------------------- | ----------: | ------------: | -------------: | --: |
| `/` (Arabic home)                               |          98 |           100 |            100 | 100 |
| `/en` (English home)                            |          97 |           100 |            100 | 100 |
| `/contact`                                      |          99 |           100 |            100 | 100 |
| `/services`                                     |          98 |           100 |            100 | 100 |
| `/services/full-import-management`              |          99 |           100 |            100 | 100 |
| `/blog`                                         |          98 |           100 |            100 | 100 |
| `/blog/how-to-inspect-a-factory-before-you-pay` |          99 |           100 |            100 | 100 |
| `/about`                                        |          98 |           100 |            100 | 100 |

LCP 2.0–2.5 s, TBT 40–70 ms, CLS 0–0.007.

Run it yourself against a production build:

```bash
npm run build && npm start
npx lighthouse http://127.0.0.1:3000/ --form-factor=mobile --screenEmulation.mobile --view
```

Scores vary a point or two between runs. These were taken on the production
build with `NEXT_PUBLIC_SERVER_URL` matching the host being served, which
matters: a canonical URL pointing at a different origin fails the SEO audit.

Also verified in a browser against the production build: RTL layout with no
horizontal overflow at 390px, the language switcher staying on the page, an
enquiry reaching Postgres, the skip link first in the tab order, `410` on
injected paths, dark mode, and zero CSP violations on both the public site and
the admin panel.

And the brief's own definition of success: signing in through the two-factor
gate, editing an Arabic service page in the CMS, publishing it, and seeing the
change live on the public Arabic page — with the English translation
untouched.

---

## The brand

`brand-assets/` holds the full logo set, built from **vector masters**:

- `vector/logo-wordmark.svg` — the HiGP wordmark, traced from the original
  artwork with the hand-cut letterforms preserved exactly, plus `-white`
  (for green and dark panels) and `-mono-black` / `-mono-white`.
- `vector/icon-play.svg` (knockout, light backgrounds) and
  `icon-play-white.svg` (solid, dark backgrounds) — the play mark on its own.

`node scripts/brand/build.mjs` regenerates everything else — web PNGs,
favicons and app icons, the 1200 × 630 link-preview cards with the Arabic and
English taglines, social avatars and banners, print sizes — from those masters
using `sharp`, which the site already depends on. No ImageMagick, no Python.
`scripts/brand/wordmark.json` is the traced geometry and
`scripts/brand/taglines.json` the tagline outlines (shaped from the site's own
Plex fonts, so the cards match the site).

`src/components/layout/Logo.tsx` renders the same geometry inline
(`wordmark-geometry.ts` is generated by the build script) and takes a required
`onDark` decision at every call site: on a light surface the play triangle is a
knockout, on a dark one it is painted white, because a knockout on green
vanishes. See the note at the top of that file before touching it.
