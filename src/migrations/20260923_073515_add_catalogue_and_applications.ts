import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_services_category" AS ENUM('import', 'company', 'banking', 'ecommerce', 'visas', 'consulting');
  CREATE TYPE "public"."enum_services_price_unit" AS ENUM('once', 'year', 'month', 'class');
  CREATE TYPE "public"."enum_services_application_type" AS ENUM('consultation', 'company-registration', 'visa-invitation', 'visa', 'product-search', 'shipping-quote', 'account-opening', 'store-setup', 'trademark');
  CREATE TYPE "public"."enum__services_v_version_category" AS ENUM('import', 'company', 'banking', 'ecommerce', 'visas', 'consulting');
  CREATE TYPE "public"."enum__services_v_version_price_unit" AS ENUM('once', 'year', 'month', 'class');
  CREATE TYPE "public"."enum__services_v_version_application_type" AS ENUM('consultation', 'company-registration', 'visa-invitation', 'visa', 'product-search', 'shipping-quote', 'account-opening', 'store-setup', 'trademark');
  CREATE TYPE "public"."enum_applications_type" AS ENUM('consultation', 'company-registration', 'visa-invitation', 'visa', 'product-search', 'shipping-quote', 'account-opening', 'store-setup', 'trademark');
  CREATE TYPE "public"."enum_applications_status" AS ENUM('new', 'contacted', 'documents', 'in-progress', 'completed', 'lost', 'spam');
  CREATE TYPE "public"."enum_applications_meta_locale" AS ENUM('ar', 'en');
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'plane';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'file-check';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'id-card';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'users';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'landmark';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'wallet';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'store';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'calculator';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'map-pin';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'badge-check';
  ALTER TYPE "public"."enum_services_icon" ADD VALUE 'file-pen';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'plane';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'file-check';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'id-card';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'users';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'landmark';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'wallet';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'store';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'calculator';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'map-pin';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'badge-check';
  ALTER TYPE "public"."enum__services_v_version_icon" ADD VALUE 'file-pen';
  CREATE TABLE "services_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_services_v_version_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar NOT NULL,
  	"type" "enum_applications_type" NOT NULL,
  	"status" "enum_applications_status" DEFAULT 'new' NOT NULL,
  	"assigned_to_id" integer,
  	"service_id" integer,
  	"name" varchar NOT NULL,
  	"country" varchar NOT NULL,
  	"whatsapp" varchar NOT NULL,
  	"email" varchar,
  	"headline" varchar,
  	"details" jsonb NOT NULL,
  	"internal_notes" varchar,
  	"meta_locale" "enum_applications_meta_locale",
  	"meta_source_path" varchar,
  	"meta_referrer" varchar,
  	"meta_user_agent" varchar,
  	"meta_ip_prefix" varchar,
  	"meta_submitted_at" timestamp(3) with time zone,
  	"notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "services" ADD COLUMN "category" "enum_services_category" DEFAULT 'import';
  ALTER TABLE "services" ADD COLUMN "price_from" numeric;
  ALTER TABLE "services" ADD COLUMN "price_unit" "enum_services_price_unit" DEFAULT 'once';
  ALTER TABLE "services" ADD COLUMN "application_type" "enum_services_application_type";
  ALTER TABLE "_services_v" ADD COLUMN "version_category" "enum__services_v_version_category" DEFAULT 'import';
  ALTER TABLE "_services_v" ADD COLUMN "version_price_from" numeric;
  ALTER TABLE "_services_v" ADD COLUMN "version_price_unit" "enum__services_v_version_price_unit" DEFAULT 'once';
  ALTER TABLE "_services_v" ADD COLUMN "version_application_type" "enum__services_v_version_application_type";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "applications_id" integer;
  ALTER TABLE "services_requirements" ADD CONSTRAINT "services_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_requirements" ADD CONSTRAINT "_services_v_version_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "services_requirements_order_idx" ON "services_requirements" USING btree ("_order");
  CREATE INDEX "services_requirements_parent_id_idx" ON "services_requirements" USING btree ("_parent_id");
  CREATE INDEX "services_requirements_locale_idx" ON "services_requirements" USING btree ("_locale");
  CREATE INDEX "_services_v_version_requirements_order_idx" ON "_services_v_version_requirements" USING btree ("_order");
  CREATE INDEX "_services_v_version_requirements_parent_id_idx" ON "_services_v_version_requirements" USING btree ("_parent_id");
  CREATE INDEX "_services_v_version_requirements_locale_idx" ON "_services_v_version_requirements" USING btree ("_locale");
  CREATE UNIQUE INDEX "applications_reference_idx" ON "applications" USING btree ("reference");
  CREATE INDEX "applications_type_idx" ON "applications" USING btree ("type");
  CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");
  CREATE INDEX "applications_assigned_to_idx" ON "applications" USING btree ("assigned_to_id");
  CREATE INDEX "applications_service_idx" ON "applications" USING btree ("service_id");
  CREATE INDEX "applications_country_idx" ON "applications" USING btree ("country");
  CREATE INDEX "applications_updated_at_idx" ON "applications" USING btree ("updated_at");
  CREATE INDEX "applications_created_at_idx" ON "applications" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_applications_fk" FOREIGN KEY ("applications_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "services_category_idx" ON "services" USING btree ("category");
  CREATE INDEX "_services_v_version_version_category_idx" ON "_services_v" USING btree ("version_category");
  CREATE INDEX "payload_locked_documents_rels_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("applications_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "services_requirements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_services_v_version_requirements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "applications" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "services_requirements" CASCADE;
  DROP TABLE "_services_v_version_requirements" CASCADE;
  DROP TABLE "applications" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_applications_fk";
  
  ALTER TABLE "services" ALTER COLUMN "icon" SET DATA TYPE text;
  ALTER TABLE "services" ALTER COLUMN "icon" SET DEFAULT 'search'::text;
  DROP TYPE "public"."enum_services_icon";
  CREATE TYPE "public"."enum_services_icon" AS ENUM('search', 'factory', 'clipboard-check', 'ship', 'building', 'route', 'shopping-cart', 'lightbulb', 'tent', 'package');
  ALTER TABLE "services" ALTER COLUMN "icon" SET DEFAULT 'search'::"public"."enum_services_icon";
  ALTER TABLE "services" ALTER COLUMN "icon" SET DATA TYPE "public"."enum_services_icon" USING "icon"::"public"."enum_services_icon";
  ALTER TABLE "_services_v" ALTER COLUMN "version_icon" SET DATA TYPE text;
  ALTER TABLE "_services_v" ALTER COLUMN "version_icon" SET DEFAULT 'search'::text;
  DROP TYPE "public"."enum__services_v_version_icon";
  CREATE TYPE "public"."enum__services_v_version_icon" AS ENUM('search', 'factory', 'clipboard-check', 'ship', 'building', 'route', 'shopping-cart', 'lightbulb', 'tent', 'package');
  ALTER TABLE "_services_v" ALTER COLUMN "version_icon" SET DEFAULT 'search'::"public"."enum__services_v_version_icon";
  ALTER TABLE "_services_v" ALTER COLUMN "version_icon" SET DATA TYPE "public"."enum__services_v_version_icon" USING "version_icon"::"public"."enum__services_v_version_icon";
  DROP INDEX "services_category_idx";
  DROP INDEX "_services_v_version_version_category_idx";
  DROP INDEX "payload_locked_documents_rels_applications_id_idx";
  ALTER TABLE "services" DROP COLUMN "category";
  ALTER TABLE "services" DROP COLUMN "price_from";
  ALTER TABLE "services" DROP COLUMN "price_unit";
  ALTER TABLE "services" DROP COLUMN "application_type";
  ALTER TABLE "_services_v" DROP COLUMN "version_category";
  ALTER TABLE "_services_v" DROP COLUMN "version_price_from";
  ALTER TABLE "_services_v" DROP COLUMN "version_price_unit";
  ALTER TABLE "_services_v" DROP COLUMN "version_application_type";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "applications_id";
  DROP TYPE "public"."enum_services_category";
  DROP TYPE "public"."enum_services_price_unit";
  DROP TYPE "public"."enum_services_application_type";
  DROP TYPE "public"."enum__services_v_version_category";
  DROP TYPE "public"."enum__services_v_version_price_unit";
  DROP TYPE "public"."enum__services_v_version_application_type";
  DROP TYPE "public"."enum_applications_type";
  DROP TYPE "public"."enum_applications_status";
  DROP TYPE "public"."enum_applications_meta_locale";`)
}
