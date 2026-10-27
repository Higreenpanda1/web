#!/usr/bin/env bash
# Gives the WhatsApp bot (/opt/higreenpanda-bot, pm2 "higreenpanda-bot") the
# wording and prices the owner approved on 27 Oct 2026: courteous, professional
# replies, the October 2026 price list from the website, "كرت العمل" for the
# work permit, and the KK100 head office for "where is your office?".
# See ops/whatsapp-bot/README.md.
#
# Changes only the bot's code and data, never config.json (test mode, numbers)
# or what the bot learned. Backs up first, runs the bot's self-test, and puts
# the old files back by itself if the update adds a failing test.
#
# Run from hPanel → VPS → Browser terminal, with the commit pinned:
#   curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/<sha>/ops/whatsapp-bot/install-texts.sh | REF=<sha> bash
# Undo (puts the files from the last backup back and restarts the bot):
#   curl -fsSL https://raw.githubusercontent.com/Higreenpanda1/web/<sha>/ops/whatsapp-bot/install-texts.sh | REF=<sha> bash -s -- undo
set -euo pipefail

BOT_DIR="${BOT_DIR:-/opt/higreenpanda-bot}"
BOT_NAME="${BOT_NAME:-higreenpanda-bot}"
REF="${REF:-claude/practical-newton-m55sbw}"
RAW="${RAW:-https://raw.githubusercontent.com/Higreenpanda1/web/${REF}/ops/whatsapp-bot/files}"
BACKUPS="${BOT_DIR}-backups"

FILES=(data/services.json data/business.json src/texts.js src/data.js src/brain.js src/ai.js test.js)
# What the server should have now: the 25 Sep 2026 bot plus the HubSpot update
# (test.js is the HubSpot version). If a file is different, someone changed it
# since, and this stops.
declare -A OLD=(
  [data/services.json]=7a0c87c5efe47aa53efdaf7061beb35b21f49c1f277f4094b309c7368e6ab403
  [data/business.json]=f814fa7cad72378b85c228e1f022d771ac53e5fa09e1ffb524da9bce1bd6103d
  [src/texts.js]=3df21081d9873ea6cd706106a20057e09a63a2f7249db17695e84fd6b3281974
  [src/data.js]=767f3605982a7adcd7ba602a1f37e135d9f816b543eecfe54c4e32ea64726fb8
  [src/brain.js]=c465571b6c9c1af5feb281e7a8d725521813d740afb77d0f279c1753779df086
  [src/ai.js]=8f5a646387383116f71f56318d8001a8804d214413a84e559f591b4a9553b8a7
  [test.js]=910ca206f41f0e1b0a120e00f9434d5c108d9040b023decf7e8c3ffe10158d94
)
declare -A NEW=(
  [data/services.json]=5234b1199f2b6d3ffc86289dff7b21b48dd30b23f2dd59584cc95bebcf672340
  [data/business.json]=020772d481e6301cc21b7759c2a635bffd4d81525e1ec03808cc77a358bbd4dd
  [src/texts.js]=20929d2c634f46d4a77c42906d4412d01d869be091d3841677abb4dd5d155ea1
  [src/data.js]=31c54aa2f424614cc3ef6b928da14651292a111ddc1b62500929a74b158bb4a5
  [src/brain.js]=041fc1c99a25bd3de2afb09e9a78705740a80bec1477308e0f61f46c56f565f5
  [src/ai.js]=5e4eb956a8a092195d69edef5f427a6d85a06f95a01d7f3851b25e45905bf87e
  [test.js]=08620db5dca960ef62704983a63c25da73e2e3308595e21430b806629ac0f5d6
)
# Only used by the AI mode (no Gemini key yet). If it was edited on the server,
# it is left as it is instead of stopping the whole update.
OPTIONAL=" src/ai.js "

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\n❌ %s\n' "$*" >&2; exit 1; }
sum() { sha256sum "$1" 2>/dev/null | cut -d' ' -f1; }

[ -d "$BOT_DIR" ] || die "The bot folder $BOT_DIR is not on this server."
cd "$BOT_DIR"

restore() {
  local from="$1"
  for f in "${FILES[@]}"; do
    if [ -f "$from/$f" ]; then cp -p "$from/$f" "$f"; fi
  done
  pm2 restart "$BOT_NAME" >/dev/null
}

if [ "${1:-}" = "undo" ]; then
  last="$(ls -1d "$BACKUPS"/texts-* 2>/dev/null | tail -1 || true)"
  [ -n "$last" ] || die "No backup of this update found in $BACKUPS."
  restore "$last"
  echo "↩️  The bot is back to the files saved in $last."
  exit 0
fi

say "Checking the bot's files"
todo=()
for f in "${FILES[@]}"; do
  have="$(sum "$f")"
  if [ "$have" = "${NEW[$f]}" ]; then continue; fi
  if [ "$have" = "${OLD[$f]}" ]; then todo+=("$f"); continue; fi
  case "$OPTIONAL" in
    *" $f "*) echo "   $f was changed on the server; it is kept as it is." ;;
    *) die "$f on the server is not the version this update was made for. Nothing changed. Send this message to Claude." ;;
  esac
done
if [ "${#todo[@]}" = 0 ]; then
  echo "   The new wording is already installed. Nothing to do."
  exit 0
fi
echo "   OK"

failures() { { grep -E '^ *✗' "$1" || true; } | sed -E 's/^ *✗ *//' | sort -u; }
say "Running the bot's self-test before the update"
node test.js >/tmp/hgp-bot-test-before.log 2>&1 || true
failures /tmp/hgp-bot-test-before.log >/tmp/hgp-bot-failing-before.txt
grep -E 'passed' /tmp/hgp-bot-test-before.log | tail -1 || true

say "Backing up the current files"
backup="$BACKUPS/texts-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup/src" "$backup/data"
for f in "${FILES[@]}"; do if [ -f "$f" ]; then cp -p "$f" "$backup/$f"; fi; done
echo "   Saved in $backup"

say "Downloading the update"
tmp="$(mktemp -d)"
for f in "${todo[@]}"; do
  mkdir -p "$tmp/$(dirname "$f")"
  curl -fsSL "$RAW/$f" -o "$tmp/$f" || die "Download failed for $f. Nothing changed."
  [ "$(sum "$tmp/$f")" = "${NEW[$f]}" ] || die "$f did not download correctly (wait 5 minutes and run again). Nothing changed."
done
for f in "${todo[@]}"; do cp "$tmp/$f" "$f"; done
rm -rf "$tmp"

say "Running the bot's self-test after the update"
node test.js >/tmp/hgp-bot-test.log 2>&1 || true
grep -E 'passed' /tmp/hgp-bot-test.log | tail -1 || true
# Tests that changed with the new wording have new names, so compare by name:
# a failure is new only if that test did not fail before.
new_failures="$(failures /tmp/hgp-bot-test.log | comm -23 - /tmp/hgp-bot-failing-before.txt)"
if [ -n "$new_failures" ] || ! grep -qE '[0-9]+ passed' /tmp/hgp-bot-test.log; then
  printf '%s\n' "$new_failures"
  grep -A3 -E '^ *✗' /tmp/hgp-bot-test.log | tail -20 || tail -20 /tmp/hgp-bot-test.log
  restore "$backup"
  die "The self-test failed, so the old files were put back. Send this message to Claude."
fi
if [ -s /tmp/hgp-bot-failing-before.txt ]; then
  echo "   (Already failing before this update, not related to it:)"
  sed 's/^/     - /' /tmp/hgp-bot-failing-before.txt
fi

say "Restarting the bot"
pm2 restart "$BOT_NAME" >/dev/null
sleep 5
pm2 describe "$BOT_NAME" | grep -m1 -E 'status' || true

cat <<'EOF'

✅ Done. The bot now uses the new wording and prices.
   Test mode is unchanged: real customers get replies only after  !test off
EOF
