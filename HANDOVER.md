# Handover — HiGreenPanda website

Written 20 September 2026, at the end of the session that deployed the site,
updated the same day after the front-end redesign, and again on 23 September
2026 after go-live and the service catalogue. Everything below is verified
state, not intention. Where something is unfinished it says so.

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

1. **Resend API key** — until it is set, enquiries and applications are
   stored but not emailed. The owner creates the account and the key;
   set it in `.env` with a command that reads it silently
   (`read -rs`), never by pasting it into a chat.
2. **Off-server backups** — `S3_*` in `.env` are empty, so the nightly job
   writes to `./.backups` on the same machine. That is not a backup. See
   `DEPLOY.md` §7, including the restore drill. Cloudflare R2 or Backblaze B2.
3. **HubSpot** — `DEPLOY.md` §4b, parked. The portal has not completed
   onboarding, so the DKIM CNAMEs do not exist yet. That portal step is a hard
   prerequisite; do not add DNS records for it before then.
4. **SSH key**, then re-run `ops/bootstrap.sh` to disable password login.
5. **Photographs** for the new service pages — every `image` field is empty.
   The blog covers came from the old site's `wp-content/uploads` (in the
   owner's backup archive); most of that library has captions baked into the
   pixels, so only text-free crops are usable.
6. **Price check.** The 2025 price list (used for the "from" prices) and the
   owner's newer "Company Registration Quotation System" sheet (Google Drive,
   23 September 2026) disagree: remote registration ¥8,200 vs ¥6,000,
   in-person ¥7,200 vs ¥7,000, bank account ¥1,400 vs ¥1,200/¥1,700, work
   permit ¥7,600 vs ¥4,600, accounting ¥3,800 vs ¥3,200. Confirm with the
   owner and correct in the CMS (Services → price from).

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
