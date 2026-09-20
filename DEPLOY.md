# Deploying HiGreenPanda

Everything needed to put this site on a Hetzner VPS, and to rebuild it from
nothing if the server disappears.

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

A Hetzner **CX22** (2 vCPU, 4 GB, 40 GB) is enough for this site with room to
spare. Choose a location close to the audience — Falkenstein or Nuremberg are
fine for the Gulf; Singapore is closer but costs more.

```bash
# As root, immediately after first boot
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Lock down SSH: keys only, no root login
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# Firewall: SSH and HTTP(S) only. Postgres is never exposed.
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

# Unattended security updates
apt-get update && apt-get install -y unattended-upgrades fail2ban
dpkg-reconfigure -plow unattended-upgrades
systemctl enable --now fail2ban
```

Install Docker from Docker's own repository (the distribution package lags):
<https://docs.docker.com/engine/install/ubuntu/>.

Also set up Hetzner's own firewall in the cloud console, as a second layer that
survives a mistake in `ufw`.

---

## 2. Deploy the stack

Do this **before** pointing DNS at the box. The images are built here, on the
server — the container images cannot be built in a sandbox whose egress policy
blocks Docker Hub's layer CDN, and that build has therefore never been
exercised. Expect to debug it here, with no traffic arriving, rather than
after the domain is live.

```bash
sudo -iu deploy
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

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npm run migrate
docker compose -f docker-compose.prod.yml exec app npm run seed
```

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
```

Do not continue until all of that is right.

`seed` creates the eight services, the three articles, the founder record, the
redirects and the first admin user from `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`. It is idempotent — re-running it updates rather than
duplicates, and it never deletes anything an editor has created.

```bash
docker compose -f docker-compose.prod.yml restart app
```

That restart is not optional. The seed runs in its own process, so it cannot
drop the running server's cache the way an edit in the admin panel does — page
data is cached for an hour, and without the restart the site can serve
pre-seed content for that long. Editing through the admin needs no restart:
publishing drops exactly the cache tag it touched.

Then **clear `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env`**; they
are only needed once.

### Enrol the second factor

```bash
docker compose -f docker-compose.prod.yml exec app npm run totp:enrol -- admin@higreenpanda.com
```

Scan the QR code, type the six digits to confirm, and **write down the ten
backup codes somewhere other than this server**. They are stored as hashes and
cannot be shown again.

Sign in at `https://higreenpanda.com/hgp-studio-gate`.

---

## 3. DNS — only once the stack is healthy

Now, and not before: with the stack already proven on the box, pointing DNS is
what triggers Caddy to request a certificate, and a broken app behind it just
burns Let's Encrypt rate limits.

**Add or change only the records in this table.** Do not touch MX, SPF, DKIM
or DMARC here — mail is working and §4 covers the only change it needs.

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `<server IPv4>` | 1 hour |
| AAAA | @ | `<server IPv6>` | 1 hour |
| A | www | `<server IPv4>` | 1 hour |
| AAAA | www | `<server IPv6>` | 1 hour |
| CAA | @ | `0 issue "letsencrypt.org"` | 1 hour |

The `CAA` record means no certificate authority other than Let's Encrypt can
issue a certificate for this domain — cheap insurance against a mis-issued
certificate.

The `.net` mirror can point at the same server; the Caddyfile already redirects
it to the apex.

Then wait for propagation and watch Caddy issue the certificate:

```bash
dig higreenpanda.com +short
docker compose -f docker-compose.prod.yml logs -f caddy | grep -i certificate
curl -sI https://higreenpanda.com/ | head -3
```

If the certificate request fails, Caddy backs off with increasing delays, so
fix the cause rather than restarting repeatedly.

---

## 4. Email — the one change it needs

**Mail is working. Do not modify the MX, SPF policy, DKIM or DMARC policy
records.** As published, the domain has:

| Record | Value | State |
|--------|-------|-------|
| MX | `1 smtp.google.com` | Correct — Google Workspace's current single-record format, which replaced the old five-record `ASPMX.L.GOOGLE.COM` set |
| SPF | `v=spf1 include:_spf.google.com ~all` | Correct for Google-sent mail |
| DKIM | `google._domainkey`, 2048-bit | Correct |
| DMARC | `v=DMARC1; p=quarantine; adkim=r; aspf=r` | Policy correct |

The mailbox was created on 19 September, which is why nothing in it predates
that date. Anything sent before the mailbox existed bounced at the sender and
no DNS change brings it back.

### Two changes, both before any HubSpot campaign sends

HubSpot was connected to `contact@higreenpanda.com` on 19 September. With
`p=quarantine` in force and HubSpot not authorised for the domain, marketing
mail sent as `contact@higreenpanda.com` will be quarantined by receivers.

**1. Authorise HubSpot to send as the domain.**

Get the exact records from HubSpot — Settings → Content → Domains & URLs →
*Connect a domain* → **Email Sending**. It generates values specific to the
portal, so do not copy them from anywhere else.

Add HubSpot to SPF, keeping Google first and the `~all` as it is:

```
v=spf1 include:_spf.google.com include:<portal-id>.spf<nn>.hubspotemail.net ~all
```

Then publish the DKIM `CNAME` records HubSpot gives you (they look like
`hs1-<id>._domainkey` and `hs2-<id>._domainkey`).

> **Publish the DKIM records, not just the SPF include.** DMARC passes when
> *either* SPF or DKIM aligns with the visible From domain, and SPF alignment
> is judged against the return-path, not the From address. HubSpot's default
> return-path is a HubSpot-owned domain, so SPF will not align to
> higreenpanda.com however the include is written — even under the relaxed
> `aspf=r` already in the record. HubSpot's DKIM signs as
> `d=higreenpanda.com`, which does align. The SPF include is still worth
> adding, because plenty of receivers check SPF on its own, but DKIM is what
> actually stops the quarantine.

Verify before sending to a real list — send one campaign to a personal Gmail
address and read the raw headers:

```
Authentication-Results: mx.google.com;
  dkim=pass header.i=@higreenpanda.com;
  spf=pass ...;
  dmarc=pass (p=QUARANTINE sp=QUARANTINE dis=NONE) header.from=higreenpanda.com
```

`dmarc=pass` with `header.from=higreenpanda.com` is the line that matters.

**2. Point the DMARC reports somewhere they are read.**

The `rua` is currently GoDaddy's default, `dmarc_rua@onsecureserver.net`,
which nobody at HiGreenPanda can open. With `p=quarantine` that means mail is
being quarantined with no visibility into what or why. Change only the `rua`
tag and leave the policy alone:

```
v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:contact@higreenpanda.com
```

The reports are daily XML aggregates and are unreadable by hand; feed the
address to a DMARC report reader, or expect to ignore them. An address nobody
reads is still better than one nobody can.

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
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npm run migrate
```

If a deploy also re-runs `npm run seed`, restart the app afterwards for the
reason in §2. A plain deploy needs no restart — `up -d --build` already
replaces the container, and the runtime image carries no warm cache.

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
docker compose -f docker-compose.prod.yml exec app npx payload migrate:down
```

---

## 7. Backups, and the restore you must rehearse

The `backup` service in `docker-compose.prod.yml` runs nightly at 03:15 China
time. Each run takes a custom-format `pg_dump` and a tar of the media volume,
**verifies the dump is readable by `pg_restore` before uploading it**, and
pushes both to S3-compatible object storage.

Set these in `.env` — Hetzner Object Storage, Cloudflare R2 and Backblaze B2 all
work:

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
hour.** Steps 1, 2 and 3 above, then restore into the live database instead of
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
   compromise. Use *Removals → Temporary removals* for anything visible now, and
   list the patterns under *Pages → Not indexed* to catch the rest. The site
   already answers `410 Gone` for them, which Google acts on far faster than a
   404, so the removals are a shortcut rather than the mechanism.
4. Check *Pages* after a fortnight: the old URLs from §5 of the brief should be
   showing as redirected, not as errors.
5. Add any spam URL Search Console reports that the site still answers with 404
   to the **Redirects** collection in the CMS as a `410` — no deploy needed.

---

## 9. What to watch

| Thing | How | How often |
|-------|-----|-----------|
| Site is up | `curl -sS https://higreenpanda.com/api/health` | Uptime monitor, 1 min |
| Certificate renewal | `docker compose -f docker-compose.prod.yml logs caddy \| grep -i certificate` | Monthly |
| Backups ran | `aws s3 ls s3://higreenpanda-backups/db/` | Weekly |
| Restore works | §7 drill | Twice a year |
| Dependency alerts | GitHub → Security → Dependabot | As they arrive |
| Disk space | `df -h` and `docker system df` | Monthly |
| New enquiries | `/hgp-studio` → Enquiries | Daily |

Set `SENTRY_DSN` in `.env` to get errors reported rather than discovered.

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
