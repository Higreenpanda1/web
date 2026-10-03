#!/usr/bin/env bash
# Connects the website's application forms to HubSpot.
#
# Asks for the HubSpot private app token, saves it as HUBSPOT_TOKEN in the
# server's .env (never in git), then runs the normal deployment so the site
# picks up the new code and the token. Safe to run again: it replaces the
# token instead of adding a second line.
#
# Run from hPanel → VPS → Browser terminal (pin the commit, see HANDOVER.md):
#   curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/<sha>/ops/hubspot.sh | bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/deploy/higreenpanda}"
ENV_FILE="$APP_DIR/.env"
BRANCH="${BRANCH:-claude/practical-newton-m55sbw}"

[ -f "$ENV_FILE" ] || { echo "No $ENV_FILE — run ops/deploy.sh first." >&2; exit 1; }
[ -r /dev/tty ] || { echo "Run this in a terminal: it needs to ask for the token." >&2; exit 1; }

printf 'Paste the HubSpot token (it starts with pat-), then press Enter: ' >/dev/tty
IFS= read -rs token </dev/tty
printf '\n' >/dev/tty
token="$(printf '%s' "$token" | tr -d '[:space:]')"

case "$token" in
  pat-*) ;;
  *) echo "That does not look like a HubSpot private app token (pat-...). Nothing changed." >&2; exit 1 ;;
esac

# Check the token against HubSpot before saving it.
status="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $token" \
  'https://api.hubapi.com/crm/v3/objects/deals?limit=1')"
if [ "$status" != "200" ]; then
  echo "HubSpot refused the token (HTTP $status). Check it has the deals and contacts" >&2
  echo "read/write scopes. Nothing changed." >&2
  exit 1
fi
echo "Token accepted by HubSpot."

tmp="$(mktemp)"
grep -v '^HUBSPOT_TOKEN=' "$ENV_FILE" >"$tmp" || true
printf 'HUBSPOT_TOKEN=%s\n' "$token" >>"$tmp"
cat "$tmp" >"$ENV_FILE"
rm -f "$tmp"
chmod 600 "$ENV_FILE"
echo "Saved to $ENV_FILE."

echo "Updating the site — the deployment asks a few questions; press Enter to keep each answer."
curl -fsSL -H 'Cache-Control: no-cache' \
  "https://raw.githubusercontent.com/Higreenpanda1/web/${BRANCH}/ops/deploy.sh" | bash
