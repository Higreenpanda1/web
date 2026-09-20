# HiGreenPanda — Website Rebuild Brief

**Prepared:** 20 September 2026
**Domain:** higreenpanda.com (registered at GoDaddy through March 2031)
**Purpose:** Reconstruct what the old site was about so a new, secure, non-WordPress site can be built from it.

> **How this was assembled.** The old site went offline on 19 September 2026 and its host is unknown, so nothing could be read from the live site. Everything below was recovered from search-engine records of higreenpanda.com and its mirror higreenpanda.net, plus the brand's public social profiles. Sections marked **[confirm]** are my reading and should be checked by you before anyone builds from them.

---

## 1. What the business is

**HiGreen Panda Marketing** (هاي جرين باندا للتسويق) is a China-based trade services company serving Arabic-speaking traders and entrepreneurs.

The one-line positioning used on the old site:

> **Arabic:** مصدرك الاول في تقديم جميع انواع الخدمات التجارية في الصين
> *(Your first source for every kind of business service in China.)*

> **English:** "HiGreen Panda Marketing provides integrated solutions and specialized services in international trade, enabling traders and entrepreneurs to expand into Chinese and Asian markets."

**Based in:** Shenzhen and Shanghai.

**The hook used on the homepage** (worth keeping — it states the customer's problem in their own words):

> هل تبحث عن توريد منتجك التالي من الصين أو تصنيعه أو فحصه أو شحنه؟ هل تبحث عن مساعدة في تأسيس شركتك الخاصة في الصين؟ نحن هنا في خدمتك.
>
> *(Looking to source your next product from China, manufacture it, inspect it, or ship it? Looking for help setting up your own company in China? We're here for you.)*

---

## 2. Who it is for

- Arabic-speaking importers and traders — Gulf, Yemen, and the wider MENA region.
- Entrepreneurs who want to start importing from China but don't know the process.
- E-commerce sellers launching on Noon, Amazon, or Shopify.
- Businesses that want a legal entity in China.

The audience is the reason the site was **Arabic-first with English second**, not the other way round. Keep that.

---

## 3. The founder (a major asset — give it a real page)

**Sami Al-Hajri** (سامي الحجري), founder.

- Yemeni, based in China.
- Bachelor's and Master's in Business Administration, earned in China.
- Won the Jiangsu Research Award for work on the impact of the Belt and Road Initiative on the Arab region.
- Has traveled to more than **235 Chinese cities**.
- Has attended more than **100 trade fairs** across many sectors.
- Also founder of **Nasher E-Commerce / ناشر للتجارة المحدودة**. **[confirm]** — how this relates to HiGreenPanda should be decided before the rebuild.

The audience follows the person, not just the company (46K on Instagram, 29K on YouTube). The new site should lean on this far harder than the old one did.

---

## 4. Services offered

These are the services the old site described. They are the core of the new site.

| # | Service | What the old site said |
|---|---------|------------------------|
| 1 | **Product sourcing** | Finding and supplying your next product from China |
| 2 | **Manufacturing** | Getting your product made |
| 3 | **Quality inspection** | Product research and factory/goods inspection |
| 4 | **Shipping & freight** | Getting goods to your country |
| 5 | **Company formation in China** | "We help you set up a company in China to ensure a smooth and successful entry into the Chinese market. We work with you to understand your specific business needs and develop a tailored approach that aligns with your goals." |
| 6 | **Full import process management** | "Complete oversight of the process of importing products from China from the beginning (product research and inspection) to the end (receiving your goods in your country)" — the flagship, end-to-end offering |
| 7 | **E-commerce launch support** | "If you are looking for an easy and effective way to start your e-commerce business on Noon, Amazon, or Shopify, we are here to provide you with support and integrated solutions to facilitate the e-commerce process." |
| 8 | **Business consulting** | Support and consultations to help clients take advantage of available business opportunities in Chinese and Asian markets |

**Worth adding on the new site [confirm]:** trade-fair and exhibition accompaniment (Canton Fair and similar). The founder's 100+ fairs make this credible, and it's a service Arabic-speaking buyers actively search for — but it wasn't clearly a listed service before.

---

## 5. Site structure to rebuild

The old site had roughly this shape:

- **Homepage** — Arabic at `/`, English at `/en/home/`
- **Services** — one page per service, or one page with sections
- **About / the company**
- **Blog** — Arabic SEO articles. One confirmed example: a guide to opening an online store through a Chinese company, covering AliExpress and company formation in China.
- **Contact**

### Recommended structure for the new site

```
/                     Arabic homepage (default)
/en                   English homepage
/services             Services overview
/services/[slug]      One page per service (8 pages × 2 languages)
/about                Company + founder story
/blog                 Articles (main SEO engine)
/blog/[slug]          Individual article
/contact              Contact + enquiry form
/portal               Client portal (phase 2)
```

---

## 6. Contact details on the old site

- **Email:** contact@higreenpanda.com, Sam@higreenpanda.com
- **Phone / WhatsApp:** +86 130 2344 0305
- **PayPal:** paypal.me/samihgp

⚠️ **The email is currently broken.** When the DNS was wiped on 19 September, the mail records went with it. Email on @higreenpanda.com will not work again until the MX records are restored. Fix this first — it's more urgent than the website, because enquiries are being lost right now.

---

## 7. Social presence (bigger than the website)

| Platform | Handle | Following |
|----------|--------|-----------|
| Instagram | @higreenpanda | ~46,000 followers, 463 posts |
| YouTube | @Higreenpanda | ~29,000 subscribers |
| Facebook | Green Panda | ~12,900 likes, 6 reviews, 100% recommended |

Managed through Metricool.

The audience is on social, not on the site. The new site's job is to **convert** that audience — turn followers into enquiries — rather than to attract strangers. That should shape the design: strong calls to action, an enquiry form that works, visible proof, and fast loading on mobile over slow connections.

---

## 8. What went wrong last time (do not repeat)

1. **The site was hacked.** Spam gambling pages in Indonesian were injected into higreenpanda.com and indexed by Google in July 2026. This is the classic outcome of an unmaintained WordPress install with an outdated plugin or theme. Those URLs are still in Google's index and should be removed through Search Console once the new site is live.
2. **One person held all the access.** Hosting was in the developer's hands, so when that ended, the site went with it. On the new build, **every account must be in your own name**: domain, hosting, email, repository, database backups.
3. **No backups you controlled.** There is no copy of the old site in your possession. Automated backups, stored somewhere you own, are non-negotiable this time.

---

## 9. Requirements for the new build

Your stated plan: **Next.js + Payload CMS, self-hosted on Hetzner, built with Claude Code**, with a client portal and subscriptions later. That's a sound choice — no plugin ecosystem to be exploited, and far cheaper to run than managed WordPress hosting.

**Must-haves:**

- **Bilingual, Arabic-first.** Proper RTL layout for Arabic and LTR for English, with a real language switcher and correct `hreflang` tags. This is the single most important technical requirement.
- **Keep the old URLs.** Any page that still ranks should redirect (301) to its new equivalent so the search traffic survives. The `/en/home/` path in particular.
- **Working enquiry form** that emails you and stores submissions in the database, so nothing is lost if email breaks again.
- **WhatsApp contact button** — this audience contacts businesses through WhatsApp, not email forms.
- **Blog with Arabic authoring**, since the blog was the main way people found the site.
- **Fast on mobile** over slow connections.

**Security baseline:**

- Everything on HTTPS, auto-renewing certificates.
- Admin access behind two-factor authentication.
- Automated daily database and file backups, stored off the server.
- Dependencies updated on a schedule, with automated security alerts.
- No public admin login on a guessable path.
- Domain locked at GoDaddy, with two-step verification on the account.

**Phase 2 (per your plan):** client portal and subscriptions. Worth designing the data model for these now, even if they're built later.

---

---

# Part II — Brand Manual & Visual Identity

> **Built from your supplied artwork.** The logo files you sent were measured directly: the brand green is **#378D42**, identical in both files. The icon mark was re-drawn as true vector from measurements of the original (96% geometric match) so it stays sharp at favicon size. All assets in `brand-assets/` were generated from your files — nothing was invented.

---

## 10. Brand foundations

**Name:** HiGreenPanda — هاي جرين باندا
**Trading name:** HiGreen Panda Marketing — هاي جرين باندا للتسويق
**Monogram:** HiGP

**Positioning statement**

> For Arabic-speaking traders and entrepreneurs who find China hard to enter, HiGreenPanda is the partner on the ground in Shenzhen and Shanghai who handles the whole journey — sourcing, manufacturing, inspection, shipping, and company formation — so importing from China feels as simple as buying locally.

**The promise:** one accountable partner from product idea to delivered goods.

**Brand personality**

| We are | We are not |
|--------|------------|
| On the ground, present, reachable | A faceless directory or marketplace |
| Plain-spoken and practical | Corporate or jargon-heavy |
| Experienced — 235+ cities, 100+ trade fairs | Boastful or inflated |
| Arabic-first, culturally native | A translated Western site |
| Transparent about cost and process | Vague about what things cost |

**Voice and tone**

- **Arabic is the primary voice.** Write Arabic first, then translate to English — never the reverse. Translated-feeling Arabic is the fastest way to lose this audience.
- Speak to one person, directly, in the second person.
- Lead with the customer's problem, not the company's history.
- Short sentences. Concrete nouns. Real numbers.
- Never use stock-photo optimism. Say what happens, in what order, and what it costs.

---

## 11. Logo system

### What the mark is

A heavy **HiGP** monogram in near-black, with a **green disc carrying a play triangle** standing in as the dot of the "i". The "i" stem is an outlined rounded rectangle rather than a solid bar. The play triangle is a **knockout** — it is punched through the disc rather than painted white, so whatever sits behind shows through it.

**The play button is the most valuable part of this identity.** It works standalone at any size, it already reads as an icon, and it points at where the audience actually is: 29,000 YouTube subscribers and 46,000 on Instagram. Use it as the app icon, the avatar, and the favicon everywhere.

### The knockout rule — the one thing to get right

Because the triangle is transparent, the mark behaves differently by background:

| Background | Use |
|-----------|-----|
| White or light neutral | **Knockout version** — `icon-play.svg`. The triangle reads white against the page. |
| Brand green, photography, dark UI | **Solid version** — `icon-play-white.svg`. The triangle is painted white so it cannot disappear. |
| Single-colour print, stamps | `icon-mono-black.svg` / `icon-mono-white.svg` |

Using the knockout on a green background makes the triangle vanish. This is the most likely mistake anyone will make with this logo — put it in the handover notes.

### Variants supplied

| Variant | File | Use |
|---------|------|-----|
| Wordmark, full colour | `web/logo-wordmark@2x.png` | Site header, documents, letterhead |
| Wordmark, white | `web/logo-wordmark-mono-white@2x.png` | Dark footers, over photography, green panels |
| Wordmark, black | `web/logo-wordmark-mono-black@2x.png` | Single-colour print, faxes, stamps |
| Icon, knockout | `vector/icon-play.svg` | Light backgrounds |
| Icon, solid white triangle | `vector/icon-play-white.svg` | Dark or green backgrounds |
| Icon, mono | `vector/icon-mono-black.svg`, `-white.svg` | One-colour applications |

### Usage rules

- **Clear space:** free space on all sides equal to the height of the "H". Nothing intrudes.
- **Minimum size:** wordmark no smaller than 100px wide on screen, 22mm in print. Below that, use the icon alone — it is designed for it.
- **Never:** stretch or squash, re-colour, add shadows or outlines, rotate, put the knockout version on a busy photo, or rebuild the letterforms in another typeface.

### One gap to close

You sent raster files (JPG and PNG). The icon has been rebuilt as clean vector, but **the HiGP wordmark exists only as pixels.** Ask whoever designed it for the original `.ai`, `.svg`, or `.eps`. Until then the supplied PNGs go up to 2379px wide, which covers every web use and most print, but a true vector wordmark should be obtained for large-format printing and banners.

---

## 12. Colour palette

Sampled directly from your artwork and extended into a working system.

### Brand greens

| Token | Hex | Role |
|-------|-----|------|
| `--brand-900` | `#12341B` | Deep green — dark surfaces, footers |
| `--brand-800` | `#1B4F27` | Headings on light backgrounds |
| `--brand-700` | `#276B34` | **Text, links, and buttons** (see the contrast note below) |
| `--brand-600` | **`#378D42`** | **The brand green — logo, large fills, brand moments** |
| `--brand-500` | `#4FA75B` | Hover on dark, illustration |
| `--brand-400` | `#74C07E` | Accents |
| `--brand-300` | `#9FD6A7` | Borders, dividers on green |
| `--brand-100` | `#E2F3E5` | Tinted cards and section bands |
| `--brand-50` | `#F3FAF4` | Page wash |

### ⚠️ The contrast rule that matters

**`#378D42` scores only 4.16:1 against white.** WCAG AA requires 4.5:1 for normal text. That means:

- **Do not** set body text, links, or small labels in `--brand-600`.
- **Do not** put white text on a `--brand-600` button at normal size.
- **Do** use `--brand-700` (`#276B34`) for those — it scores **6.48:1** with white and passes comfortably.
- `--brand-600` remains correct for the logo, large headings above 24px, icons, and big colour fields, where the 3:1 large-text threshold applies.

This costs nothing visually — the two greens are close — and it keeps the site usable for older customers and in bright sunlight, which matters for an audience reading on phones.

### Neutrals

| Token | Hex | Contrast on white | Role |
|-------|-----|------------------|------|
| `--ink` | `#111111` | 18.9:1 | Body text, the wordmark |
| `--slate` | `#4C574F` | 7.5:1 | Secondary text, captions |
| `--mist` | `#D8E0DA` | — | Borders, dividers |
| `--paper` | `#FFFFFF` | — | Surfaces |
| `--canvas` | `#F7F9F7` | — | Page background |

### Accent

| Token | Hex | Role |
|-------|-----|------|
| `--accent` | `#E0A32E` | Warm gold — highlights, badges, large elements only |
| `--accent-text` | `#8A5B00` | The same gold darkened to 5.9:1 for any accent-coloured text |

Green alone reads flat across a whole site. One warm accent gives the page somewhere to look — but use it on no more than one element per screen.

### Semantic

`--success #276B34` · `--warning #8A5B00` · `--error #B3261E` · `--info #1F5F87`

### Dark mode

Ship it. `--canvas #0E1410`, `--paper #161E18`, body text `#E6EDE7`, and lift the brand green to `--brand-500` so it stays legible.

---

## 13. Typography

The logo is a heavy, condensed, high-contrast grotesque. The body typeface should **not** compete with it — keep body text neutral and let the logo carry the personality.

### Arabic (primary)

**IBM Plex Sans Arabic** — open source, free, excellent on screen, and it ships with a matching Latin family so both languages feel like one system. Alternatives: **Cairo** or **Tajawal**.

### Latin (secondary)

**IBM Plex Sans** to pair with the Arabic. For headlines, a heavier condensed face echoes the logo — but never set a headline in a typeface that tries to imitate the wordmark.

### Scale

| Role | Latin | Arabic | Weight |
|------|-------|--------|--------|
| Display / hero | 56px | 60px | 700 |
| H1 | 40px | 44px | 700 |
| H2 | 30px | 33px | 600 |
| H3 | 22px | 24px | 600 |
| Body large | 19px | 21px | 400 |
| Body | 17px | 19px | 400 |
| Caption | 15px | 16px | 400 |

**Arabic runs larger and looser.** Arabic glyphs read smaller than Latin at the same point size, and the script needs vertical room. Set Arabic one step up with line height 1.9, against 1.65 for Latin. Getting this wrong is the most common failure in bilingual sites.

### Rules

- Line length 65–75 characters maximum.
- Self-host the fonts. Do not load them from Google Fonts — it costs a third-party request, a privacy exposure, and render delay.
- Two weights per language is enough.

---

## 14. Asset library — what was generated

All 37 files are in `brand-assets/`, produced from your artwork.

### `vector/` — scalable masters

`icon-play.svg` (knockout) · `icon-play-white.svg` (solid) · `icon-mono-black.svg` · `icon-mono-white.svg`

### `web/` — site assets

| File | Size |
|------|------|
| `logo-wordmark@1x/@2x/@3x.png` | 400 / 800 / 1200px wide |
| `logo-wordmark-large.png` | 2379px wide |
| `logo-wordmark-white@2x.png` | 800px, green dot retained |
| `logo-wordmark-mono-white@2x.png` | 800px, all white — for green and dark panels |
| `logo-wordmark-mono-black@2x.png` | 800px, all black |
| `icon-knockout-256/512/1024.png` | transparent triangle |
| `icon-solid-256/512/1024.png` | white triangle |

### `favicon/` — browser and app icons

`favicon.svg` · `favicon.ico` (16/32/48) · `apple-touch-icon.png` (180) · `icon-192.png` · `icon-512.png` · `icon-maskable-512.png` · plus `site.webmanifest` at the root

### `social/`

| File | Size | Where |
|------|------|-------|
| `og-image.png`, `-en`, `-ar` | 1200 × 630 | Link previews on WhatsApp, Facebook, LinkedIn |
| `avatar.png` | 400 × 400 | Instagram, Facebook, YouTube — full-bleed, survives circular cropping |
| `avatar-800.png` | 800 × 800 | High-DPI profiles |
| `whatsapp-profile.png` | 640 × 640 | WhatsApp Business |
| `youtube-banner.png` | 2560 × 1440 | Channel art |
| `instagram-post-template.png` | 1080 × 1080 | Post base |

### `print/`

`email-signature.png` (300px) · `letterhead-logo.png` (600px) · `invoice-logo.png` (400px) · `watermark.png` (white, 15% opacity)

### Regenerating

`generate-logo-assets.sh` rebuilds the whole set from a single master file. When you get the vector wordmark from your designer, run:

```bash
./generate-logo-assets.sh logo-wordmark.svg brand-assets
```

---

## 15. Imagery and iconography

**Photography.** Real, not stock. Factory floors, shipping containers, trade-fair halls, inspections in progress, the founder meeting suppliers. The credibility of this business rests on being visibly present in China — photographs are the proof, and you already have thousands from 235 cities and 100 trade fairs. Use them.

**Treatment:** natural colour, no heavy filters. Where text sits over a photo, use a `--brand-900` overlay at 55% rather than black.

**Icons:** single-weight line icons, 1.5px stroke, rounded caps and joins — matching the play mark's construction. Lucide or Phosphor. One family throughout.

**Illustration:** avoid generic corporate illustration. If you need diagrams, draw the actual import process as a numbered flow. That is useful content, not decoration.

---

## 16. Applications checklist

- Website header and footer
- Email signature
- WhatsApp Business profile
- Instagram, YouTube, Facebook avatars and banners
- Quotation and invoice templates
- Service one-pagers (PDF), Arabic and English
- Presentation template for client pitches and trade fairs
- Bilingual business cards

---

## 17. Immediate next steps

1. **Restore email.** Add the MX records back at GoDaddy so contact@higreenpanda.com works again.
2. **Secure the GoDaddy account.** New password, two-step verification, check who else has access, confirm the domain isn't listed for sale.
3. **Send the logo.** Attach the original artwork in the best quality you have — `.ai`, `.svg`, `.eps`, `.pdf`, or a large `.png`. Everything in §14 is generated from it automatically.
4. **Ask the former developer** for the hosting login and any backup of the old site. Even a database dump would save weeks of content rewriting.
5. **Confirm the details** marked **[confirm]** in this brief, and correct anything reconstructed wrongly.
6. **Start the build** with `BUILD-PROMPT.md` in Claude Code.

---

## Sources

Reconstructed from: search-engine records of higreenpanda.com and higreenpanda.net; the brand's YouTube, Instagram, and Facebook profiles; Verisign and GoDaddy registry records for the domain; certificate transparency logs; and Netcraft hosting data.
