#!/bin/sh
# Restore from a dump. Run it on purpose, twice a year, against a scratch
# database — a restore procedure nobody has rehearsed is a hope, not a plan.
#
#   docker compose -f docker-compose.prod.yml run --rm backup \
#     /usr/local/bin/restore.sh /backup-out/higreenpanda-db-<stamp>.dump
#
# Add --into <dbname> to restore somewhere other than the live database.
set -eu

DUMP=${1:?Usage: restore.sh <dump-file> [--into <database>]}
TARGET=${PGDATABASE:?PGDATABASE must be set}

shift || true
if [ "${1:-}" = "--into" ]; then
  TARGET=${2:?--into needs a database name}
fi

if [ ! -f "$DUMP" ]; then
  echo "[restore] no such file: $DUMP"
  exit 1
fi

echo "[restore] verifying $DUMP"
pg_restore --list "$DUMP" >/dev/null

echo "[restore] restoring into '$TARGET'"
echo "[restore] existing objects in that database will be dropped."
printf '[restore] type the database name to confirm: '
read -r CONFIRM
[ "$CONFIRM" = "$TARGET" ] || { echo '[restore] aborted'; exit 1; }

createdb "$TARGET" 2>/dev/null || true
pg_restore --dbname="$TARGET" --clean --if-exists --no-owner --no-privileges --jobs=4 "$DUMP"

echo "[restore] done. Check the row counts before pointing the app at it:"
psql --dbname="$TARGET" -c \
  "SELECT 'services' t, count(*) FROM services UNION ALL
   SELECT 'posts', count(*) FROM posts UNION ALL
   SELECT 'enquiries', count(*) FROM enquiries UNION ALL
   SELECT 'users', count(*) FROM users;"
