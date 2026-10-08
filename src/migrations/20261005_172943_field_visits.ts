import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_field_moments_kind" AS ENUM('office', 'business', 'fair', 'factory', 'market');
  CREATE TABLE "field_moments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_field_moments_kind" DEFAULT 'office' NOT NULL,
  	"taken_at" timestamp(3) with time zone,
  	"consent_confirmed" boolean DEFAULT false,
  	"show_on_home" boolean DEFAULT false,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "field_moments_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "field_moments_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "field_moments_id" integer;
  ALTER TABLE "field_moments_locales" ADD CONSTRAINT "field_moments_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_moments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_moments_rels" ADD CONSTRAINT "field_moments_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_moments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_moments_rels" ADD CONSTRAINT "field_moments_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "field_moments_updated_at_idx" ON "field_moments" USING btree ("updated_at");
  CREATE INDEX "field_moments_created_at_idx" ON "field_moments" USING btree ("created_at");
  CREATE UNIQUE INDEX "field_moments_locales_locale_parent_id_unique" ON "field_moments_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "field_moments_rels_order_idx" ON "field_moments_rels" USING btree ("order");
  CREATE INDEX "field_moments_rels_parent_idx" ON "field_moments_rels" USING btree ("parent_id");
  CREATE INDEX "field_moments_rels_path_idx" ON "field_moments_rels" USING btree ("path");
  CREATE INDEX "field_moments_rels_media_id_idx" ON "field_moments_rels" USING btree ("media_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_field_moments_fk" FOREIGN KEY ("field_moments_id") REFERENCES "public"."field_moments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_field_moments_id_idx" ON "payload_locked_documents_rels" USING btree ("field_moments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "field_moments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_moments_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_moments_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "field_moments" CASCADE;
  DROP TABLE "field_moments_locales" CASCADE;
  DROP TABLE "field_moments_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_field_moments_fk";
  
  DROP INDEX "payload_locked_documents_rels_field_moments_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "field_moments_id";
  DROP TYPE "public"."enum_field_moments_kind";`)
}
