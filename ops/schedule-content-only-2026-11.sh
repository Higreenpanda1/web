#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/home/deploy/higreenpanda}"
SOURCE=2179f0831ecc83311b0e2d51d54f1aa40a08d767
fail(){ printf '%s\n' "$*" >&2; exit 1; }
[[ "$(date -u +%Y-%m-%d)" < '2026-11-16' ]] || fail 'Refresh the publication dates before running this batch.'
cd "$APP_DIR"
[[ -f .env && -f docker-compose.prod.yml ]] || fail 'Existing application configuration not found.'
dc(){ docker compose -p higreenpanda -f docker-compose.prod.yml "$@"; }
IMAGE=$(docker image inspect higreenpanda-tools:latest --format "{{.Id}}")
[[ -n "$IMAGE" ]] || fail 'The existing content tools image is unavailable. Nothing changed; no build was requested.'
WORK=$(mktemp -d /tmp/higp-content-XXXXXX)
trap 'rm -rf "$WORK"' EXIT
curl -fsSL "https://api.github.com/repos/Higreenpanda1/web/tarball/$SOURCE" -o "$WORK/content.tgz"
mkdir "$WORK/source"
tar -xzf "$WORK/content.tgz" --strip-components=1 -C "$WORK/source"
cp "$WORK/source/src/scripts/import-editorial-2026-11.mjs" "$WORK/import.mjs"
cp -r "$WORK/source/src/seed/editorial-2026-11" "$WORK/batch"
# Adapt only the disposable tools process. The live application files are not edited.
dc run --rm --no-deps --pull never -T -v "$WORK:/batch" tools node - /batch/import.mjs <<'JS'
const fs=require('node:fs');const p=process.argv[2];let s=fs.readFileSync(p,'utf8');s=s.replace("path.resolve(here, '../seed/editorial-2026-11')","process.env.EDITORIAL_BATCH_DIR");s=s.replace("import('../payload.config.ts')","import('./src/payload.config.ts')");s=s.replace('const payload = await getPayload({ config })',`const cfg = await config
  const collection = cfg.collections.find(c => c.slug === 'posts')
  const field = collection?.fields.find(f => f.name === 'localesAvailable')
  if (!field?.options || !cfg.localization) throw new Error('Content language configuration not found')
  if (!field.options.some(x => (typeof x === 'string' ? x : x.value) === 'zh')) field.options.push({label:'中文',value:'zh'})
  const payload = await getPayload({ config: cfg })`);s=s.replace("const apply = process.argv.includes('--apply')", `if (process.argv.includes('--verify')) {
      if (pack.posts.length !== 18) throw new Error('Expected 18 scheduled articles')
      for (const x of pack.posts) {
        const r = await payload.find({collection:'posts', locale:x.locale ?? 'ar', where:{slug:{equals:x.slug}}, limit:1, depth:0})
        const d = r.docs[0]
        if (!d || d._status !== 'published' || Date.parse(d.publishedAt) !== Date.parse(x.publishedAt) || !d.coverImage || !d.localesAvailable?.includes(x.locale ?? 'ar')) throw new Error('Schedule verification failed: ' + x.slug)
      }
      console.log('VERIFIED: all 18 article schedules, languages and covers match.')
      return
    }
    const apply = process.argv.includes('--apply')`);s=s.replace("} finally { await payload.destroy() }", "} finally { const cleanupTimer = setTimeout(() => process.exit(process.exitCode ?? 0), 5000); await payload.destroy(); clearTimeout(cleanupTimer) }");s=s.replace("main().catch(error => { console.error(error.message); process.exitCode = 1 })", "main().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1) })");fs.writeFileSync(p,s);
JS
run(){ dc run --rm --no-deps --pull never -T -v "$WORK:/batch:ro" -e EDITORIAL_BATCH_DIR=/batch/batch tools sh -c 'cp /batch/import.mjs /app/content-import.mjs; exec npx --no-install tsx /app/content-import.mjs "$@"' sh "$@" </dev/null; }
printf '%s\n' 'STEP 1/4: checking all 18 articles...'
run --multilingual
printf '%s\n' 'STEP 2/4: backing up the database...'
mkdir -p "$APP_DIR/backups"
chmod 700 "$APP_DIR/backups"
BACKUP="$APP_DIR/backups/before-content-$(date -u +%Y%m%dT%H%M%SZ).sql"
dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$BACKUP"
[[ -s "$BACKUP" ]] || fail 'Backup failed; no articles were added.'
chmod 600 "$BACKUP"
# Only allow Chinese in the two article-language enum types; no general migrations.
dc exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
ALTER TYPE public.enum_posts_locales_available ADD VALUE IF NOT EXISTS 'zh';
ALTER TYPE public.enum__posts_v_version_locales_available ADD VALUE IF NOT EXISTS 'zh';
SQL
printf '%s\n' 'STEP 3/4: saving all 18 publication dates...'
run --multilingual --apply --publish
printf '%s\n' 'STEP 4/4: reading back and verifying all 18 schedules...'
run --multilingual --verify
printf '%s\n' 'Content scheduling command completed. No website build, restart, billing edit, source checkout or general seed was run. Verify the 18 dates in CMS; Chinese display support is a separate website update.'
