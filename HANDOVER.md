# Handover — HiGreenPanda website

Written 20 September 2026, at the end of the session that deployed the site.
Everything below is verified state, not intention. Where something is
unfinished it says so.

---

## Where things stand

The site is **built, running and reachable** on its own server. The domain has
**not** been moved yet, so `higreenpanda.com` still points at the old host and
nothing customer-facing has changed.

- **Live preview:** https://srv1994320.hstgr.cloud
- **CMS:** https://srv1994320.hstgr.cloud/hgp-studio-gate
- **Repository:** `Higreenpanda1/web`, branch `claude/practical-newton-m55sbw`

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

| | |
|---|---|
| Host | Hostinger KVM 2 — 2 vCPU, 8 GB RAM, 100 GB NVMe |
| Address | `187.77.153.108` |
| Hostname | `srv1994320.hstgr.cloud` (real A and AAAA records, points here) |
| OS | Ubuntu 26.04.1 LTS |
| App directory | `/home/deploy/higreenpanda` |
| Compose file | `docker-compose.prod.yml` |
| Containers | `db`, `app`, `caddy` (plus `backup`, and `tools` under a profile) |

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

| Script | What it does |
|---|---|
| `ops/bootstrap.sh` | Server hardening: Docker, ufw, unattended-upgrades, fail2ban, the `deploy` user. Skips SSH hardening when no key is present. |
| `ops/deploy.sh` | The whole deployment: clone, `.env`, database, migrate, seed, build, health check, two-factor enrolment. |
| `ops/preview.sh` | Turns the preview hostname on or off. Restarts only Caddy — no rebuild. `bash -s -- off` reverses it. |

### Run them with a commit-pinned URL

`raw.githubusercontent.com` caches for several minutes, and a `?v=` query does
not reliably beat it. During this session a fix was pushed and the next run
executed the *previous* version twice, which is indistinguishable from the fix
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
- **Caddy must be validated before restarting.** `up -d` reports success even
  when the container starts and immediately dies, and for the proxy that means
  the whole site is down. Both scripts validate in a throwaway container first.

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

1. **hPanel snapshot** of the VPS. One-click undo for everything so far.
   Should happen before the DNS change.
2. **DNS cutover** — `DEPLOY.md` §3. The only step that touches anything live.
   Rollback values, recorded before any change: root `A` → `15.197.148.33` and
   `3.33.130.190`; `www` is a `CNAME`, not an A record; TTL 600; there is no
   CAA record and that is fine.
3. **Turn the preview off** once the real domain is live:
   `ops/preview.sh` with `bash -s -- off`.
4. **Resend API key** — until it is set, enquiries are stored but not emailed.
5. **Off-server backups** — `S3_*` in `.env` are empty, so the nightly job
   writes to `./.backups` on the same machine. That is not a backup. See
   `DEPLOY.md` §7, including the restore drill.
6. **HubSpot** — `DEPLOY.md` §4b, parked. The portal has not completed
   onboarding, so the DKIM CNAMEs do not exist yet. That portal step is a hard
   prerequisite; do not add DNS records for it before then.
7. **SSH key**, then re-run `ops/bootstrap.sh` to disable password login.

## Verified, so you do not have to re-check

Done in the sandbox before deployment: Lighthouse 97–99 / 100 / 100 / 100
across seven pages; 25 unit tests; 23 route status checks; a backup and
restore round trip against a live database; single-use backup codes; a
password-only REST login correctly refused with 403.

Not yet verified on the real server: nothing beyond the health check and route
spot-checks that `ops/deploy.sh` runs. The site has not been looked at by
anyone but its owner.
