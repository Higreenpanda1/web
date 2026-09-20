#!/usr/bin/env bash
#
# HiGreenPanda — first deployment, guided.
#
# Everything in DEPLOY.md §1 and §2 as one script. It asks a few questions and
# does the rest. Written for someone pasting into a terminal rather than living
# in one: it installs what is missing, generates its own passwords, never
# overwrites a secret it did not create, and prints exactly what went wrong if
# something fails.
#
# Run it as root on a fresh Ubuntu 24.04 server:
#
#   curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/claude/practical-newton-m55sbw/ops/deploy.sh | bash
#
# Safe to run again. On a second run it reuses the existing .env, pulls the
# latest code, re-applies migrations and restarts — it will not reset the
# database or change your passwords.
set -euo pipefail

REPO="https://github.com/Higreenpanda1/web.git"
BRANCH="${BRANCH:-claude/practical-newton-m55sbw}"
APP_DIR="${APP_DIR:-/home/deploy/higreenpanda}"
RAW="https://raw.githubusercontent.com/Higreenpanda1/web/${BRANCH}"
COMPOSE="docker compose -f docker-compose.prod.yml"

c_ok=$'\033[0;32m'; c_warn=$'\033[0;33m'; c_err=$'\033[0;31m'
c_step=$'\033[1;36m'; c_bold=$'\033[1m'; c_off=$'\033[0m'
step() { printf '\n%s==> %s%s\n' "$c_step" "$1" "$c_off"; }
ok()   { printf '%s  ok%s %s\n' "$c_ok" "$c_off" "$1"; }
warn() { printf '%s  !!%s %s\n' "$c_warn" "$c_off" "$1"; }
die()  { printf '\n%serror%s %s\n\n' "$c_err" "$c_off" "$1" >&2; exit 1; }

# ── talking to the human ─────────────────────────────────────────────────────
# This script is meant to be piped straight from curl into bash, which means
# stdin is the script itself, not the keyboard. Every prompt therefore reads
# from the controlling terminal explicitly. If there is no terminal at all —
# cron, CI — the questions fall back to their defaults instead of hanging.
TTY=""
if [ -r /dev/tty ] && [ -w /dev/tty ]; then TTY=/dev/tty; fi

ask() { # ask VARNAME "prompt text" "default"
  local __var="$1" __prompt="$2" __default="${3:-}" __reply=""
  if [ -n "$TTY" ]; then
    printf '%s' "$__prompt" >"$TTY"
    IFS= read -r __reply <"$TTY" || __reply=""
  fi
  printf -v "$__var" '%s' "${__reply:-$__default}"
}

pause() { # pause "press enter text"
  [ -z "$TTY" ] && return 0
  printf '%s' "$1" >"$TTY"
  IFS= read -r _ <"$TTY" || true
}

# ── who is running this ──────────────────────────────────────────────────────
step "Checking where we are"

if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || die "This needs to run as root, and sudo is not installed.
Log in as root and paste the command again."
  warn "not root — re-running through sudo"
  exec sudo -E bash -c "$(curl -fsSL "${RAW}/ops/deploy.sh")"
fi
ok "running as root on $(. /etc/os-release 2>/dev/null && echo "${PRETTY_NAME:-this machine}")"

mem_gb=$(( $(awk '/MemTotal/ {print $2}' /proc/meminfo) / 1024 / 1024 ))
if [ "$mem_gb" -lt 7 ]; then
  warn "${mem_gb} GB RAM — the build below may be slow or fail under 8 GB."
else
  ok "${mem_gb} GB RAM"
fi

disk_gb=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
if [ "$disk_gb" -lt 15 ]; then
  warn "${disk_gb} GB free disk — the build needs roughly 10 GB of headroom."
else
  ok "${disk_gb} GB free disk"
fi

# ── code ─────────────────────────────────────────────────────────────────────
step "Getting the code"

if ! command -v git >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git ca-certificates curl >/dev/null
  ok "installed git"
fi

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH" --quiet
  git -C "$APP_DIR" checkout "$BRANCH" --quiet
  git -C "$APP_DIR" reset --hard "origin/$BRANCH" --quiet
  ok "updated $APP_DIR to the latest $BRANCH"
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" --quiet "$REPO" "$APP_DIR"
  ok "cloned into $APP_DIR"
fi
cd "$APP_DIR"

# ── the server itself ────────────────────────────────────────────────────────
# bootstrap.sh is DEPLOY.md §1: Docker, the firewall, unattended upgrades, the
# deploy user, SSH hardening. It is idempotent, and it refuses to touch the SSH
# config unless it can first count a working key — so running it from a
# password session cannot lock you out.
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  step "Preparing the server (Docker, firewall, automatic security updates)"
  bash ops/bootstrap.sh
fi

command -v docker >/dev/null 2>&1 || die "Docker still is not installed. Read the output above."
docker compose version >/dev/null 2>&1 || die "The Docker Compose plugin is still missing. Read the output above."
docker info >/dev/null 2>&1 || die "Cannot talk to Docker. Try: systemctl start docker"
ok "docker $(docker --version | awk '{print $3}' | tr -d ,)"

if id deploy >/dev/null 2>&1; then
  chown -R deploy:deploy "$APP_DIR"
fi

# ── configuration ────────────────────────────────────────────────────────────
step "Configuration"

if [ -f .env ]; then
  ok ".env already exists — keeping your existing settings and passwords"
else
  echo
  echo "  A few questions. Press Enter to accept the answer in brackets."
  echo

  ask SITE_DOMAIN "  Website domain [higreenpanda.com]: "              "higreenpanda.com"
  ask ADMIN_EMAIL "  Your login email for the CMS [admin@higreenpanda.com]: " "admin@higreenpanda.com"
  ask NOTIFY_TO   "  Send enquiry notifications to [contact@higreenpanda.com]: " "contact@higreenpanda.com"

  echo
  echo "  Resend API key, for emailing enquiry notifications."
  echo "  Leave it blank for now — enquiries are still saved to the database"
  echo "  either way, and you can add the key later."
  ask RESEND_KEY "  Resend API key [skip]: " ""

  # Generated, never typed. A different secret for each purpose.
  PAYLOAD_SECRET=$(openssl rand -base64 32)
  POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)

  umask 077
  cat > .env <<EOF
# Written by ops/deploy.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Keep this file secret. It is excluded from git.

NEXT_PUBLIC_SERVER_URL=https://${SITE_DOMAIN}
SITE_DOMAIN=${SITE_DOMAIN}
PAYLOAD_SECRET=${PAYLOAD_SECRET}

DATABASE_URI=postgres://higreenpanda:${POSTGRES_PASSWORD}@db:5432/higreenpanda
POSTGRES_USER=higreenpanda
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=higreenpanda

ADMIN_REQUIRE_2FA=true
ADMIN_IP_ALLOWLIST_CADDY=0.0.0.0/0
MEDIA_DIR=/app/media

RESEND_API_KEY=${RESEND_KEY}
EMAIL_FROM_ADDRESS=website@${SITE_DOMAIN}
EMAIL_FROM_NAME=HiGreenPanda
ENQUIRY_NOTIFY_TO=${NOTIFY_TO}

NEXT_PUBLIC_ANALYTICS_PROVIDER=
NEXT_PUBLIC_ANALYTICS_SCRIPT_URL=
NEXT_PUBLIC_ANALYTICS_SITE_ID=${SITE_DOMAIN}
SENTRY_DSN=

S3_BUCKET=
S3_REGION=
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

SEED_ADMIN_EMAIL=${ADMIN_EMAIL}
SEED_ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
  chmod 600 .env
  ok "wrote .env with freshly generated passwords"
  printf '\n  %sWrite this down now — it is shown once:%s\n' "$c_bold" "$c_off"
  printf '    CMS login: %s\n' "$ADMIN_EMAIL"
  printf '    Password:  %s%s%s\n\n' "$c_bold" "$ADMIN_PASSWORD" "$c_off"
  pause "  Saved it? Press Enter to continue. "
fi

SITE_DOMAIN=$(grep '^SITE_DOMAIN=' .env | cut -d= -f2-)
ADMIN_EMAIL=$(grep '^SEED_ADMIN_EMAIL=' .env | cut -d= -f2-)

# ── database, then content, then the site ────────────────────────────────────
# Order matters. The schema has to exist before the seed can write to it, and
# the content has to exist before the app starts — otherwise the app caches an
# empty sitemap and an empty redirect table for an hour.
step "Starting the database"
$COMPOSE up -d --build db
ok "database running"

step "Creating the database tables (this can take a minute)"
$COMPOSE run --rm -T tools npm run migrate
ok "tables created"

step "Loading the services, articles and settings"
$COMPOSE run --rm -T tools npm run seed
ok "content loaded"

step "Building and starting the website (the slow part — several minutes)"
$COMPOSE up -d --build
ok "all services started"

# ── health ───────────────────────────────────────────────────────────────────
step "Checking it works"

healthy=0
for i in $(seq 1 90); do
  if $COMPOSE exec -T app node -e \
      "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      >/dev/null 2>&1; then
    healthy=1
    ok "the site answered after ${i}s"
    break
  fi
  sleep 1
done

if [ "$healthy" -eq 0 ]; then
  printf '\n%sThe site did not come up.%s Copy everything below and send it for help:\n\n' "$c_err" "$c_off"
  echo "----- SERVICE STATUS -----"; $COMPOSE ps || true
  echo; echo "----- APP LOG -----";      $COMPOSE logs --tail 60 app || true
  echo; echo "----- DATABASE LOG -----"; $COMPOSE logs --tail 20 db  || true
  echo; echo "--------------------------"
  exit 1
fi

# Asked of the app directly rather than through Caddy: the domain does not
# point here yet, so Caddy would answer every one of these with a redirect to
# a hostname that resolves somewhere else entirely.
echo
echo "  Expected: 200, 200, 200, 410 (spam page), 301 (old URL)."
echo
$COMPOSE exec -T app node -e "
const paths = ['/', '/en', '/services', '/slot-gacor', '/en/home/'];
(async () => {
  for (const p of paths) {
    let out;
    try {
      const r = await fetch('http://127.0.0.1:3000' + p, { redirect: 'manual' });
      out = String(r.status);
    } catch (e) {
      out = 'failed: ' + e.message;
    }
    console.log('    ' + p.padEnd(14) + out);
  }
})();
" || warn "could not run the route checks"

# ── second factor ────────────────────────────────────────────────────────────
step "Setting up two-factor sign-in for the CMS"

if [ -z "$TTY" ]; then
  warn "no terminal available, so the QR code cannot be shown here."
  echo "    Run this later, logged in to the server:"
  echo "      cd $APP_DIR && $COMPOSE run --rm tools npm run totp:enrol -- $ADMIN_EMAIL"
else
  cat <<'EOF'

  You need an authenticator app on your phone. Google Authenticator, Microsoft
  Authenticator and 1Password all work.

  A QR code will appear below. Open the app, choose "add account" or "+",
  scan it, then type the six digits it shows.

EOF
  pause "  Ready? Press Enter. "
  $COMPOSE run --rm tools npm run totp:enrol -- "$ADMIN_EMAIL" <"$TTY" || \
    warn "enrolment did not finish. Run it again with:
      cd $APP_DIR && $COMPOSE run --rm tools npm run totp:enrol -- $ADMIN_EMAIL"
fi

# ── done ─────────────────────────────────────────────────────────────────────
step "Done"

# .env and anything the run created were written as root. Hand the tree back
# to the deploy user, so §6's routine deploys work without sudo.
if id deploy >/dev/null 2>&1; then
  chown -R deploy:deploy "$APP_DIR"
fi

cat <<EOF

  The website is running on this server.

  It is not reachable from the internet yet, because the domain still points
  somewhere else. That is deliberate — the next step is the DNS change in
  DEPLOY.md §3, and it is much safer to do it now that the site is proven.

  Before that, two things:

    1. In hPanel, take a snapshot of this VPS. It is a one-click undo for
       everything up to this point.

    2. Send whoever is helping you the output above, so they can check it.

  After the DNS change, your CMS will be at:
    https://${SITE_DOMAIN}/hgp-studio-gate

EOF
