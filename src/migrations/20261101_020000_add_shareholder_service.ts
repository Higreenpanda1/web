import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."enum_applications_billing_items_service" ADD VALUE IF NOT EXISTS 'HGP-REG-SHAREHOLDER';`)
}

// Keep this additive value on rollback so existing invoice lines remain readable.
export async function down(_args: MigrateDownArgs): Promise<void> {}
