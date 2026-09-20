# Build prompt — HiGreenPanda website

Paste this into Claude Code as the opening instruction. `WEBSITE-BRIEF.md` (the content
and brand manual) and `brand-assets/` (37 logo files) should be in the repository root
before you start.

---

## The task

Build the HiGreenPanda website: a bilingual (Arabic-first, English second) marketing and
lead-generation site for a China trade-services company, with a CMS the client can edit
themselves and a clear upgrade path to a client portal and subscriptions.

Read `WEBSITE-BRIEF.md` first. It contains the business positioning, the eight services,
the founder story, the brand manual, and the colour and typography systems. Everything
in it is authoritative — do not invent competing copy or colours.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15** (App Router, TypeScript, strict) | RSC, built-in i18n routing, the upgrade path to a portal is just more routes |
| CMS | **Payload CMS 3** (installed into the same Next.js app) | Self-hosted, no plugin ecosystem to be exploited, typed collections, auth and access control already built for the portal later |
| Database | **PostgreSQL 16** | Payload's Postgres adapter; relational from day one so subscriptions and orders slot in |
| Styling | **Tailwind CSS** with the brand tokens as CSS custom properties | Tokens in one file, swapped in one place |
| Hosting | **Hetzner** VPS (CX22 or larger), Docker Compose, Caddy for TLS | Cheap, full control, matches the existing pharmatrust.tech setup |
| Email | Transactional provider (Resend or Postmark) | Form notifications must not depend on the domain's own mail |
| Analytics | Plausible or Umami, self-hosted | No cookie banner needed |

Do not use WordPress, any PHP CMS, or any page builder. The previous site was hacked
through exactly that surface.

## Non-negotiable requirements

### 1. Arabic-first bilingual

- Arabic at `/`, English at `/en`. Arabic is the default locale, not a translation layer.
- `dir="rtl"` on Arabic routes, `dir="ltr"` on English, set on `<html>`, driven by the route.
- Use CSS logical properties throughout (`margin-inline-start`, not `margin-left`). No
  RTL override stylesheet.
- Correct `hreflang` alternates on every page, plus `x-default`.
- Arabic typography one step larger with line height 1.9 — see brief §13.
- Numerals: Western Arabic numerals (1234) in both locales unless the client asks otherwise.
- The language switcher must stay on the equivalent page, not bounce to the homepage.

### 2. Content model (Payload collections)

- `Pages` — flexible block-based layout, localised
- `Services` — the eight services from brief §4, localised, with slug, summary, body,
  icon, ordering, and a featured flag
- `Posts` — the blog, localised, with categories, author, SEO fields, and reading time
- `Enquiries` — form submissions stored in the database **and** emailed. Never email-only.
- `Testimonials`, `TeamMembers`, `Media`, `Redirects`, `SiteSettings` (nav, footer, contact
  details, social links)

Every localised field uses Payload's built-in localisation. Do not build two parallel trees.

### 3. Pages to build

```
/ and /en                      Home
/services, /en/services        Services index
/services/[slug]               Service detail (8 of them)
/about, /en/about              Company and founder
/blog, /en/blog                Blog index, paginated
/blog/[slug]                   Post
/contact, /en/contact          Contact and enquiry form
/privacy, /terms               Legal
```

### 4. Lead capture

- Enquiry form: name, country, WhatsApp number, service of interest, message.
- Store in Postgres, email a notification, show a proper success state.
- Rate-limited and protected by a honeypot plus a timing check. No third-party CAPTCHA.
- A floating WhatsApp button on every page — this audience contacts businesses through
  WhatsApp, not email. Make the number configurable in `SiteSettings`.

### 5. SEO and migration

- Metadata API on every route; canonical URLs; OG images from `brand-assets/social/`.
- JSON-LD: `Organization` on the homepage, `Service` on service pages, `BlogPosting` on posts.
- A `Redirects` collection with 301s, seeded with the old URLs — `/en/home/` in particular.
- `sitemap.xml` and `robots.txt` generated, covering both locales.
- **The old site was injected with spam pages.** Return a clean 410 Gone for any path
  matching the old spam patterns rather than 404, so search engines drop them faster.

### 6. Security baseline

- Strict CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Payload admin behind two-factor authentication, on a non-obvious path, rate-limited.
- No secrets in the repo. `.env` with a documented `.env.example`.
- All dependencies pinned; Dependabot or Renovate enabled.
- Automated nightly Postgres dump and media backup to off-server object storage, with
  a documented, tested restore procedure.
- Uploaded media validated by type and size, served from a path that cannot execute.
- Logs and errors captured (Sentry or equivalent).

### 7. Performance

Lighthouse 95+ on mobile for all four categories. `next/image` everywhere, AVIF and WebP,
fonts self-hosted and subset, no layout shift. Assume a slow 4G connection on a mid-range
Android phone — that is the real audience.

### 8. Accessibility

WCAG 2.2 AA. **Read the contrast rule in brief §12**: the brand green `#378D42` is only
4.16:1 on white and must not be used for body text or normal-size button labels. Use
`--brand-700` `#276B34` for those. Visible focus rings everywhere. Full keyboard
navigation. Test the Arabic side with a screen reader too.

## Upgrade path — build for it now, ship it later

Do not build these yet, but do not block them either:

- **Client portal** — authenticated area where customers track sourcing orders,
  inspections, and shipments. Payload's auth and access control already support this;
  keep `Users` separate from admin users with a `role` field from day one.
- **Subscriptions** — recurring service plans. Leave room for a `Plans` and
  `Subscriptions` collection and keep payment logic out of the presentation layer.
- **Quotation flow** — enquiries becoming quotes becoming orders. Model `Enquiries` so it
  can gain a status field and relations without a migration rewrite.

Every schema decision should survive these three additions. Where a shortcut would block
one of them, take the longer route and leave a comment saying why.

## How to work

1. Start by reading `WEBSITE-BRIEF.md` in full.
2. Scaffold the app, database, and Docker setup; get `docker compose up` working locally
   before writing any page.
3. Set up i18n routing and the RTL/LTR system **before** building components. Retrofitting
   RTL is painful.
4. Wire the brand tokens from brief §12 into `globals.css` as custom properties, and have
   Tailwind read from them. One source of truth.
5. Build the Payload collections, then the pages.
6. Seed the eight services and the homepage copy from the brief.
7. Write the deployment runbook in `DEPLOY.md`: provisioning, DNS records (including the
   MX records that need restoring), TLS, backups, and the restore test.

Commit in small, reviewable steps. Explain any decision that differs from this spec.

## What success looks like

The client can log into the admin, edit an Arabic service page, publish it, and see it
live — without touching code. An enquiry from WhatsApp reaches their inbox and is stored
in the database. The site scores 95+ on mobile Lighthouse. And the whole thing can be
rebuilt from the repository and a database dump in under an hour.
