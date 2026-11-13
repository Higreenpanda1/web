import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_posts_locales_available" ADD VALUE IF NOT EXISTS 'zh';
    ALTER TYPE "public"."enum__posts_v_version_locales_available" ADD VALUE IF NOT EXISTS 'zh';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // PostgreSQL enum values cannot be removed safely without rebuilding the
  // type and checking stored Chinese content. Retain the additive values.
}
