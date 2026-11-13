#!/usr/bin/env bash
# Publishes only the prepared 18-article schedule after a successful app build.
set -euo pipefail
APP_DIR="${APP_DIR:-/home/deploy/higreenpanda}"
SOURCE=2179f0831ecc83311b0e2d51d54f1aa40a08d767
BASE=51a1ed4cd010975ce10847340bffd7ef3b38ca8e
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$(date -u +%Y-%m-%d)" < '2026-11-16' ]] || die 'The first scheduled date has arrived. Refresh the schedule before running; nothing changed.'
[[ -f "$APP_DIR/.env" && -f "$APP_DIR/docker-compose.prod.yml" ]] || die 'Existing application and environment not found; nothing changed.'
command -v docker >/dev/null || die 'Docker is required.'
command -v git >/dev/null || die 'Git is required to verify the live source.'
[[ -z "$(git -C "$APP_DIR" status --porcelain --untracked-files=no)" ]] || die 'Live source has local changes. Review them before scheduling; nothing changed.'
LIVE=$(git -C "$APP_DIR" rev-parse HEAD)
case "$LIVE" in "$BASE"|"$SOURCE"|2f25d19357c9c821d8a5da1fef384e852dc0bea9|7766a130f601fbefdfc871207bac230aa083ca8d) ;; *) die 'Live source differs from the reviewed content base. Reconcile the source first; nothing changed.' ;; esac
WORK=$(mktemp -d /tmp/higp-editorial-XXXXXX)
trap 'rm -rf "$WORK"' EXIT
curl --fail --silent --show-error --location "https://api.github.com/repos/Higreenpanda1/web/tarball/$SOURCE" -o "$WORK/source.tgz"
mkdir "$WORK/site"
tar -xzf "$WORK/source.tgz" --strip-components=1 -C "$WORK/site"
cp "$APP_DIR/.env" "$WORK/site/.env"
chmod 600 "$WORK/site/.env"
cd "$WORK/site"
dc() { docker compose -p higreenpanda -f docker-compose.prod.yml "$@"; }
printf '%s\n' 'Building and testing the prepared version before changing the running application...'
dc build app tools
dc run --rm --no-deps -T tools node --test tests/editorial-import.test.mjs </dev/null
BACKUP_DIR="$APP_DIR/backups"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
BACKUP="$BACKUP_DIR/before-editorial-$(date -u +%Y%m%dT%H%M%SZ).sql"
docker compose -p higreenpanda -f "$APP_DIR/docker-compose.prod.yml" --env-file "$APP_DIR/.env" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$BACKUP"
[[ -s "$BACKUP" ]] || die 'Database backup failed; no migration or article import was run.'
chmod 600 "$BACKUP"
dc run --rm --no-deps -T tools npm run migrate </dev/null
dc run --rm --no-deps -T tools npx tsx src/scripts/import-editorial-2026-11.mjs --multilingual </dev/null
dc run --rm --no-deps -T tools npx tsx src/scripts/import-editorial-2026-11.mjs --multilingual --apply --publish </dev/null
dc run --rm --no-deps -T tools npx tsx -e 'import {getPayload} from "payload"; import config from "./src/payload.config.ts"; import {readFileSync} from "node:fs"; async function verify(){const p=await getPayload({config});try{const pack=JSON.parse(readFileSync("src/seed/editorial-2026-11/posts-multilingual.json","utf8"));if(pack.posts.length!==18)throw Error("Expected 18 articles");for(const x of pack.posts){const r=await p.find({collection:"posts",locale:x.locale??"ar",where:{slug:{equals:x.slug}},limit:1,depth:0});const d=r.docs[0];if(!d||d._status!=="published"||Date.parse(d.publishedAt)!==Date.parse(x.publishedAt)||!d.localesAvailable?.includes(x.locale??"ar")||!d.coverImage)throw Error("Schedule verification failed: "+x.slug)}console.log("VERIFIED: all 18 articles, language, cover and publication dates match.")}finally{await p.destroy()}}verify().catch(e=>{console.error(e.message);process.exitCode=1})' </dev/null
dc up -d --no-deps app
for attempt in $(seq 1 36); do
  if dc exec -T app node -e 'fetch("http://127.0.0.1:3000/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then
    printf '%s\n' 'VERIFIED: all 18 schedules match and application health passed. Page layout still requires a visual check.'
    exit 0
  fi
  sleep 5
done
die 'The application health check did not pass. Keep this output and the database backup for investigation.'
