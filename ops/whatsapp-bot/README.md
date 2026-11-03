# WhatsApp bot → HubSpot

The WhatsApp bot is not in this repository: it runs from `/opt/higreenpanda-bot`
on the same VPS (pm2 name `higreenpanda-bot`), installed on 25 Sep 2026 from
`higreenpanda-bot.zip` in the Drive folder "02 بوت الواتساب". This folder holds
the bot files changed to connect it to HubSpot, and the script that installs
them.

## What it does

- Every customer who writes to the bot becomes a HubSpot **contact**, matched by
  WhatsApp number (`+<digits>` in `phone` or `mobilephone`). That is the same
  rule the website uses, so someone who writes on WhatsApp and also fills a
  form on the site stays one contact. Hidden WhatsApp ids (`@lid` with no real
  number) are skipped.
- Each conversation is one **note** on the contact (English/中文 labels, the
  conversation as written): name, number, language, services detected, the
  handoff reason, and every line from the customer, the bot and the team. It is
  written when the chat has been quiet for 30 minutes (`hubspotIdleMinutes` in
  `config.json`), or at once when the bot hands the chat to the team, and is
  updated in place while the conversation goes on. After 24 hours of silence
  the next message starts a new note.
- A **deal** is opened only when the AI marks a lead ready for a quote (AI mode,
  after a Gemini key is added): pipeline "Services & Trade", stage New Inquiry,
  `hgp_service` from the service, `our_company` Nasher for trade services and
  HiGP for the rest, `hgp_request_source` = "WhatsApp bot".
- If HubSpot is down or the token is wrong, the customer still gets the reply;
  the sync is retried every 15 minutes and after a restart.
- Each contact gets **WhatsApp interest / 兴趣** (`hgp_whatsapp_interest`): hot =
  handed to the team or ready for a quote, warm = asked about a service or wrote
  3+ messages, cold = the rest. It only goes up, and never below a value set by
  hand. HubSpot list "Important WhatsApp customers" (id 11) shows hot + warm.
  `"hubspotSkipCold": true` in `config.json` stops writing cold chats at all
  (SAAM chose to keep them, 26 Oct 2026).
- Owner command in "Message yourself": `!hubspot` shows the state and the last
  error. `"hubspot": false` in `config.json` switches the sync off.

## Wording and prices (27 Oct 2026)

`install-texts.sh` gives the bot the replies the owner approved on 27 Oct 2026:
courteous, professional wording (Arabic and English, few emojis), the services
and October 2026 prices from the website seed (`src/seed/content.ts` and
`catalogue.ts`), "كرت العمل" for the work permit, and the KK100 head office for
"where is your office?". It never touches `config.json`, so test mode stays as
it is until the owner sends `!test off`.

- Prices with a second figure (company formation remote ¥8,200, Hong Kong bank
  account ¥1,700, work permit +¥400 government fees) are in `priceExtra` in
  `data/services.json`; `priceText()` adds it only while the website price is
  in use, not after an `!price` override.
- `src/ai.js` (AI mode only) gets the same tone and the "كرت العمل" rule. If it
  was edited on the server, the script keeps the server's copy.
- When the site's prices or service texts change, regenerate
  `files/data/services.json` from the seed and update the hashes in the script.

## Numbered menus (28 Oct 2026)

The same `install-texts.sh` also installs the menus the owner approved on
28 Oct 2026 (`src/menu.js`, called by `src/engine.js` before the rules or AI):

- A greeting, "menu", a short first message or a customer back after 24 h gets
  the main menu: the six website categories, `7` follow up on a request (client
  portal link, then the next message goes to the team), `8` speak with a
  colleague. `0` always goes back.
- Category → service card (price, link) → `1` quote request or `2` a colleague.
  Goods services ask product (a photo is kept with it), quantity, country and
  budget; the others ask nationality/residence and details. The summary goes to
  the customer, the team gets a "ready lead" notice, and HubSpot gets a deal.
- Business visa is retired (`"retired": true` in `services.json`): it is not
  listed, and asking for it goes to a colleague without a price.
- Free questions still go to the rules (or AI when it is on).

## Files

| File                        | Change                                                                 |
| --------------------------- | ---------------------------------------------------------------------- |
| `files/src/hubspot.js`      | New: the sync.                                                         |
| `files/src/engine.js`       | Records each line and each handoff for HubSpot; `!hubspot`; menus.     |
| `files/src/menu.js`         | New (28 Oct): numbered menus and the quote-request questions.          |
| `files/test.js`             | HubSpot tests; 27 Oct wording/prices; 28 Oct menus.                    |
| `files/scripts/chat.js`     | The terminal simulator never writes to the real HubSpot.               |
| `files/src/texts.js`        | 27 Oct wording.                                                        |
| `files/src/brain.js`        | New greeting layout; "where is your office" → contact details.         |
| `files/src/data.js`         | `priceExtra`, head-office address, "كرت العمل" keywords.                |
| `files/src/ai.js`           | Tone and naming rules for AI mode.                                     |
| `files/data/services.json`  | Services and prices from the website seed.                             |
| `files/data/business.json`  | Head office address, founder from the website.                         |

`install-hubspot.sh` must be run pinned to its own commit (900b3f8e): on the
default branch `files/test.js` is now the 27 Oct version.

The token is the website's (`HUBSPOT_TOKEN` in `/home/deploy/higreenpanda/.env`),
copied by the script to `/opt/higreenpanda-bot/hubspot.env` (mode 600). It needs
contacts read/write, and deals write for the AI deals. After rotating the token
for the website, run the script again to copy the new one.

## Install / undo

Run in hPanel → VPS → Browser terminal, with the commit pinned (see HANDOVER.md):

```
curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/<sha>/ops/whatsapp-bot/install-hubspot.sh | REF=<sha> bash
```

It stops without changing anything if the server's bot files are not the
25 Sep version, or the website has no token yet. It backs the code up to
`/opt/higreenpanda-bot-backups/<time>`, runs `node test.js` before and after,
puts the old code back if the update adds a failing test (a test that already
failed on the server before the update does not block it), and restarts the bot. Running it again only refreshes
the token. Undo: the same command with `bash -s -- undo`.
