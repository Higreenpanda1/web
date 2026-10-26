import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_applications_order_items_unit" AS ENUM('pieces', 'sets', 'pairs', 'cartons', 'metres', 'kg');
  CREATE TYPE "public"."enum_applications_order_currency" AS ENUM('usd', 'cny', 'aed', 'sar');
  CREATE TABLE "applications_order_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_name" varchar,
  	"quantity" numeric,
  	"unit" "enum_applications_order_items_unit" DEFAULT 'pieces',
  	"unit_price" numeric,
  	"description" varchar,
  	"position" numeric
  );
  
  ALTER TABLE "applications" ADD COLUMN "order_currency" "enum_applications_order_currency" DEFAULT 'usd';
  ALTER TABLE "applications" ADD COLUMN "order_total" numeric;
  ALTER TABLE "applications_order_items" ADD CONSTRAINT "applications_order_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "applications_order_items_order_idx" ON "applications_order_items" USING btree ("_order");
  CREATE INDEX "applications_order_items_parent_id_idx" ON "applications_order_items" USING btree ("_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "applications_order_items" CASCADE;
  ALTER TABLE "applications" DROP COLUMN "order_currency";
  ALTER TABLE "applications" DROP COLUMN "order_total";
  DROP TYPE "public"."enum_applications_order_items_unit";
  DROP TYPE "public"."enum_applications_order_currency";`)
}
