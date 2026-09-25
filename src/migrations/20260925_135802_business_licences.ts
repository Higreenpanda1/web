import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_licences" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"legal_name" varchar NOT NULL,
  	"name_ar" varchar NOT NULL,
  	"name_en" varchar NOT NULL,
  	"credit_code" varchar NOT NULL,
  	"established" varchar,
  	"city_ar" varchar,
  	"city_en" varchar,
  	"image_id" integer
  );
  
  ALTER TABLE "site_settings_licences" ADD CONSTRAINT "site_settings_licences_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_licences" ADD CONSTRAINT "site_settings_licences_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_licences_order_idx" ON "site_settings_licences" USING btree ("_order");
  CREATE INDEX "site_settings_licences_parent_id_idx" ON "site_settings_licences" USING btree ("_parent_id");
  CREATE INDEX "site_settings_licences_image_idx" ON "site_settings_licences" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_licences" CASCADE;`)
}
