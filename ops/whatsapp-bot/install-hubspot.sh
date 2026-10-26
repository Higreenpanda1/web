#!/usr/bin/env bash
# Connects the WhatsApp bot (/opt/higreenpanda-bot, pm2 "higreenpanda-bot") to
# HubSpot: every customer who writes to the bot becomes a HubSpot contact
# (matched by WhatsApp number, like the website), and each conversation is
# saved on the contact as a note. See ops/whatsapp-bot/README.md.
#
# Uses the HubSpot token the website already has (/home/deploy/higreenpanda/.env),
# so nothing is pasted. Backs the bot's code up first, runs the bot's
# self-test, and puts the old code back by itself if anything fails.
#
# Run from hPanel → VPS → Browser terminal, with the commit pinned:
#   curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/<sha>/ops/whatsapp-bot/install-hubspot.sh | REF=<sha> bash
# Undo (puts the code from the last backup back and restarts the bot):
#   curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/<sha>/ops/whatsapp-bot/install-hubspot.sh | REF=<sha> bash -s -- undo
set -euo pipefail

BOT_DIR="${BOT_DIR:-/opt/higreenpanda-bot}"
BOT_NAME="${BOT_NAME:-higreenpanda-bot}"
SITE_ENV="${SITE_ENV:-/home/deploy/higreenpanda/.env}"
REF="${REF:-claude/practical-newton-m55sbw}"
RAW="${RAW:-https://raw.githubusercontent.com/Higreenpanda1/web/${REF}/ops/whatsapp-bot/files}"
BACKUPS="${BOT_DIR}-backups"

FILES=(src/hubspot.js src/engine.js test.js scripts/chat.js)
# The bot as installed on 25 Sep 2026 (higreenpanda-bot.zip in Drive). If the
# server's copy is different, someone changed it since, and this stops.
declare -A OLD=(
  [src/engine.js]=cba9fc555ff4961c4d3ac4d475cf95867cc9f845d602b8114116b0f27cc35866
  [test.js]=0ade8bf9718eacf0a91b162836c9001cf8b6d1750c4848a254dbed286bba6cc1
  [scripts/chat.js]=d660d129ce41956bbffcdf9d742035595a388086c5e79740d2d74f84b709dfae
)
# The first HubSpot version (installed 26 Oct 2026, commit 6793351a): updating from it is fine too.
declare -A V1=(
  [src/hubspot.js]=9d5d008887bc6cf541ec3eb1c361a38b6b5b622f75e955bac41c2d2ad4263941
  [src/engine.js]=de789d31aebcbdfdf88bfb834d3e2efc8e44e7fe40b6320a02b9e9329f28efe5
  [test.js]=f66e1759c98a08b0af153152fcd681552d0bff2b51865dfa4865e35f61017774
  [scripts/chat.js]=a83e1d195d00c92c85fb3c34d9cba43494ead5106df2f7fb3bbffcdc4fa0a645
)
declare -A NEW=(
  [src/hubspot.js]=46cf0d7bc299a372b0c2bf45c74e4dc881015ec90e00a4df09f552913ae0d953
  [src/engine.js]=31736039212925ae7dcc91898b25c1ba60e662f87f94243b435fe63f844aeb94
  [test.js]=910ca206f41f0e1b0a120e00f9434d5c108d9040b023decf7e8c3ffe10158d94
  [scripts/chat.js]=a83e1d195d00c92c85fb3c34d9cba43494ead5106df2f7fb3bbffcdc4fa0a645
)

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\n❌ %s\n' "$*" >&2; exit 1; }
sum() { sha256sum "$1" 2>/dev/null | cut -d' ' -f1; }

[ -d "$BOT_DIR" ] || die "The bot folder $BOT_DIR is not on this server."
cd "$BOT_DIR"

restore() {
  local from="$1"
  for f in "${FILES[@]}"; do
    if [ -f "$from/$f" ]; then cp -p "$from/$f" "$f"; else rm -f "$f"; fi
  done
  # back to the bot from before HubSpot → the token goes too; back to an older HubSpot version → it stays
  if [ ! -f "$from/src/hubspot.js" ]; then rm -f hubspot.env; fi
  pm2 restart "$BOT_NAME" >/dev/null
}

if [ "${1:-}" = "undo" ]; then
  last="$(ls -1d "$BACKUPS"/* 2>/dev/null | tail -1 || true)"
  [ -n "$last" ] || die "No backup found in $BACKUPS."
  restore "$last"
  echo "↩️  The bot is back to the code saved in $last."
  exit 0
fi

say "Checking the bot's code"
installed=1
for f in "${FILES[@]}"; do [ "$(sum "$f")" = "${NEW[$f]}" ] || installed=0; done
if [ "$installed" = 0 ]; then
  v1=1
  for f in "${FILES[@]}"; do [ "$(sum "$f")" = "${V1[$f]}" ] || v1=0; done
  if [ "$v1" = 1 ]; then
    echo "   OK (first HubSpot version of 26 Oct 2026, updating it)"
  else
    for f in "${!OLD[@]}"; do
      [ "$(sum "$f")" = "${OLD[$f]}" ] || die "$f on the server is not the version this update was made for. Nothing changed. Send this message to Claude."
    done
    [ ! -e src/hubspot.js ] || die "src/hubspot.js already exists with other content. Nothing changed. Send this message to Claude."
    echo "   OK (version of 25 Sep 2026)"
  fi
else
  echo "   The HubSpot update is already installed; only the token and restart are refreshed."
fi

say "Taking the HubSpot token from the website's settings"
[ -r "$SITE_ENV" ] || die "Cannot read $SITE_ENV. Nothing changed."
token="$(grep -m1 '^HUBSPOT_TOKEN=' "$SITE_ENV" | cut -d= -f2- | tr -d '[:space:]"'"'" || true)"
[ -n "$token" ] || die "The website has no HubSpot token yet. Finish the HubSpot key step for the website first, then run this again. Nothing changed."
status="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $token" 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1')"
[ "$status" = "200" ] || die "HubSpot refused the token for contacts (HTTP $status). Nothing changed."
echo "   Token accepted by HubSpot."

# Failures the bot's self-test already has before this update (e.g. a part of
# the bot edited on the server after 25 Sep) are not this update's fault and
# must not block it; only a NEW failure does.
failures() { { grep -E '^ *✗' "$1" || true; } | sed -E 's/^ *✗ *//' | sort -u; }
say "Running the bot's self-test before the update"
node test.js >/tmp/hgp-bot-test-before.log 2>&1 || true
failures /tmp/hgp-bot-test-before.log >/tmp/hgp-bot-failing-before.txt
grep -E 'passed' /tmp/hgp-bot-test-before.log | tail -1 || true

if [ "$installed" = 0 ]; then
  say "Backing up the current code"
  backup="$BACKUPS/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$backup/src" "$backup/scripts"
  for f in "${FILES[@]}"; do if [ -f "$f" ]; then cp -p "$f" "$backup/$f"; fi; done
  echo "   Saved in $backup"

  say "Downloading the update"
  tmp="$(mktemp -d)"
  for f in "${FILES[@]}"; do
    mkdir -p "$tmp/$(dirname "$f")"
    curl -fsSL "$RAW/$f" -o "$tmp/$f" || die "Download failed for $f. Nothing changed."
    [ "$(sum "$tmp/$f")" = "${NEW[$f]}" ] || die "$f did not download correctly (wait 5 minutes and run again). Nothing changed."
  done
  for f in "${FILES[@]}"; do cp "$tmp/$f" "$f"; done
  rm -rf "$tmp"
fi

umask 077
printf 'HUBSPOT_TOKEN=%s\n' "$token" >hubspot.env
chmod 600 hubspot.env

say "Running the bot's self-test after the update"
node test.js >/tmp/hgp-bot-test.log 2>&1 || true
grep -E 'passed' /tmp/hgp-bot-test.log | tail -1 || true
new_failures="$(failures /tmp/hgp-bot-test.log | comm -23 - /tmp/hgp-bot-failing-before.txt)"
if [ -n "$new_failures" ] || ! grep -qE '[0-9]+ passed' /tmp/hgp-bot-test.log; then
  printf '%s\n' "$new_failures"
  grep -A3 -E '^ *✗' /tmp/hgp-bot-test.log | tail -20 || tail -20 /tmp/hgp-bot-test.log
  if [ "$installed" = 0 ]; then restore "$backup"; fi
  die "The self-test failed, so the old code was put back. Send this message to Claude."
fi
if [ -s /tmp/hgp-bot-failing-before.txt ]; then
  echo "   (Already failing before this update, not related to HubSpot:)"
  sed 's/^/     - /' /tmp/hgp-bot-failing-before.txt
fi

say "Restarting the bot"
pm2 restart "$BOT_NAME" >/dev/null
sleep 5
pm2 describe "$BOT_NAME" | grep -m1 -E 'status' || true

cat <<'EOF'

✅ Done. The bot now saves its customers and conversations in HubSpot.
   Check it: in WhatsApp, open "Message yourself" and send  !hubspot
EOF
