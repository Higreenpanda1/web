# Handover — HiGreenPanda website

Written 20 September 2026, at the end of the session that deployed the site,
updated the same day after the front-end redesign, on 23 September 2026 after
go-live and the service catalogue, on 24 September 2026 after the blog, and on
25 September 2026 after the price list and the founder's CV. Everything below
is verified state, not intention. Where something is unfinished it says so.

---

## Where things stand

The site is **live on https://higreenpanda.com** since 21 September 2026. DNS
was cut over at GoDaddy (root `A` → `187.77.153.108`; the rollback values are
`15.197.148.33` and `3.33.130.190`, `www` is a CNAME). The preview hostname
was switched off on 23 September, so `srv1994320.hstgr.cloud` no longer
answers — which also closes the gap where the admin IP allowlist applied only
on the real domain.

- **Site:** https://higreenpanda.com (Arabic) · https://higreenpanda.com/en
- **CMS:** https://higreenpanda.com/hgp-studio-gate
- **Repository:** `Higreenpanda1/web`, branch `claude/practical-newton-m55sbw`

## The blog (24 September 2026, fourth session)

The owner asked for the blog to be the traffic engine: "robust traffic, fully
optimised, automated, top-notch SEO, GEO, AEO". This session did three things.

**1. The old blog is back.** The Hostinger backup the owner supplied
(`u530724501…sql.gz` and the `tar.gz`) held 214 published WordPress articles —
the brief assumed they were lost. They were extracted, paired into 112
bilingual documents (100 with both languages, 12 Arabic-only), converted from
Gutenberg HTML to Lexical, given their Yoast descriptions, their covers
(re-encoded to WebP, 16 MB in `src/seed/wp/media/`) and Latin slugs, and sorted
into twelve categories. Every old URL — the percent-encoded Arabic ones
included — 301s to the new article; the middleware now decodes paths before
matching. Two video-only posts arrive as drafts. The data is
`src/seed/wp/posts.json`; `npm run seed` imports it idempotently (a hash per
article; unchanged articles are skipped, an editor's edits are never
overwritten unless the source changes). The generator script is not in the
repository — the JSON is the source of truth.

**2. The SEO / GEO / AEO layer.** On every article: a key-takeaways box and a
questions-and-answers section (fields on Posts, rendered and emitted as
`FAQPage`), a table of contents from the headings (which now carry ids), an
author card, share links, older/newer navigation, related articles by category,
"updated on". Structured data: `BlogPosting` with author as a `Person` carrying
the founder's profiles, `wordCount`, `articleSection`, `speakable`, and the
Arabic↔English `workTranslation` link; `CollectionPage` on the index and the
twelve category pages (`/blog/category/<slug>`). `hreflang` and the sitemap
honour `localesAvailable`, so an Arabic-only article never advertises an
English page (and `/en/blog/<slug>` answers 404 for it instead of showing
Arabic). RSS at `/feed.xml` and `/en/feed.xml`; `/llms.txt` and
`/llms-full.txt` for AI crawlers; `robots.txt` names and allows the AI
crawlers. Sitemap entries carry the cover image. Page 2+ of any list is
`noindex, follow`.

**3. Automation, all opt-in by `.env` (DEPLOY.md §8b).** A scheduler in
`src/instrumentation.ts` runs inside the `app` container. Every ten minutes it
announces articles that have gone live — including ones scheduled with a future
publish date — by dropping the cache, submitting to IndexNow (`INDEXNOW_KEY`)
and scheduling a social post per network through Metricool
(`METRICOOL_TOKEN`; brand 6019177, user 4648321, Asia/Shanghai). Nightly, with
`ANTHROPIC_API_KEY`, Claude writes takeaways and questions for three articles
lacking them, drafts the English of one Arabic-only article, and on Mondays
writes one bilingual draft from the **Content queue** collection (24 topics
seeded from what this audience searches for). Drafts are never published by
the machine. `npm run posts:*` and `npm run seo:indexnow` run the same jobs by
hand (`src/scripts/automation.ts`).

Migration `20260924_043615_blog_seo_automation` adds the fields and the
`topics` table. Verified locally against Postgres 16: typecheck, lint,
prettier, 57 unit tests, the seed (all 112 articles), and every blog route in
both languages; see the commit message for what was not verified on the server.

Not done, worth doing next: put the twelve categories in the header or footer
navigation; get `INDEXNOW_KEY`, `METRICOOL_TOKEN` and `ANTHROPIC_API_KEY` from
the owner and set them; verify the site in Bing Webmaster Tools; translate the
12 Arabic-only articles (the nightly job will do one a day once the key is
set); Semrush had no API units left this session, so no keyword volumes were
checked — the content queue is built from what customers ask, not from data.

## The price list and the founder's CV (25 September 2026) — NOT deployed

The owner sent two files on Google Drive: `PRICE LIST HiGP.pdf` (company
formation, work permit, Hong Kong, accounts — dated 25 September, it
supersedes the quotation-system sheet of 23 September) and the CV
`sami cv 2023-2-8_merged.pdf`, and asked for both on the site. Branch
`claude/confident-ramanujan-9qnpiz`.

**Prices, everywhere they appear.** `src/lib/quote.ts` (the estimator) and
the seed (`src/seed/content.ts`, `src/seed/catalogue.ts`) now carry the
list: company registration in person ¥7,200 / remote ¥8,200 (the list has
in-person cheaper — the reverse of the old sheet); registered address
¥3,200 / ¥12,000 a year (unchanged); accounting ¥3,800 a year (was ¥3,200);
mainland bank account ¥1,400 (one price — the in-person/remote split is
gone), Hong Kong bank account ¥1,700; work permit and residence ¥7,600
service fee + ¥400 government fees = ¥8,000 (was ¥4,600); licence
amendments ¥1,800, Alipay ¥1,700, WeChat Pay ¥2,100 (unchanged). The
estimator's bank choice is now mainland / Hong Kong / none, and the work
permit extra shows "+ ¥400 government fees".

**New service: Hong Kong company formation** (`hong-kong-company-formation`,
order 115, ¥8,900 including registered address and accounting). Choosing
Hong Kong in the estimator replaces the mainland questions with that one
package plus the optional Hong Kong bank account, and "Hong Kong" is now a
city option on the company-registration form. Twenty-one services.

**The work permit page** lists the required documents exactly as the price
list does (employment reference with stamp and translation; degree and
police clearance authenticated by the foreign ministry and legalised by the
Chinese embassy; medical after entry; the photograph specification), and a
FAQ on the government fee.

**The founder.** The bio is the owner's own text (Baowu Steel Group,
Fortune Global 500, the Saudi Aramco joint venture). Ten credentials now,
adding Baowu, Aramco, the HarvardX leadership course, the Jiangsu Government
Scholarship first prize, the three languages and the CCNU Chinese-language
prize. A new `timeline` array on Team members (kind / period / title /
organisation / note, localised) carries the CV — nine entries from founding
HiGreenPanda in 2021 and Baosteel back to CCNU 2015 — and the About page renders it as a vertical
timeline under the founder card (`src/components/about/Timeline.tsx`). The
Person structured data on the About page gains `alumniOf`, `award` and
`affiliation` from it. Migration `20260925_131222_founder_timeline` adds the
table.

Verified locally against Postgres 16: migrate, seed (both locales, prices
checked in the database), typecheck, lint, prettier, 62 unit tests, the
production build, and the About, company-formation, Hong Kong and work
permit pages in both languages. Not verified on the server.

**Answered by the owner the same day:** accounting ¥3,800 is per year;
the Aramco joint venture was between Aramco and Baowu (written under the
Baowu entry); HiGreenPanda was founded in 2021, now the first timeline
entry; no dedicated pricing page — each service shows its own price and
nothing else (the 23 September decision stands).

To deploy: `ops/deploy.sh` with the commit SHA — it migrates and seeds. The
seed updates the founder record and the prices in place (an editor's later
CMS edits to those fields are overwritten by the seed; that is how the seed
has always worked for services and the team).

## Business licences on the About page (25 September 2026, evening)

The owner asked for "our two company licences" on the site. They are in
Google Drive under Trade Photos (found by OCR on 营业执照):
广州海吉鹏国际商务服务有限公司 (credit code 91440106MAK38EQ97M, Sami as
legal representative, 2025-12-26, Tianhe, Guangzhou) and
那社尔电子商贸（上海）有限公司 — Nasher E-Commerce (Shanghai) — (credit code
91310120MADC3UP68E, 2024-02-26, Fengxian, Shanghai). A new **Licences** tab
in Site settings holds them (legal name, Arabic and English names, code,
date, city, photo), and the About page shows them as cards with a link to
gsxt.gov.cn. Migration `20260925_135802_business_licences`.

The seed writes the two entries only when the list is empty, so a photo
replaced in the CMS survives later deploys. The Shanghai photo is seeded
(`src/seed/assets/licence-shanghai.webp`, rotated upright). **The Guangzhou
photo is not**: the Drive file is 6 MB and every download attempt dropped
the Drive connection. Upload it in the CMS (Site settings → Licences →
first row → image). Until then the card shows the details with an icon in
place of the photo.

Local testing note: run the seed with `NODE_ENV=production` against a
migrated database. Without it Payload pushes the schema in dev mode and the
next `npm run migrate` stops at a data-loss prompt. The server always runs
in production mode, so it is not affected.

## The archive rewrite (25 September 2026) — deployed

All 212 article versions (112 Arabic, 100 English) were rewritten as full
guides and deployed at `b433383`. Averages went from 389 to 1,525 words
(Arabic) and 415 to 1,499 (English). Every article has takeaways, 3–6
questions with answers (FAQPage schema), a focus keyword, a meta
description and 4–7 internal links; 1,239 links in total, none broken.
The owner asked for no API spend, so the writing was done by agents in the
editor session through `npm run posts:rewrite-packs` → write JSON →
`npm run posts:rewrite-apply` (validation: schema, length, links, language).
`npm run posts:rewrite-archive` does the same through the API when a key
exists.

Writers corrected plainly wrong or outdated claims (2020 Foreign
Investment Law, CIQ inside GACC since 2018, EXW/FOB caveats, bank-transfer
advice, a South Korea "land route", mistranslated Hainan) and removed
contact blocks and a competitor's promotion. They also added some facts
from general knowledge. **Worth a spot-check by someone who knows the
market**, all phrased with "check the current rule" where it matters:
- mBridge participants and the UAE's January 2024 digital-dirham payment
- visa-free entry for Gulf passports and the 240-hour transit rule
- GCC 5% duty, Saudi 15% / UAE 5% VAT, SABER
- China's CNY 5,000 / 26,000 cross-border e-commerce limits
- 2024 Company Law 5-year capital rule, the 2026 VAT Law, Apostille (Nov 2023)
- the EV article's "533,000 exported in 2014" (kept from the original, looks wrong)

Follow-up the same day, deployed at `5b81fe3` and verified on the live
site: the 12 Arabic-only articles were translated, so all 112 articles are
bilingual (224 versions, 1,128 questions); 155 contextual links were added
so every article has at least one inbound link from another article
(median 3; 1,464 internal links, none broken); the two former drafts were
published (`npm run posts:publish -- <slug>` — the import never publishes
a draft on its own); an English URL for any future Arabic-only article
redirects to /en/blog instead of 404. Tools: `posts:links-packs` /
`posts:links-apply`, `posts:translate-packs`.

Later the same day (`e5f5a3e`): the three hand-written articles that had
lived in `src/seed/content.ts` (import costs, factory inspection, online
store) were missed by the rewrite and were the first thing the owner saw
at the top of the blog. They were moved into the archive, rewritten in
both languages and linked; `POSTS` in content.ts is now empty so a deploy
cannot restore them. The whole blog is 115 articles, 230 versions, and the
live check now reads the visible article text on every page, not only the
structured data. Lesson: verify what a reader sees, starting from the top
of the blog index.

## Where the blog session stopped (24 September 2026)

- **Commit `8fcec67` is pushed and NOT deployed.** It carries the blog import,
  the SEO layer and the automation (section above) plus two lockfile fixes.
  CI: lint, types, 57 tests, migrations and the build pass; the browser job
  fails only on the three pre-existing homepage assertions (Arabic body 19px
  vs 17px, English 17px vs 16px, the 8px overflow at 390px) that have failed
  since the type scale was reduced on 23 September — update `tests/e2e.mjs`
  to the new scale and fix the overflow when convenient.
- **The deploy was not run because the Hostinger web console would not
  wake.** hPanel → VPS → Web console answered "Looks like your server isn't
  responding. Try pressing any key to wake it up, or reboot the VPS" to every
  keypress, while the site itself answered 200. The fix Hostinger offers is a
  forced reboot of the live server, which was not done without the owner.
  To deploy, in the console (or over SSH), one line, run detached so the
  console dropping cannot kill the build:

  ```
  nohup bash -c 'curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/8fcec677e54d98e288e19aa38190298bdd5d221a/ops/deploy.sh | bash' > /root/deploy.log 2>&1 < /dev/null & sleep 1; tail -f /root/deploy.log
  ```

  It keeps `.env`, applies migration `20260924_050126_blog_seo_automation`,
  seeds the 112 articles (several minutes: 130 images through sharp), builds
  and restarts. `.env` needs no change for the site to work; add
  `INDEXNOW_KEY`, `METRICOOL_*` and `ANTHROPIC_API_KEY` later to switch the
  automation on (DEPLOY.md §8b), then restart `app`. After the deploy, run
  `npm run seo:indexnow` through `tools` once a key is set, and check
  https://higreenpanda.com/blog, /en/blog, /feed.xml, /llms.txt and an old
  article URL such as /en/how-to-find-reliable-suppliers-in-china/ (301).

## Where the previous session stopped (night of 23–24 September 2026)

- **Commit `91b0be8` is pushed but NOT deployed.** It is the "green as an
  accent, not a forest" pass: neutral surfaces, charcoal dark mode, ink
  headings, and the richer motion (word-by-word headline, drifting orbs,
  count-up stats, side-sliding journey steps that light up as you scroll).
  The live site still runs `23e4503` (journey homepage, first palette).
  Deploy with the commit-pinned `ops/deploy.sh` URL; run it detached
  (`nohup … < /dev/null &`) because the Hostinger web console drops during
  the build. Then confirm `curl https://higreenpanda.com/en` shows the new
  build and take light + dark screenshots for the owner.
- **admin@higreenpanda.com does not exist yet.** Plan: in the console,
  `read -rs` a password the owner types, then
  `docker compose -f docker-compose.prod.yml run --rm -T -e SEED_ADMIN_EMAIL=admin@higreenpanda.com -e SEED_ADMIN_PASSWORD="$P" tools npm run seed`,
  then `docker compose -f docker-compose.prod.yml run --rm tools npm run totp:enrol -- admin@higreenpanda.com`
  with the owner scanning the QR on their phone. Do not screenshot the QR.
- The owner's brief for the look: "very attractive, UI/UX important, not
  distracting, fonts were too large, too green". Offer a bolder direction
  (imagery, editorial hero) if the quiet one is not enough.
- Both browsers (Claude in Chrome and the built-in pane) were unreachable at
  the end of the session after the Mac slept; that is why the deploy waited.

## The homepage journey (23 September 2026, later the same day)

The owner shared a "Website Structure" document and a design mock (Google
Drive, shared drive `0AIYXQxja0eIeUk9PVA`). The homepage was rebuilt to match:

- **Hero** "From idea to your warehouse" with two quiet buttons (explore the
  journey, book a consultation). Dot grid dimmed; one accent colour.
- **Twelve-step journey** (`src/components/home/Journey.tsx`): the owner's
  roadmap — idea, research, trademark, company, structure and residence,
  accounting, supplier, production and quality, shipping, customs, local
  delivery, your warehouse. Each step expands and links to the service that
  does it (`JOURNEY_LINKS` in `DefaultHome.tsx`). Step text lives under
  `home.journeySteps.*` in both catalogues.
- **Consultation offer** with the owner's prices: 30 minutes $135, 60 minutes
  $225 (`home.consult*`). The consultation form now asks which one.
- **Type scale down one step** in `tokens.css` (body 16px English / 17px
  Arabic; display at most 52/56px). The owner found the previous sizes large.
- **Motion**: `ScrollReveal` (one IntersectionObserver per page) reveals any
  element with `data-reveal`; the journey's spine draws as you scroll. Both
  are off under `prefers-reduced-motion`, and nothing is hidden without JS.
- **Cost estimator** on the company-formation page
  (`src/components/services/CostEstimator.tsx`, prices in `src/lib/quote.ts`,
  from the owner's quotation-system sheet). Its choices carry into
  `/apply/company-registration` as query parameters the form pre-fills.
  The sheet also asked for admin-editable prices and for saving abandoned
  estimates as leads; neither is done — prices are a code constant for now,
  and a half-filled estimate is not consent to be contacted.
- **Prices aligned to the quotation sheet** (it is newer than the 2025 list
  and was written for the site): registration from ¥6,000, bank account from
  ¥1,200, accounting from ¥3,200, work permit from ¥4,600. The owner has not
  explicitly confirmed; if they prefer the 2025 list, change `priceFrom` in
  the CMS and `src/lib/quote.ts`.
- Header CTA is **Start a company** (`/apply/company-registration`);
  **Consultation** is in the primary navigation (seeded and fallback).
- Not done from the documents: the "Insights" rename of the blog, the twelve
  blog categories, online payment for consultations, and a date/time picker
  (the owner chose a request form over live booking).

## The service catalogue (23 September 2026, third session)

The owner supplied the old WordPress site's backup (`u530724501…tar.gz` and
the `.sql.gz` dump) and the 2025 price list. Eleven services that existed on
the old site but not the new one were added, and the request forms the old
site ran through seventeen form plugins were rebuilt as one system.

- **Twenty services in six categories.** `category` on the Services
  collection groups the index page (`/services#visas` etc.), the footer and
  the homepage tiles. The eleven new ones live in `src/seed/catalogue.ts`;
  the nine originals stay in `src/seed/content.ts`. Categories, icons,
  application types and price units are defined once in
  `src/lib/catalogue.ts` and everything else derives from it.
- **"From" prices.** `priceFrom` (whole yuan) and `priceUnit` on each
  service, from the price list. Shown on cards, the page hero, the sidebar and
  in the JSON-LD `offers`. Editors change them in the CMS; the quote confirms
  the final figure. The owner chose to show starting prices, not a full table.
- **Application forms** at `/apply/<type>` for nine request types —
  consultation, company registration, M-visa invitation, visa, product
  search, shipping quote, account opening, store setup, trademark. One
  client component (`src/components/forms/ApplicationForm.tsx`) renders
  whatever `src/forms/definitions.ts` describes: stepped once JavaScript
  runs, all-at-once before it. Validation is derived from the same
  definitions (`src/forms/schema.ts`), so the page and the server can never
  disagree. Submissions go to the new **Applications** collection (Leads
  group in the CMS) with the answers as JSON, and are emailed like enquiries.
  References are `HGA-…`; enquiries stay `HGP-…`.
- **No file uploads, by the owner's decision.** Passports and licences are
  requested by email or WhatsApp after review. Do not add an upload field
  without revisiting that decision — it puts identity documents on this
  server.
- A service with an `applicationType` leads with "Start your application";
  one without keeps the general enquiry form, now pre-selected to the
  service. `/contact?service=<slug>` pre-selects too.
- `src/forms/definitions.test.ts` fails the build if any label, hint or
  option a form uses is missing from either language, and if the two message
  catalogues ever differ in keys. That test is the reason the Arabic can be
  trusted.
- Also this session: the dark-mode readability bug (seventeen places used
  fixed light-mode greens on dark surfaces) was fixed, and `ops/preview.sh`
  now restarts only Caddy (`--no-deps`), because app loads the whole `.env`
  and used to be recreated too.

Deploying this needs the migration and the seed:
`20260923_073515_add_catalogue_and_applications` adds the columns, the enum
values and the `applications` table; the seed writes the eleven services and
the new fields on the nine. `ops/deploy.sh` does both.

## The redesign (20 September 2026, second session)

The owner's verdict on the first build was that it looked like "90s HTML
blocks" with no logo. The second session replaced the front end; the CMS,
data model, migrations, security headers, i18n and routing are untouched, so
nothing about deployment changes.

- **The logo is now real and vector.** `src/components/layout/Logo.tsx`
  renders the HiGP wordmark inline from traced geometry; the same data
  produces `brand-assets/vector/logo-wordmark*.svg` and every PNG, favicon,
  app icon and social card via `node scripts/brand/build.mjs` (see README).
  The letterforms are intentionally hand-cut and were not "corrected".
- **A design system**, not a theme: `src/styles/tokens.css` (elevation,
  gradients, radii, the dot-grid motif) and `src/components/ui/` (Button,
  Card, Section/SectionHeading, Eyebrow, Breadcrumb, PageHero, Accordion).
  The homepage sections live in `src/components/home/` and the CMS blocks in
  `src/components/blocks/` render through those same components, so a page
  built in the CMS looks like the default homepage.
- **The Arabic font was never loading.** next/font appended its generic
  fallbacks to the Latin font variable, so `sans-serif` sat ahead of the
  Arabic face in the stack and the Arabic site rendered in a system font.
  Fixed in `src/lib/fonts.ts`; the comment there explains why the font stack
  order is load-bearing. Do not add `fallback` lists back.
- Reference points the owner asked for: Deloitte (black / white / one green,
  and the green dot as a device — the play disc is used the same way),
  BCG (green brand, service grids, dark statement bands), McKinsey and Bain
  (editorial type and whitespace).

Also fixed the same day: **uploaded images never rendered.** `next.config.ts`
keeps `images.remotePatterns` empty on purpose, but every `<Image>` was
given the absolute media URL, which the optimiser refuses ("url parameter is
not allowed"). Components now use `mediaSrc()` (same-origin path);
`mediaUrl()` stays for Open Graph and structured data only.

The founder's portrait is seeded from `src/seed/assets/founder-sami.jpg`
(uploaded once, matched by its alt text on re-runs, and replaceable in the
CMS). The four social networks connected in Metricool — Instagram, YouTube,
TikTok, Facebook — are seeded into Site settings and shown in the footer.

## The person you are working with

They do not use a terminal and should not be asked to. They reach the server
only through **hPanel → VPS → Browser terminal**, where they are logged in as
`root` already.

That means: give one command per message, as a single line they can copy and
paste, and read the output back for them. Do not hand them a block of five
commands. Do not ask them to edit a file with `nano` or `vim`.

Content edits do not need a terminal at all — those happen in the CMS, in a
browser.

## The server

|               |                                                                   |
| ------------- | ----------------------------------------------------------------- |
| Host          | Hostinger KVM 2 — 2 vCPU, 8 GB RAM, 100 GB NVMe                   |
| Address       | `187.77.153.108`                                                  |
| Hostname      | `srv1994320.hstgr.cloud` (real A and AAAA records, points here)   |
| OS            | Ubuntu 26.04.1 LTS                                                |
| App directory | `/home/deploy/higreenpanda`                                       |
| Compose file  | `docker-compose.prod.yml`                                         |
| Containers    | `db`, `app`, `caddy` (plus `backup`, and `tools` under a profile) |

SSH password login is **still enabled** — no SSH key was installed, and
`ops/bootstrap.sh` deliberately skips that hardening rather than locking
someone out of a machine they can only reach by password. Closing that off is
listed under "still to do".

## The stack

Next.js 15.4.11 · Payload CMS 3.90.1 · PostgreSQL 16 · Tailwind 4 · Caddy.
Arabic at `/`, English at `/en`. Right-to-left is done entirely with CSS
logical properties — there is no RTL override stylesheet, so do not add one.

Full detail is in `DEPLOY.md` (the runbook) and `WEBSITE-BRIEF.md` (content
and brand rules). Read `DEPLOY.md` before changing anything on the server.

## Accounts

- CMS login: `saamsculture@gmail.com`
- Password: generated during deployment, written on paper by the owner
- Two-factor: **enrolled**, on the owner's phone. Ten backup codes were issued
  and shown once.
- Enquiry notifications go to `contact@higreenpanda.com`
- `RESEND_API_KEY` is **blank**, so enquiries are saved to the database but no
  notification email is sent yet.

Secrets live in `/home/deploy/higreenpanda/.env`, mode 600. It is not in git.

## Scripts

All three are idempotent and safe to re-run.

| Script             | What it does                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `ops/bootstrap.sh` | Server hardening: Docker, ufw, unattended-upgrades, fail2ban, the `deploy` user. Skips SSH hardening when no key is present. |
| `ops/deploy.sh`    | The whole deployment: clone, `.env`, database, migrate, seed, build, health check, two-factor enrolment.                     |
| `ops/preview.sh`   | Turns the preview hostname on or off. Restarts only Caddy — no rebuild. `bash -s -- off` reverses it.                        |

### Run them with a commit-pinned URL

`raw.githubusercontent.com` caches for several minutes, and a `?v=` query does
not reliably beat it. During this session a fix was pushed and the next run
executed the _previous_ version twice, which is indistinguishable from the fix
not working. Use the commit SHA in the path instead:

```
curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/<full-sha>/ops/deploy.sh | bash
```

## Things that will bite you

- **The browser terminal drops on long builds.** It died twice during
  `npm run build`. If you need a full rebuild, expect it, and have them re-run
  rather than assuming damage. Nothing is left half-written — the script
  brings the stack up only after the build succeeds.
- **`docker compose run` eats stdin.** A script piped from `curl` has its own
  source on stdin, so compose consumes the rest of it and bash exits 0 having
  silently skipped everything after. `ops/deploy.sh` re-execs itself from a
  real file for this reason. Do not remove that.
- **A machine cannot resolve its own hostname honestly.** `/etc/hosts` maps it
  to `127.0.1.1` and NSS stops there. Use public DNS — there is a
  `resolves_to()` helper in both scripts.
- **git refuses a repo owned by someone else.** `deploy.sh` chowns the tree to
  `deploy` and runs as root, so `safe.directory` is registered for it.
- **The `tools` image must be rebuilt before migrating.** `docker compose run`
  reuses the existing image, which on a redeploy is last time's checkout —
  so `npm run migrate` says "Done" having found no new files, the seed runs
  the old seed, and the new app 500s on a missing column. That took the
  live site down for about four minutes on 23 September 2026. `deploy.sh`
  now passes `--build`; if you ever run migrate or seed by hand, do the
  same: `docker compose -f docker-compose.prod.yml run --rm --build tools npm run migrate`.
- **Caddy must be validated before restarting.** `up -d` reports success even
  when the container starts and immediately dies, and for the proxy that means
  the whole site is down. Both scripts validate in a throwaway container first.

## DNS, apart from email

CAA records were added at GoDaddy on 23 September 2026:
`0 issue "letsencrypt.org"` and `0 issue "sectigo.com"` (Caddy's ZeroSSL
fallback issues through Sectigo). Verified at the authoritative nameserver.
If a third certificate authority is ever needed, add a third CAA record;
do not delete these two while Caddy issues the site's certificate.

## Do not touch email DNS

MX, SPF, DKIM and DMARC are **correct and working**. Mail was never broken —
an earlier assumption that it was is documented and struck through in
`WEBSITE-BRIEF.md` §6. Do not modify these records.

Two GoDaddy traps, learned the hard way:

1. **Edit the existing row. Never "Add new record."** Adding produced a second
   `_dmarc` TXT, and two DMARC records make receivers treat the domain as
   having no DMARC policy at all.
2. **Treat the GoDaddy panel as intent, not state.** Verify against DNS, never
   against what the panel displays.

## Still to do

1. **HubSpot** — `DEPLOY.md` §4b, parked. The portal has not completed
   onboarding, so the DKIM CNAMEs do not exist yet. That portal step is a hard
   prerequisite; do not add DNS records for it before then.
2. **SSH key**, then re-run `ops/bootstrap.sh` to disable password login.
3. **Photographs** for the new service pages — every `image` field is empty.
   The blog covers came from the old site's `wp-content/uploads` (in the
   owner's backup archive); most of that library has captions baked into the
   pixels, so only text-free crops are usable.
4. **Price check.** The 2025 price list (used for the "from" prices) and the
   owner's newer "Company Registration Quotation System" sheet (Google Drive,
   23 September 2026) disagree: remote registration ¥8,200 vs ¥6,000,
   in-person ¥7,200 vs ¥7,000, bank account ¥1,400 vs ¥1,200/¥1,700, work
   permit ¥7,600 vs ¥4,600, accounting ¥3,800 vs ¥3,200. Confirm with the
   owner and correct in the CMS (Services → price from).
5. **Tighten the Backblaze key.** The key was made in the web UI, whose
   "Read and Write" preset includes `deleteFiles`. A key without delete needs
   the `b2` CLI (`b2 key create --capabilities listBuckets,listFiles,readFiles,writeFiles`).
   Also worth rotating at some point: the first characters of the current
   application key were echoed to the web console when it was pasted into
   the wrong prompt (see below), then corrected.
6. **Restore drill** — `DEPLOY.md` §7, twice a year. The first one has not
   been done against the Backblaze copy.

## Email and backups (done 23 September 2026)

- **Resend** is live. Domain `higreenpanda.com` verified (region Tokyo);
  records at GoDaddy: `TXT resend._domainkey`, `CNAME rsend`, `CNAME send`.
  Resend also offers an `MX @` record for _receiving_ — it was **not** added,
  because that would take mail away from Google Workspace. Never add it.
  API key "website" (sending only) is in `.env` as `RESEND_API_KEY`; the
  owner pasted it into a `read -rs` prompt, so it was never displayed. A test
  enquiry (`HGP-20260923-B4B7EA`) was emailed and `notifiedAt` was set.
- **Backblaze B2** holds the nightly backups: bucket `higreenpanda-backups`
  (private, `s3.us-east-005.backblazeb2.com`), key `higreenpanda-server`
  restricted to that bucket. `S3_*` are set in `.env`. First run verified:
  `db/…dump` and `media/…tar.gz` listed in the bucket.
- **Bug fixed on the way:** the backup container never mapped `S3_*` to the
  `AWS_*` variables the CLI reads, so uploads would have failed with
  "Unable to locate credentials" for anyone who set keys. Fixed in
  `docker-compose.prod.yml`.
- **Paste trap:** when two values are requested one after the other in the
  console, the first prompt echoes what is typed (only the secret prompt is
  silent). The owner pasted the application key into the keyID prompt; the
  keyID is public (it is on Backblaze's key list) so it was simply set by
  hand afterwards, but treat the current application key as lightly exposed
  and rotate when convenient.

## Verified, so you do not have to re-check

Done in the sandbox before deployment: Lighthouse 97–99 / 100 / 100 / 100
across seven pages; 25 unit tests; 23 route status checks; a backup and
restore round trip against a live database; single-use backup codes; a
password-only REST login correctly refused with 403.

After the redesign, on a local database seeded from `src/seed/content.ts`:
`tsc`, `eslint` and `prettier` clean; 25 unit tests; every route 200 in both
languages; the Playwright e2e file (`npm run test:e2e`) against a production
build; full-page screenshots of every page at 1440px and 390px in both
languages, reviewed by eye.

Not yet verified on the real server: nothing beyond the health check and route
spot-checks that `ops/deploy.sh` runs. The site has not been looked at by
anyone but its owner.
