import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "applications" ADD COLUMN "hubspot_synced_at" timestamp(3) with time zone;
  ALTER TABLE "applications" ADD COLUMN "hubspot_deal_id" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "applications" DROP COLUMN "hubspot_synced_at";
  ALTER TABLE "applications" DROP COLUMN "hubspot_deal_id";`)
}
