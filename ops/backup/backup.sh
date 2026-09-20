#!/bin/sh
# One night's backup: a custom-format Postgres dump plus the media directory.
#
# `pg_dump -Fc` rather than plain SQL, because it restores with pg_restore in
# parallel, compresses on the way out, and can be restored selectively when
# only one table needs recovering.
set -eu

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/backup-out
mkdir -p "$OUT"

DB_FILE="$OUT/higreenpanda-db-$STAMP.dump"
MEDIA_FILE="$OUT/higreenpanda-media-$STAMP.tar.gz"

echo "[backup] $STAMP: dumping database"
pg_dump --format=custom --compress=6 --no-owner --no-privileges --file="$DB_FILE"

echo "[backup] $STAMP: archiving media"
tar -czf "$MEDIA_FILE" -C /backup-src media

DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
MEDIA_SIZE=$(du -h "$MEDIA_FILE" | cut -f1)
echo "[backup] $STAMP: database $DB_SIZE, media $MEDIA_SIZE"

# A dump that cannot be read is not a backup. Verify before uploading, so a
# corrupt dump is noticed tonight rather than on the day it is needed.
if ! pg_restore --list "$DB_FILE" >/dev/null 2>&1; then
  echo "[backup] $STAMP: FAILED — the dump is not readable by pg_restore"
  rm -f "$DB_FILE"
  exit 1
fi
echo "[backup] $STAMP: dump verified"

if [ -n "${S3_BUCKET:-}" ]; then
  ENDPOINT_ARG=""
  [ -n "${S3_ENDPOINT:-}" ] && ENDPOINT_ARG="--endpoint-url $S3_ENDPOINT"
  # shellcheck disable=SC2086
  aws s3 cp "$DB_FILE" "s3://$S3_BUCKET/db/" $ENDPOINT_ARG
  # shellcheck disable=SC2086
  aws s3 cp "$MEDIA_FILE" "s3://$S3_BUCKET/media/" $ENDPOINT_ARG
  echo "[backup] $STAMP: uploaded to s3://$S3_BUCKET"
else
  echo "[backup] $STAMP: S3_BUCKET unset — kept on this server only"
fi

# Local copies are a convenience; the off-server copy is the backup.
find "$OUT" -name 'higreenpanda-*' -type f -mtime "+${BACKUP_RETAIN_DAYS:-30}" -delete
echo "[backup] $STAMP: done"
