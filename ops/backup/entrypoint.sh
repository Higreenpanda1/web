#!/bin/sh
# A sleep loop rather than cron: one process, logs to stdout where Docker can
# see them, and no second scheduler to keep in step with the container.
set -eu

echo "[backup] scheduler started; nightly run at ${BACKUP_AT} ${TZ}"

# Prove the credentials work now rather than at 03:15 on the night it matters.
if [ -n "${S3_BUCKET:-}" ]; then
  if aws s3 ls "s3://${S3_BUCKET}" ${S3_ENDPOINT:+--endpoint-url "$S3_ENDPOINT"} >/dev/null 2>&1; then
    echo "[backup] object storage reachable: s3://${S3_BUCKET}"
  else
    echo "[backup] WARNING: cannot reach s3://${S3_BUCKET} — backups will stay on the server only"
  fi
else
  echo "[backup] WARNING: S3_BUCKET is not set. Backups will stay on this server,"
  echo "[backup]          which is the failure the brief calls out. Set it."
fi

while true; do
  now=$(date +%H:%M)
  if [ "$now" = "${BACKUP_AT}" ]; then
    /usr/local/bin/backup.sh || echo "[backup] run failed; will try again tomorrow"
    sleep 61
  fi
  sleep 30
done
