import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_applications_billing_items_service" AS ENUM('HGP-REG-INPERSON', 'HGP-REG-REMOTE', 'HGP-ADDR-BASIC', 'HGP-ADDR-WP', 'HGP-ACCT', 'HGP-WP', 'HGP-BANK-CN', 'HGP-BANK-HK', 'HGP-ALIPAY', 'HGP-WECHAT', 'HGP-LICENCE-CHG', 'HGP-HK-CO', 'HGP-TM', 'HGP-INVITE', 'HGP-VISA-M', 'HGP-VISA-FAMILY', 'HGP-STORE-TEMU', 'HGP-STORE-AMAZON', 'HGP-STORE-ALIEXPRESS', 'HGP-STORE-ALIBABA', 'other');
  CREATE TABLE "applications_billing_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"service" "enum_applications_billing_items_service",
  	"quantity" numeric DEFAULT 1,
  	"unit_price" numeric,
  	"name" varchar,
  	"name_zh" varchar,
  	"description" varchar
  );
  
  ALTER TABLE "applications" ADD COLUMN "billing_client_company" varchar;
  ALTER TABLE "applications" ADD COLUMN "billing_paid_deposit" timestamp(3) with time zone;
  ALTER TABLE "applications" ADD COLUMN "billing_paid_balance" timestamp(3) with time zone;
  ALTER TABLE "applications" ADD COLUMN "billing_paid_full" timestamp(3) with time zone;
  ALTER TABLE "applications_billing_items" ADD CONSTRAINT "applications_billing_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "applications_billing_items_order_idx" ON "applications_billing_items" USING btree ("_order");
  CREATE INDEX "applications_billing_items_parent_id_idx" ON "applications_billing_items" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "applications_billing_items" CASCADE;
  ALTER TABLE "applications" DROP COLUMN "billing_client_company";
  ALTER TABLE "applications" DROP COLUMN "billing_paid_deposit";
  ALTER TABLE "applications" DROP COLUMN "billing_paid_balance";
  ALTER TABLE "applications" DROP COLUMN "billing_paid_full";
  DROP TYPE "public"."enum_applications_billing_items_service";`)
}
