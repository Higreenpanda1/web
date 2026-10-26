import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_applications_order_payment_terms" AS ENUM('full', '50-50', '30-70');
  ALTER TABLE "applications" ADD COLUMN "order_payment_terms" "enum_applications_order_payment_terms" DEFAULT 'full';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "applications" DROP COLUMN "order_payment_terms";
  DROP TYPE "public"."enum_applications_order_payment_terms";`)
}
