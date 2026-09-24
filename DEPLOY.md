# Deploying HiGreenPanda

Everything needed to put this site on its VPS, and to rebuild it from nothing
if the server disappears.

The server is a **Hostinger KVM 2** (2 vCPU, 8 GB RAM, 100 GB NVMe), bought
20 September 2026, at **187.77.153.108**. Nothing in the stack is tied to that provider — it needs
root, Docker and a public IP — so the few places where Hostinger specifically
matters are called out by name and everything else says "the VPS".

One thing from `WEBSITE-BRIEF.md` governs this document: the old site was taken
over through an unmaintained WordPress install, and one person held all the
access — so **every account below must be in the client's own name**: domain,
hosting, object storage, repository. There was no backup anyone controlled
either, so the backup section is not optional.

> **Mail is already working and this runbook does not touch it.** An earlier
> draft opened with a section on restoring MX records, taken from brief §6.
> That section was wrong and has been removed — see §4, which covers the one
> DNS change the domain actually needs and lists what must not be altered.

---

## 1. Provision the server

**Hostinger KVM 2** — 2 vCPU, 8 GB RAM, 100 GB NVMe. The 8 GB matters: §2
builds the Docker image on the box, and a Next build spikes memory while
Postgres is running alongside it. On 4 GB that is tight; on 8 GB it is
comfortable.

When creating the VPS in hPanel:

- **OS: Ubuntu 24.04.** If a Docker-ready template is offered, it saves a step,
  but a plain Ubuntu image is fine — Docker is installed below either way.
- **Location: a European datacentre** (Netherlands or Lithuania). Europe is
  better connected to the Gulf and Yemen than the Asian regions.
- **Add your SSH public key** during creation rather than using a root
  password. If you did not, add it now before locking down SSH below, or the
  next step will shut you out.

hPanel has a browser-based terminal for the VPS. **Find it before you need
it** — it is the way back in if SSH ever breaks.

### The short path: one command, no SSH client

If you would rather not install an SSH client or work through the steps below
by hand, `ops/deploy.sh` does the whole of §1 and §2 — Docker, the firewall,
the code, the database, the content, the build, and the two-factor enrolment.

Open **hPanel → VPS → Browser terminal**, which logs you in as `root` already,
and paste exactly this, then press Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/claude/practical-newton-m55sbw/ops/deploy.sh | bash
```

It asks four questions, each with a default you accept by pressing Enter, and
prints the CMS password it generates. It is safe to run a second time: it
keeps the existing `.env`, pulls the latest code, re-applies migrations and
restarts, and it never resets the database.

Two things it deliberately does _not_ do. It does not change the DNS — that is
§3, done by hand after the stack is proven. And it does not disable SSH
password login unless a usable SSH key is already installed, because doing so
from a password session would lock you out of the machine. If you skip the key
step below, the server is otherwise hardened but stays password-reachable over
SSH; add the key and re-run `ops/bootstrap.sh` when you are ready to close
that off.

Read the rest of §1 and §2 anyway. They explain what the script is doing and
are what you will need the day something has to be fixed by hand.

### Add your SSH key first

Everything below disables SSH password login. Without a key you lock yourself
out. Add your public key in hPanel (or append it to `/root/.ssh/authorized_keys`),
then prove it works from your own machine **before** going further:

```bash
ssh root@187.77.153.108        # must succeed using the key, not a password
```

### Then run the bootstrap script

`ops/bootstrap.sh` is everything in this section, idempotent, with the lockout
check built in — it refuses to touch the SSH config unless it can already see a
usable key, and it validates the config with `sshd -t` before restarting the
daemon.

```bash
scp ops/bootstrap.sh root@187.77.153.108:/root/
ssh root@187.77.153.108 'bash /root/bootstrap.sh --dry-run'   # read it first
ssh root@187.77.153.108 'bash /root/bootstrap.sh'
```

`--dry-run` prints every command and file it would write, and changes nothing.
Run it first; the output is short and it is worth seeing what is about to
happen to the machine you just bought.

It creates the `deploy` user with your key and passwordless sudo, hardens SSH
to key-only with no root login, sets `ufw` to allow only 22/80/443, enables
unattended security upgrades and `fail2ban`, and installs Docker from Docker's
own repository (the distribution package lags badly).

> **Do not close that root session until you have confirmed the new login
> works.** From a second terminal:
>
> ```bash
> ssh deploy@187.77.153.108
> ```
>
> If it fails you still have the first session open to fix it. If you have
> already closed it, hPanel's browser terminal is the way in.

Once that is confirmed, set up **Hostinger's own firewall in hPanel** as a
second layer, allowing
only 22, 80 and 443 inbound. It sits outside the operating system, so it
survives a mistake in `ufw` — and `ufw` survives a mistake in it.

> **Take a Hostinger snapshot once §2 reports every service healthy, before the
> DNS cutover in §3.** It is a one-click whole-machine rollback for the riskiest
> hour of this deployment, and the plan includes it.
>
> It is _not_ the backup plan. Snapshots live with the provider and with the
> server; §7 is the backup that does not. Both, not either.

---

## 2. Deploy the stack

Do this **before** pointing DNS at the box. The images are built here, on the
server — the container images cannot be built in a sandbox whose egress policy
blocks Docker Hub's layer CDN, and that build has therefore never been
exercised. Expect to debug it here, with no traffic arriving, rather than
after the domain is live.

> `ops/deploy.sh` (§1, "The short path") performs everything in this section.
> What follows is the same work spelled out — read it to understand what the
> script did, or follow it if you would rather drive each step yourself.

```bash
ssh deploy@187.77.153.108
git clone https://github.com/Higreenpanda1/web.git higreenpanda
cd higreenpanda
cp .env.example .env
```

Fill in `.env`. Generate each secret separately — never reuse one:

```bash
openssl rand -base64 32   # PAYLOAD_SECRET
openssl rand -base64 24   # POSTGRES_PASSWORD
```

At minimum set `NEXT_PUBLIC_SERVER_URL=https://higreenpanda.com`,
`SITE_DOMAIN=higreenpanda.com`, `PAYLOAD_SECRET`, `POSTGRES_*`,
`ADMIN_REQUIRE_2FA=true`, `RESEND_API_KEY` and `ENQUIRY_NOTIFY_TO`.

### Database first, then the app

The order matters, and not only for tidiness. Migrations and seeding run in
the `tools` service, not in `app`:

```bash
# 1. Database only.
docker compose -f docker-compose.prod.yml up -d --build db

# 2. Schema, then content. Both exit when done; neither stays running.
docker compose -f docker-compose.prod.yml run --rm tools npm run migrate
docker compose -f docker-compose.prod.yml run --rm tools npm run seed

# 3. Now bring up the site, the proxy and the backup job.
docker compose -f docker-compose.prod.yml up -d --build
```

Two things about that sequence.

**Migrations and seeding cannot run in `app`.** The runtime image carries only
Next's standalone output: an empty `node_modules/.bin`, no `src/migrations`,
no `src/seed`. `docker compose exec app npm run migrate` fails with
`cross-env: not found`. It looks like it should work — the standalone output
copies `package.json`, so the scripts are listed — which is the trap. The
`tools` service is built from the same Dockerfile's `build` stage, which still
has the source and the dev dependencies. It sits behind a compose profile, so
`up -d` never starts it.

**Seeding before `app` starts is what avoids a stale cache.** Page data is
cached for an hour and invalidated by tag. An edit in the admin panel drops
exactly the tag it touched; a script running in its own process cannot reach
the running server to do that. Seed first and `app` starts cold, with nothing
to invalidate. Seed against a already-running site and it serves pre-seed
content for up to an hour — the seed prints a restart command when it
finishes, for exactly that case.

`seed` creates the twenty services, the founder record, the twelve blog
categories, the 112 articles recovered from the old WordPress site (with their
cover images and the 301s from their old URLs), the content queue, the
redirects and the first admin user from `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`. It is idempotent — re-running it updates rather than
duplicates, and it never deletes anything an editor has created. The first run
uploads about 130 images through sharp and takes several minutes; later runs
skip every article whose source has not changed and finish in seconds.

Then **clear `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env`**; they
are only needed once.

### Confirm every service is healthy before going further

Caddy cannot get a real certificate until DNS resolves, so check the app
directly on the box:

```bash
docker compose -f docker-compose.prod.yml ps        # all four: running / healthy
docker compose -f docker-compose.prod.yml exec app \
  node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.json()).then(console.log)"
# → { status: 'ok' }   (a real database query, not just a liveness ping)

docker compose -f docker-compose.prod.yml logs backup | tail -5
docker compose -f docker-compose.prod.yml logs app | tail -20
```

Then walk the site over the server's IP with a Host header, so Caddy routes it
without needing a certificate:

```bash
curl -sI -H 'Host: higreenpanda.com' http://127.0.0.1/            # 200
curl -sI -H 'Host: higreenpanda.com' http://127.0.0.1/en          # 200
curl -sI -H 'Host: higreenpanda.com' http://127.0.0.1/slot-gacor  # 410

# The old URLs — these read the redirect table out of the database, so they
# also prove the app can see Postgres on its very first request.
curl -sI -H 'Host: higreenpanda.com' http://127.0.0.1/en/home/    # 301 → /en
curl -sI -H 'Host: higreenpanda.com' http://127.0.0.1/about-us/   # 301 → /about
```

Do not continue until all of that is right.

### Enrol the second factor

Also in `tools`, and interactive — `run` gives it a terminal:

```bash
docker compose -f docker-compose.prod.yml run --rm tools npm run totp:enrol -- admin@higreenpanda.com
```

Scan the QR code, type the six digits to confirm, and **write down the ten
backup codes somewhere other than this server**. They are stored as hashes and
cannot be shown again.

Sign in at `https://higreenpanda.com/hgp-studio-gate`.

---

### Look at the site first, without touching DNS

Hostinger gives every VPS a hostname that already resolves to it —
`srv1994320.hstgr.cloud`. Caddy can get a real certificate for that name, so
the site is viewable over HTTPS before the domain moves:

```bash
curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/claude/practical-newton-m55sbw/ops/preview.sh | bash
```

It updates `PREVIEW_HOSTNAME` in `.env`, validates the Caddyfile in a
throwaway container, restarts only the proxy, and prints the address. No
rebuild, and nothing else in the stack is touched. `| bash -s -- off` turns it
back off, which is worth doing once the real domain is live.

It refuses a hostname that does not resolve back to this server, because an
address Caddy cannot prove it owns means an hour of failed certificate
challenges rather than a working preview.

The preview is marked `noindex`, and canonical URLs still say
`higreenpanda.com` — it is a way to look at the site, not a second home for
it.

---

## 3. DNS — only once the stack is healthy

Now, and not before: with the stack already proven on the box, pointing DNS is
what triggers Caddy to request a certificate, and a broken app behind it just
burns Let's Encrypt rate limits.

### Record the rollback values first

Read them from DNS, not from the GoDaddy console — those two have disagreed in
practice (see the warning in §4a). Do this **before** changing anything:

```bash
dig +short A higreenpanda.com          # note every address returned
dig +short CNAME www.higreenpanda.com  # expected: higreenpanda.com.
dig +short MX higreenpanda.com         # must not change today
```

As published on 20 September 2026, the zone is:

| Type  | Name | Value              | TTL |
| ----- | ---- | ------------------ | --- |
| A     | @    | `15.197.148.33`    | 600 |
| A     | @    | `3.33.130.190`     | 600 |
| CNAME | www  | `higreenpanda.com` | 600 |

**These two A records are the rollback.** If the cutover goes wrong, put them
back exactly and the site returns to its previous state. Re-read them at
cutover time anyway, in case they have moved since.

### The cutover

**Replace the two root `A` records with the VPS IPv4 address. Change nothing
else.**

| Type  | Name | Action                                                                                                                                                                 |
| ----- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A     | @    | Replace `15.197.148.33` → `187.77.153.108`                                                                                                                             |
| A     | @    | Delete `3.33.130.190`, or replace it with `187.77.153.108` too                                                                                                         |
| CNAME | www  | **Leave alone.** It points at the root, so it follows automatically — and a name holding a CNAME may not hold anything else, so adding an `A` for `www` would break it |

TTL is 600, so the cutover takes effect in about ten minutes — and so does the
rollback. That is short enough to try the cutover during working hours and
undo it if the site misbehaves.

The Caddyfile already has a `www` site block that redirects to the apex, so
`www` keeps working through the CNAME without a record of its own.

### There is no CAA record, and that is fine

`higreenpanda.com` publishes **no CAA record**, so no certificate authority is
restricted and Let's Encrypt issuance is not blocked.

**If Caddy fails to get a certificate, CAA is not the cause.** Do not go
looking there. Check, in this order: does the A record actually resolve to the
box (`dig +short A higreenpanda.com`), is port 80 reachable from outside
(Let's Encrypt validates over HTTP), and what does Caddy say
(`docker compose -f docker-compose.prod.yml logs caddy | grep -i -A5 error`).

Adding a CAA record afterwards is worthwhile hardening — it stops any other CA
issuing for the domain — but it is a separate change, made once the
certificate exists and the site is up, never during the cutover:

```
CAA  @  0 issue "letsencrypt.org"
```

### Verify against DNS, then watch the certificate

```bash
dig +short A higreenpanda.com        # 187.77.153.108, nothing else
dig +short A www.higreenpanda.com    # same address, via the CNAME
dig +short MX higreenpanda.com       # unchanged: 1 smtp.google.com

docker compose -f docker-compose.prod.yml logs -f caddy | grep -i certificate
curl -sI https://higreenpanda.com/ | head -3
curl -sI https://www.higreenpanda.com/ | head -3   # 301 to the apex
```

If issuance fails, Caddy backs off with increasing delays. Fix the cause
rather than restarting repeatedly — restarts do not reset the rate limit.

### Afterwards, optionally

Both of these are separate changes, each made only once the site is confirmed
working, and each independently reversible:

- **IPv6.** Add `AAAA @ <VPS IPv6>`. Worth having; roll back by deleting
  it. Do not add it during the cutover — it is one more thing to be wrong
  while you are trying to tell whether the site works.
- **The `.net` mirror.** If `higreenpanda.net` is under the same control,
  point it at the same address; the Caddyfile already redirects it to the
  apex.

---

## 4. Email — what it needs, and what it must not have done to it

**Mail is working. Do not modify the MX, SPF policy, DKIM or DMARC policy
records.** The one change already made is the DMARC `rua` (§4a); the one still
outstanding is authorising HubSpot (§4b), which is parked. As published, the
domain has:

| Record | Value                                                                         | State                                                                                                                  |
| ------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| MX     | `1 smtp.google.com`                                                           | Correct — Google Workspace's current single-record format, which replaced the old five-record `ASPMX.L.GOOGLE.COM` set |
| SPF    | `v=spf1 include:_spf.google.com ~all`                                         | Correct for Google-sent mail                                                                                           |
| DKIM   | `google._domainkey`, 2048-bit                                                 | Correct                                                                                                                |
| DMARC  | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc@higreenpanda.com;` | Correct — `rua` fixed 20 Sep 2026, see §4a                                                                             |

The mailbox was created on 19 September, which is why nothing in it predates
that date. Anything sent before the mailbox existed bounced at the sender and
no DNS change brings it back.

---

### 4a. DMARC reports — done, 20 September 2026

The `rua` was GoDaddy's default, `dmarc_rua@onsecureserver.net`, which nobody
at HiGreenPanda could open: mail could be quarantined with no visibility into
what or why. It now reads:

```
v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc@higreenpanda.com;
```

Policy untouched — only the `rua` tag changed.

The reports are daily XML aggregates and are unreadable by hand. Feed the
address to a DMARC report reader, or expect to ignore them; an address nobody
reads is still better than one nobody can.

> **At the time of writing, GoDaddy's nameservers were still serving the old
> `rua`.** The console showed the new value. Give it time and re-check against
> DNS, not the panel.

---

> ### ⚠️ Two GoDaddy traps — read this before §4b touches the same zone
>
> Both were hit during the §4a change. §4b adds more records at the same
> registrar, including one that must be unique, so they will be hit again.
>
> **1. Edit the existing row. Never use "Add new record" for a record that
> must be unique.**
>
> Adding produced a _second_ `_dmarc` TXT record alongside the first. Two
> DMARC records is not "the newer one wins" — receivers treat a domain with
> multiple DMARC records as having **no DMARC policy at all**. The change
> left the domain worse off than before it was made, and the console gave no
> indication.
>
> The same applies to **SPF in §4b step 3**: a domain may publish only one
> `v=spf1` record. Adding a second invalidates both, and every HubSpot send
> fails SPF. That step is an _edit_ of the existing SPF row — keep
> `include:_spf.google.com`, keep `~all`, insert the HubSpot include between
> them.
>
> Records that must be unique here: **SPF** (one `v=spf1` TXT at the root),
> **DMARC** (one TXT at `_dmarc`), **CNAME** (a name holding a CNAME may hold
> nothing else). The HubSpot DKIM records in step 2 are _different names_, so
> those are genuine additions.
>
> **2. The GoDaddy console is a statement of intent, not of state.**
>
> The console and the published zone disagreed three separate times during
> this one change. A value showing in the panel does not mean the nameservers
> are serving it. After every DNS change in this runbook, verify against DNS:
>
> ```bash
> dig +short TXT _dmarc.higreenpanda.com     # exactly ONE string back
> dig +short TXT higreenpanda.com | grep spf1 # exactly ONE v=spf1 string
> dig +short A higreenpanda.com
> ```
>
> More than one line back from either of the first two is the failure above.
> Delete the extra row and re-check — do not assume the panel fixed it.

---

### 4b. Authorise HubSpot — PARKED, blocked on a portal step

**Status as of 20 September 2026: not started, and not startable from here.**

HubSpot was connected to `contact@higreenpanda.com` on 19 September, but the
portal **has not completed onboarding** and the **email sending domain is not
connected**.

> ## Step 1 is a hard prerequisite. Steps 2–5 have no inputs until it is done.
>
> **HubSpot generates the DKIM records only once the Email Sending Domain
> setup is started in the portal. Those records do not exist yet.** Anyone
> who goes looking for them — in DNS, in HubSpot's documentation, or in this
> runbook — will not find them, because they have not been created.
>
> Step 1 **cannot be done** from this repository, from the DNS panel, or from
> the server. It needs a person signed in to the HubSpot portal with the
> **`sale@higreenpanda.com`** login.
>
> Until that person has finished step 1, the correct state of steps 2–5 is
> _not started_. Do not begin at step 3 because the SPF include looks like the
> one you can do without waiting — on its own it does not work (see 4c), and
> a lone SPF edit is the change most likely to be mistaken for "HubSpot is
> authorised now".

With `p=quarantine` in force and HubSpot unauthorised, any marketing mail sent
as `contact@higreenpanda.com` will be quarantined by receivers. All five steps
have to be finished before the first campaign, in this order.

**1. Connect the email sending domain in HubSpot.** _(portal — blocked on the
`sale@higreenpanda.com` login)_

In HubSpot: **Settings → Content → Domains & URLs → Connect a domain →
Email Sending**, and follow it through for `higreenpanda.com`. Completing it
produces the DNS records for steps 2 and 3, specific to this portal. Do not
copy those values from another account, another domain, or this document —
HubSpot generates them per portal and a borrowed value silently fails.

Leave the page open; it is also where HubSpot verifies the records once they
are published.

**2. Publish the DKIM `CNAME` records HubSpot generated.** _(DNS, after step 1)_

Two records, in the shape `hs1-<id>._domainkey` and `hs2-<id>._domainkey`,
each pointing at a HubSpot hostname. Take the exact names and values from the
screen in step 1.

This is the step that actually stops the quarantine — see 4c.

**3. Add HubSpot to SPF.** _(DNS, after step 1)_

> **EDIT the existing SPF row. Do not use "Add new record".** See the GoDaddy
> traps above §4b. A domain may publish only one `v=spf1` record; a second one
> invalidates both, and every HubSpot send fails SPF. This is the same mistake
> that produced a duplicate `_dmarc` record during §4a.

Keep `include:_spf.google.com` first and keep `~all` exactly as it is; insert
the HubSpot include between them:

```
v=spf1 include:_spf.google.com include:<portal-id>.spf<nn>.hubspotemail.net ~all
```

`<portal-id>` and `<nn>` come from step 1.

Verify against DNS, not the console — exactly one line must come back:

```bash
dig +short TXT higreenpanda.com | grep spf1
```

**4. Optionally, set a custom return-path.** _(HubSpot + DNS, after step 1)_

Only needed if you want SPF to align as well as DKIM. HubSpot's own
documentation is explicit that a sending domain uses the HubSpot default
return-path until a custom one is set, and that setting one is what allows for
SPF alignment. DKIM alone is sufficient for DMARC to pass, so this is a
belt-and-braces step rather than a requirement — but it is cheap, and two
aligned signals survive one of them breaking.

**5. Verify on a real send, before any list.** _(after 1–4)_

Send one campaign to a personal Gmail address, open it, and use _Show
original_ to read the raw headers:

```
Authentication-Results: mx.google.com;
  dkim=pass header.i=@higreenpanda.com;
  spf=pass ...;
  dmarc=pass (p=QUARANTINE sp=QUARANTINE dis=NONE) header.from=higreenpanda.com
```

`dmarc=pass` with `header.from=higreenpanda.com` is the line that matters. If
it says `dmarc=fail`, stop and fix it — do not send to a list, because
quarantined mail from a new sending domain damages the domain's reputation
for months.

---

### 4c. Why the SPF include alone is not enough

Worth keeping in mind at step 3, because it is the step that looks sufficient
and is not.

DMARC passes when _either_ SPF or DKIM aligns with the visible From domain.
SPF alignment is judged against the return-path — the envelope sender — not
the From address a reader sees. HubSpot's default return-path is a
HubSpot-owned domain, so SPF cannot align to `higreenpanda.com` however the
include is written, even under the relaxed `aspf=r` already in the record.
That is exactly what step 4 changes, and why it is the one marked optional
rather than the one marked essential.

HubSpot's DKIM, by contrast, signs as `d=higreenpanda.com`, which does align.
So DKIM is what makes DMARC pass. The SPF include is still worth publishing —
plenty of receivers check SPF on its own, outside DMARC — but publishing it
without the DKIM records leaves the quarantine exactly where it was.

---

## 5. The admin path

The admin panel is at **`/hgp-studio`**, not `/admin`. `/admin` returns 404 so a
scanner learns nothing.

Changing the path means changing it in three places, all of which must agree:

1. `routes.admin` in `src/payload.config.ts`
2. the directory `src/app/(payload)/hgp-studio/` — Next's file routing decides
   the URL, and Payload only needs to be told what it is
3. `ADMIN_PATH` and `ADMIN_GATE_PATH` in `src/middleware.ts`, the `@admin`
   matcher in the `Caddyfile`, and the `Disallow` lines in `src/app/robots.ts`

Then `npm run generate:importmap` and redeploy.

To restrict the panel to known networks as well, set
`ADMIN_IP_ALLOWLIST_CADDY` in `.env` to a space-separated list of CIDRs.
Everything else gets a 404 from Caddy, before the request reaches the app.

---

## 6. Routine deploys

```bash
cd ~/higreenpanda
git pull
docker compose -f docker-compose.prod.yml run --rm tools npm run migrate
docker compose -f docker-compose.prod.yml up -d --build
```

Migrate before replacing the app, so the new container never meets an old
schema. Migrations here are additive by construction — see the rollback note
below for the exception.

No restart step: `up -d --build` replaces the container, and the runtime image
carries no warm cache. If a deploy also re-runs the seed, run it through
`tools` _before_ `up -d --build` for the reason in §2.

Removing a seeded item is a CMS action, not a code one: deleting it from
`src/seed/content.ts` stops it being recreated, but does not remove a copy the
database already holds. Delete it in the admin panel.

Migrations are checked into `src/migrations/` and applied explicitly. The app
never alters its own schema in production — `push` is off outside development,
so a bad deploy cannot silently drop a column.

Watch it come up:

```bash
docker compose -f docker-compose.prod.yml logs -f app
curl -sS https://higreenpanda.com/api/health   # {"status":"ok"}
```

### Rolling back

```bash
git checkout <previous-tag>
docker compose -f docker-compose.prod.yml up -d --build
```

If the bad deploy included a migration, roll that back first:

```bash
docker compose -f docker-compose.prod.yml run --rm tools npx payload migrate:down
```

---

## 7. Backups, and the restore you must rehearse

The `backup` service in `docker-compose.prod.yml` runs nightly at 03:15 China
time. Each run takes a custom-format `pg_dump` and a tar of the media volume,
**verifies the dump is readable by `pg_restore` before uploading it**, and
pushes both to S3-compatible object storage.

Set these in `.env`. **Hostinger does not sell S3-compatible object storage, so
this must be another provider** — Cloudflare R2 and Backblaze B2 both work and
both have usable free tiers at this size.

That is an improvement rather than a workaround. Backups belonging to a
different company from the server is stronger isolation than both sitting with
one provider: a billing dispute, a suspended account or a compromised hPanel
login takes out the server without touching the backups.

```
S3_BUCKET=higreenpanda-backups
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

Use a key that can **write and list but not delete**. An attacker who reaches
the server should not be able to erase the backups from it.

Check it is working:

```bash
docker compose -f docker-compose.prod.yml logs backup | tail -20
aws s3 ls s3://higreenpanda-backups/db/ --endpoint-url "$S3_ENDPOINT"
```

### The restore drill — twice a year, in the calendar

A restore procedure nobody has rehearsed is a hope, not a plan. This one has
been tested; do it again on a schedule so it stays true.

```bash
# 1. Fetch a dump from object storage
docker compose -f docker-compose.prod.yml exec backup \
  aws s3 cp s3://higreenpanda-backups/db/<file>.dump /backup-out/ \
  --endpoint-url "$S3_ENDPOINT"

# 2. Restore it into a scratch database, NOT the live one
docker compose -f docker-compose.prod.yml exec backup \
  /usr/local/bin/restore.sh /backup-out/<file>.dump --into restore_drill
```

The script refuses to run until you type the database name, then prints row
counts for services, posts, enquiries and users. Compare them with the live
site. Write down the date and the counts.

Then drop the scratch database.

### Rebuilding from nothing

The brief's real test: **repository plus a database dump, back up in under an
hour.** Sections 1 to 3 above, then restore into the live database instead of
a scratch one, then restore the media archive into the `media` volume:

```bash
docker compose -f docker-compose.prod.yml exec backup \
  tar -xzf /backup-out/<file>.tar.gz -C /backup-src
```

---

## 8. Search Console, after go-live

1. Verify `https://higreenpanda.com` in Google Search Console (a DNS TXT record
   is easiest and survives a hosting change).
2. Submit `https://higreenpanda.com/sitemap.xml`.
3. **Remove the injected spam URLs.** They are still in the index from the July
   compromise. Use _Removals → Temporary removals_ for anything visible now, and
   list the patterns under _Pages → Not indexed_ to catch the rest. The site
   already answers `410 Gone` for them, which Google acts on far faster than a
   404, so the removals are a shortcut rather than the mechanism.
4. Check _Pages_ after a fortnight: the old URLs from §5 of the brief should be
   showing as redirected, not as errors.
5. Add any spam URL Search Console reports that the site still answers with 404
   to the **Redirects** collection in the CMS as a `410` — no deploy needed.
6. **Bing Webmaster Tools** as well: import the Google property, then submit the
   sitemap. With `INDEXNOW_KEY` set (§8b) new articles reach Bing, Yandex, Naver
   and Seznam within minutes of publishing without this step, but the import
   gives you their reports.

### 8b. Blog automation — the switches in `.env`

Everything the blog does on its own is controlled by environment variables and
is silent until its value is set. All of them are listed with comments in
`.env.example`; set them in `/home/deploy/higreenpanda/.env` and restart `app`.

| Variable                         | What switching it on does                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INDEXNOW_KEY`                   | Every article that goes live is submitted to IndexNow at once. Any 8–128 hex characters: `openssl rand -hex 16`. The key is served at `/indexnow-key.txt`.                            |
| `METRICOOL_TOKEN` + ids          | One social post per network (default Facebook and Instagram) is scheduled through Metricool when an article goes live. Token: Metricool → Settings → API. Ids are in `.env.example`. |
| `ANTHROPIC_API_KEY`              | Nightly: key takeaways and questions are written for articles lacking them; one Arabic-only article gets an English draft. Weekly: one new bilingual draft from the content queue.   |
| `AUTOMATION=off`                 | Stops all of the above (the scheduler in `src/instrumentation.ts`).                                                                                                                 |

Nothing the Claude jobs write is published on its own. Enrichment adds
takeaways and questions to articles that are already live; translations and
new articles are saved as **drafts** for the owner to read and publish in the
CMS. Publishing is what triggers the announcement — and a publish date in the
future schedules it, so the owner can line up a month of articles on a Sunday.

To run a job by hand from the server:

```bash
cd ~/higreenpanda
docker compose -f docker-compose.prod.yml run --rm --build tools npm run posts:distribute -- --dry-run
docker compose -f docker-compose.prod.yml run --rm --build tools npm run posts:enrich -- 5
docker compose -f docker-compose.prod.yml run --rm --build tools npm run posts:draft
docker compose -f docker-compose.prod.yml run --rm --build tools npm run seo:indexnow
```

The last one submits every live URL once; run it after the first deploy of the
imported blog so the search engines learn the 212 new addresses today rather
than on their next crawl.

---

## 9. What to watch

| Thing                  | How                                                                           | How often             |
| ---------------------- | ----------------------------------------------------------------------------- | --------------------- |
| Site is up             | `curl -sS https://higreenpanda.com/api/health`                                | Uptime monitor, 1 min |
| Certificate renewal    | `docker compose -f docker-compose.prod.yml logs caddy \| grep -i certificate` | Monthly               |
| Backups ran            | `aws s3 ls s3://higreenpanda-backups/db/`                                     | Weekly                |
| Restore works          | §7 drill                                                                      | Twice a year          |
| Dependency alerts      | GitHub → Security → Dependabot                                                | As they arrive        |
| Disk space             | `df -h` and `docker system df`                                                | Monthly               |
| New enquiries          | `/hgp-studio` → Enquiries                                                     | Daily                 |
| Drafts to review       | `/hgp-studio` → Blog, filter Status = Draft; Content queue → Drafted          | Weekly                |
| Automation ran         | `docker compose -f docker-compose.prod.yml logs app \| grep automation`     | Weekly                |
| Mail records unchanged | `dig +short MX higreenpanda.com` and one `v=spf1` / one `_dmarc` TXT          | After any DNS change  |

Set `SENTRY_DSN` in `.env` to get errors reported rather than discovered.

The mail row is there because a DNS panel and a published zone can disagree —
they did, three times, during one change in §4a. Whenever anything in this
zone is touched, re-check that MX is unchanged and that SPF and DMARC each
return exactly one record. Two of either is the failure described in §4a, and
nothing in the console will say so.

An uptime monitor should check `/api/health`, not `/` — that endpoint makes a
real database query, so a container that is up but cannot reach Postgres is
reported as down instead of looking healthy.

---

## 10. Phase 2 — what is already in place

The client portal and subscriptions are not built, but nothing blocks them:

- **`Customers`** is a separate auth collection with a `role` field, empty and
  unreachable. Keeping portal accounts out of the staff `users` table from day
  one is the one decision that could not have been retrofitted cheaply.
- **`Enquiries`** already carries `status`, `assignedTo` and a `customer`
  relation, so an enquiry can become a quote and then an order by adding
  fields rather than rewriting the table.
- Payload's access control is per-collection, so portal routes can reuse it.

When the portal is built it is new routes under `/portal`, a login that uses the
`customers` collection, and `Plans` / `Subscriptions` collections. Keep payment
logic out of the presentation layer.
