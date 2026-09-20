#!/usr/bin/env bash
#
# HiGreenPanda — turn the preview address on or off.
#
# Lets you look at the site over HTTPS before DNS is moved, using the hostname
# the VPS provider already gave this machine. Touches nothing but the proxy:
# no rebuild, no database, no downtime beyond a Caddy reload.
#
#   curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/claude/practical-newton-m55sbw/ops/preview.sh | bash
#   curl -fsSL .../ops/preview.sh | bash -s -- off
#
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/deploy/higreenpanda}"
COMPOSE="docker compose -f docker-compose.prod.yml"
CADDY_IMAGE="caddy:2.10-alpine"

c_ok=$'\033[0;32m'; c_warn=$'\033[0;33m'; c_err=$'\033[0;31m'
c_step=$'\033[1;36m'; c_bold=$'\033[1m'; c_off=$'\033[0m'
step() { printf '\n%s==> %s%s\n' "$c_step" "$1" "$c_off"; }
ok()   { printf '%s  ok%s %s\n' "$c_ok" "$c_off" "$1"; }
warn() { printf '%s  !!%s %s\n' "$c_warn" "$c_off" "$1"; }
die()  { printf '\n%serror%s %s\n\n' "$c_err" "$c_off" "$1" >&2; exit 1; }
trap 'printf "\n%s==> STOPPED%s at line %s: %s\n\n" "$c_err" "$c_off" "$LINENO" "$BASH_COMMAND" >&2' ERR

# Does <hostname> actually point at <ip>, as the rest of the world sees it?
#
# Not a question the local resolver can answer. Cloud images put a line like
# "127.0.1.1 srv1994320.hstgr.cloud" in /etc/hosts, and NSS stops at the first
# source that has the name — so getent returns loopback and never asks DNS.
# That made this check reject a hostname whose A record was correct all along.
# Ask a public resolver over HTTPS instead, and fall back to getent only for
# non-loopback answers.
resolves_to() { # resolves_to <hostname> <ip>
  local host="$1" ip="$2" answers=""
  answers=$(curl -fsS --max-time 10 -H 'accept: application/dns-json' \
              "https://dns.google/resolve?name=${host}&type=A" 2>/dev/null \
            | tr ',' '\n' | sed -n 's/.*"data":"\([0-9.]*\)".*/\1/p') || true
  if [ -z "$answers" ]; then
    answers=$(getent ahostsv4 "$host" 2>/dev/null | awk '$1 !~ /^127\./ {print $1}' | sort -u)
  fi
  [ -n "$answers" ] && printf '%s\n' "$answers" | grep -qxF "$ip"
}

[ -d "$APP_DIR" ] || die "$APP_DIR does not exist. Run ops/deploy.sh first."
cd "$APP_DIR"

MODE="${1:-on}"

step "Getting the latest proxy configuration"
git config --global --get-all safe.directory 2>/dev/null | grep -qxF "$APP_DIR" \
  || git config --global --add safe.directory "$APP_DIR"
git fetch origin --quiet
git reset --hard "$(git rev-parse --abbrev-ref '@{u}')" --quiet
ok "up to date"

# ── work out the address ─────────────────────────────────────────────────────
SITE_DOMAIN=$(grep '^SITE_DOMAIN=' .env | cut -d= -f2-)

if [ "$MODE" = "off" ]; then
  HOST=""
  step "Turning the preview address off"
else
  step "Working out this server's own hostname"
  HOST=$(hostname -f 2>/dev/null || true)
  case "$HOST" in
    "$SITE_DOMAIN"|"www.$SITE_DOMAIN")
      die "This server's hostname is already the site's domain. Nothing to preview."
      ;;
    *.*.*) : ;;
    *) die "This server has no public hostname, so there is no preview address.
Point DNS at it (DEPLOY.md §3) to see the site." ;;
  esac

  # An address Caddy cannot prove it owns means an hour of failed certificate
  # challenges, so confirm the name really points back here before using it.
  public_ip=$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)
  [ -n "$public_ip" ] || die "Could not determine this server's public address."
  if ! resolves_to "$HOST" "$public_ip"; then
    die "$HOST does not resolve to $public_ip in public DNS, so a certificate
for it cannot be issued. Nothing has been changed."
  fi
  ok "$HOST resolves to $public_ip"
fi

# ── write it, once ───────────────────────────────────────────────────────────
if grep -q '^PREVIEW_HOSTNAME=' .env; then
  sed -i "s|^PREVIEW_HOSTNAME=.*|PREVIEW_HOSTNAME=${HOST}|" .env
else
  printf 'PREVIEW_HOSTNAME=%s\n' "$HOST" >> .env
fi
ok ".env updated"

# ── prove it parses before restarting the thing that serves the site ─────────
step "Checking the configuration"
docker run --rm \
  -e SITE_DOMAIN="$SITE_DOMAIN" \
  -e ADMIN_IP_ALLOWLIST_CADDY="$(grep '^ADMIN_IP_ALLOWLIST_CADDY=' .env | cut -d= -f2-)" \
  -e PREVIEW_HOSTNAME="${HOST:-localhost}" \
  -v "$APP_DIR/Caddyfile:/etc/caddy/Caddyfile:ro" \
  "$CADDY_IMAGE" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile \
  >/dev/null 2>&1 || die "The Caddyfile does not parse. Nothing was restarted;
the site is exactly as it was."
ok "valid"

step "Restarting the proxy"
$COMPOSE up -d caddy </dev/null
sleep 5
$COMPOSE ps caddy

# ── did it survive? ──────────────────────────────────────────────────────────
if [ "$($COMPOSE ps -q caddy | xargs -r docker inspect -f '{{.State.Running}}')" != "true" ]; then
  printf '\n%sCaddy is not running.%s Last 30 lines:\n\n' "$c_err" "$c_off"
  $COMPOSE logs --tail 30 caddy || true
  exit 1
fi

if [ "$MODE" = "off" ]; then
  step "Done"
  echo
  echo "  The preview address is off. The site answers on $SITE_DOMAIN only."
  echo
else
  step "Done"
  cat <<EOF

  Open this in a browser:

    ${c_bold}https://${HOST}${c_off}

  The first load can take up to a minute while a certificate is issued. If it
  shows a security warning, wait thirty seconds and reload — that is the
  certificate still arriving, not a problem with the site.

  Links on the page will say ${SITE_DOMAIN}, which is correct: this address
  is a preview, and it is marked noindex so search engines ignore it.

EOF
fi
