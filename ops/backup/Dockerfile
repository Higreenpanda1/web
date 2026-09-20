# Nightly Postgres dump + media archive, pushed to off-server object storage.
#
# Brief section 8: "No backups you controlled" is what made the last outage
# unrecoverable. This runs inside the stack so it cannot be forgotten, and the
# restore procedure in DEPLOY.md is written to be rehearsed, not read.
FROM postgres:16.10-alpine

RUN apk add --no-cache aws-cli tar gzip coreutils tzdata

COPY backup.sh /usr/local/bin/backup.sh
COPY restore.sh /usr/local/bin/restore.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh

ENV BACKUP_AT=03:15 \
    BACKUP_RETAIN_DAYS=30 \
    TZ=Asia/Shanghai

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
