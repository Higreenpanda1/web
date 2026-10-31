import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_applications_billing_deposit_plan" AS ENUM ('50', '30', 'custom', 'full');
    CREATE TYPE "public"."enum_applications_billing_payments_method" AS ENUM ('cash', 'bank', 'wechat', 'alipay', 'other');
    ALTER TABLE "applications" ADD COLUMN "billing_deposit_plan" "public"."enum_applications_billing_deposit_plan" DEFAULT '50';
    ALTER TABLE "applications" ADD COLUMN "billing_custom_deposit" numeric;
    CREATE TABLE "applications_billing_payments" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "amount" numeric NOT NULL,
      "paid_on" timestamp(3) with time zone NOT NULL,
      "method" "public"."enum_applications_billing_payments_method" NOT NULL,
      "received_by" varchar NOT NULL,
      "reference" varchar,
      CONSTRAINT "applications_billing_payments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "applications"("id") ON DELETE cascade
    );
    CREATE INDEX "applications_billing_payments_order_idx" ON "applications_billing_payments" ("_order");
    CREATE INDEX "applications_billing_payments_parent_id_idx" ON "applications_billing_payments" ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "applications_billing_payments";
    ALTER TABLE "applications" DROP COLUMN "billing_deposit_plan", DROP COLUMN "billing_custom_deposit";
    DROP TYPE "public"."enum_applications_billing_payments_method";
    DROP TYPE "public"."enum_applications_billing_deposit_plan";
  `)
}
