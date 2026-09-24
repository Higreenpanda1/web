import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_locales_available" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum__posts_v_version_locales_available" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_topics_status" AS ENUM('queued', 'drafted', 'published', 'dropped');
  CREATE TABLE "posts_key_takeaways" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "posts_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "posts_locales_available" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_posts_locales_available",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "posts_legacy_paths" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"path" varchar
  );
  
  CREATE TABLE "_posts_v_version_key_takeaways" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_version_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_version_locales_available" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__posts_v_version_locales_available",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_posts_v_version_legacy_paths" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"path" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "topics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer NOT NULL,
  	"priority" numeric DEFAULT 50,
  	"status" "enum_topics_status" DEFAULT 'queued',
  	"scheduled_for" timestamp(3) with time zone,
  	"post_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "topics_locales" (
  	"title" varchar NOT NULL,
  	"keyword" varchar NOT NULL,
  	"brief" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "announcements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"post_id" integer NOT NULL,
  	"announced_at" timestamp(3) with time zone NOT NULL,
  	"channels" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "posts" ADD COLUMN "import_key" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "focus_keyword" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_import_key" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_focus_keyword" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "topics_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "announcements_id" integer;
  ALTER TABLE "posts_key_takeaways" ADD CONSTRAINT "posts_key_takeaways_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_faqs" ADD CONSTRAINT "posts_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_locales_available" ADD CONSTRAINT "posts_locales_available_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_legacy_paths" ADD CONSTRAINT "posts_legacy_paths_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_key_takeaways" ADD CONSTRAINT "_posts_v_version_key_takeaways_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_faqs" ADD CONSTRAINT "_posts_v_version_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_locales_available" ADD CONSTRAINT "_posts_v_version_locales_available_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_legacy_paths" ADD CONSTRAINT "_posts_v_version_legacy_paths_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "topics" ADD CONSTRAINT "topics_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "topics" ADD CONSTRAINT "topics_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "topics_locales" ADD CONSTRAINT "topics_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements" ADD CONSTRAINT "announcements_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_key_takeaways_order_idx" ON "posts_key_takeaways" USING btree ("_order");
  CREATE INDEX "posts_key_takeaways_parent_id_idx" ON "posts_key_takeaways" USING btree ("_parent_id");
  CREATE INDEX "posts_key_takeaways_locale_idx" ON "posts_key_takeaways" USING btree ("_locale");
  CREATE INDEX "posts_faqs_order_idx" ON "posts_faqs" USING btree ("_order");
  CREATE INDEX "posts_faqs_parent_id_idx" ON "posts_faqs" USING btree ("_parent_id");
  CREATE INDEX "posts_faqs_locale_idx" ON "posts_faqs" USING btree ("_locale");
  CREATE INDEX "posts_locales_available_order_idx" ON "posts_locales_available" USING btree ("order");
  CREATE INDEX "posts_locales_available_parent_idx" ON "posts_locales_available" USING btree ("parent_id");
  CREATE INDEX "posts_legacy_paths_order_idx" ON "posts_legacy_paths" USING btree ("_order");
  CREATE INDEX "posts_legacy_paths_parent_id_idx" ON "posts_legacy_paths" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_key_takeaways_order_idx" ON "_posts_v_version_key_takeaways" USING btree ("_order");
  CREATE INDEX "_posts_v_version_key_takeaways_parent_id_idx" ON "_posts_v_version_key_takeaways" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_key_takeaways_locale_idx" ON "_posts_v_version_key_takeaways" USING btree ("_locale");
  CREATE INDEX "_posts_v_version_faqs_order_idx" ON "_posts_v_version_faqs" USING btree ("_order");
  CREATE INDEX "_posts_v_version_faqs_parent_id_idx" ON "_posts_v_version_faqs" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_faqs_locale_idx" ON "_posts_v_version_faqs" USING btree ("_locale");
  CREATE INDEX "_posts_v_version_locales_available_order_idx" ON "_posts_v_version_locales_available" USING btree ("order");
  CREATE INDEX "_posts_v_version_locales_available_parent_idx" ON "_posts_v_version_locales_available" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_legacy_paths_order_idx" ON "_posts_v_version_legacy_paths" USING btree ("_order");
  CREATE INDEX "_posts_v_version_legacy_paths_parent_id_idx" ON "_posts_v_version_legacy_paths" USING btree ("_parent_id");
  CREATE INDEX "topics_category_idx" ON "topics" USING btree ("category_id");
  CREATE INDEX "topics_status_idx" ON "topics" USING btree ("status");
  CREATE INDEX "topics_post_idx" ON "topics" USING btree ("post_id");
  CREATE INDEX "topics_updated_at_idx" ON "topics" USING btree ("updated_at");
  CREATE INDEX "topics_created_at_idx" ON "topics" USING btree ("created_at");
  CREATE UNIQUE INDEX "topics_locales_locale_parent_id_unique" ON "topics_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "announcements_post_idx" ON "announcements" USING btree ("post_id");
  CREATE INDEX "announcements_announced_at_idx" ON "announcements" USING btree ("announced_at");
  CREATE INDEX "announcements_updated_at_idx" ON "announcements" USING btree ("updated_at");
  CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_announcements_fk" FOREIGN KEY ("announcements_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_import_key_idx" ON "posts" USING btree ("import_key");
  CREATE INDEX "_posts_v_version_version_import_key_idx" ON "_posts_v" USING btree ("version_import_key");
  CREATE INDEX "payload_locked_documents_rels_topics_id_idx" ON "payload_locked_documents_rels" USING btree ("topics_id");
  CREATE INDEX "payload_locked_documents_rels_announcements_id_idx" ON "payload_locked_documents_rels" USING btree ("announcements_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_key_takeaways" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_locales_available" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_legacy_paths" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_key_takeaways" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_locales_available" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_legacy_paths" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "topics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "topics_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "announcements" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_key_takeaways" CASCADE;
  DROP TABLE "posts_faqs" CASCADE;
  DROP TABLE "posts_locales_available" CASCADE;
  DROP TABLE "posts_legacy_paths" CASCADE;
  DROP TABLE "_posts_v_version_key_takeaways" CASCADE;
  DROP TABLE "_posts_v_version_faqs" CASCADE;
  DROP TABLE "_posts_v_version_locales_available" CASCADE;
  DROP TABLE "_posts_v_version_legacy_paths" CASCADE;
  DROP TABLE "topics" CASCADE;
  DROP TABLE "topics_locales" CASCADE;
  DROP TABLE "announcements" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_topics_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_announcements_fk";
  
  DROP INDEX "posts_import_key_idx";
  DROP INDEX "_posts_v_version_version_import_key_idx";
  DROP INDEX "payload_locked_documents_rels_topics_id_idx";
  DROP INDEX "payload_locked_documents_rels_announcements_id_idx";
  ALTER TABLE "posts" DROP COLUMN "import_key";
  ALTER TABLE "posts_locales" DROP COLUMN "focus_keyword";
  ALTER TABLE "_posts_v" DROP COLUMN "version_import_key";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_focus_keyword";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "topics_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "announcements_id";
  DROP TYPE "public"."enum_posts_locales_available";
  DROP TYPE "public"."enum__posts_v_version_locales_available";
  DROP TYPE "public"."enum_topics_status";`)
}
