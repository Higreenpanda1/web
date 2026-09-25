import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_topics_source" AS ENUM('editor', 'research', 'trend');
  CREATE TYPE "public"."enum_topics_intent" AS ENUM('informational', 'commercial', 'transactional');
  CREATE TABLE "posts_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"publisher" varchar
  );
  
  CREATE TABLE "_posts_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"publisher" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "research_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ran_at" timestamp(3) with time zone NOT NULL,
  	"summary" varchar NOT NULL,
  	"topics_added" numeric DEFAULT 0,
  	"report" varchar,
  	"signals" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "posts" ADD COLUMN "cta_service_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_cta_service_id" integer;
  ALTER TABLE "topics" ADD COLUMN "source" "enum_topics_source" DEFAULT 'editor';
  ALTER TABLE "topics" ADD COLUMN "intent" "enum_topics_intent";
  ALTER TABLE "topics" ADD COLUMN "target_service_id" integer;
  ALTER TABLE "topics" ADD COLUMN "demand_score" numeric;
  ALTER TABLE "topics" ADD COLUMN "audience" varchar;
  ALTER TABLE "topics" ADD COLUMN "seasonal_hook" varchar;
  ALTER TABLE "topics" ADD COLUMN "evidence" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "research_runs_id" integer;
  ALTER TABLE "posts_sources" ADD CONSTRAINT "posts_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_sources" ADD CONSTRAINT "_posts_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_sources_order_idx" ON "posts_sources" USING btree ("_order");
  CREATE INDEX "posts_sources_parent_id_idx" ON "posts_sources" USING btree ("_parent_id");
  CREATE INDEX "posts_sources_locale_idx" ON "posts_sources" USING btree ("_locale");
  CREATE INDEX "_posts_v_version_sources_order_idx" ON "_posts_v_version_sources" USING btree ("_order");
  CREATE INDEX "_posts_v_version_sources_parent_id_idx" ON "_posts_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_sources_locale_idx" ON "_posts_v_version_sources" USING btree ("_locale");
  CREATE INDEX "research_runs_ran_at_idx" ON "research_runs" USING btree ("ran_at");
  CREATE INDEX "research_runs_updated_at_idx" ON "research_runs" USING btree ("updated_at");
  CREATE INDEX "research_runs_created_at_idx" ON "research_runs" USING btree ("created_at");
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cta_service_id_services_id_fk" FOREIGN KEY ("cta_service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_cta_service_id_services_id_fk" FOREIGN KEY ("version_cta_service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "topics" ADD CONSTRAINT "topics_target_service_id_services_id_fk" FOREIGN KEY ("target_service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_research_runs_fk" FOREIGN KEY ("research_runs_id") REFERENCES "public"."research_runs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_cta_service_idx" ON "posts" USING btree ("cta_service_id");
  CREATE INDEX "_posts_v_version_version_cta_service_idx" ON "_posts_v" USING btree ("version_cta_service_id");
  CREATE INDEX "topics_source_idx" ON "topics" USING btree ("source");
  CREATE INDEX "topics_target_service_idx" ON "topics" USING btree ("target_service_id");
  CREATE INDEX "payload_locked_documents_rels_research_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("research_runs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_sources" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "research_runs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_sources" CASCADE;
  DROP TABLE "_posts_v_version_sources" CASCADE;
  DROP TABLE "research_runs" CASCADE;
  ALTER TABLE "posts" DROP CONSTRAINT "posts_cta_service_id_services_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_cta_service_id_services_id_fk";
  
  ALTER TABLE "topics" DROP CONSTRAINT "topics_target_service_id_services_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_research_runs_fk";
  
  DROP INDEX "posts_cta_service_idx";
  DROP INDEX "_posts_v_version_version_cta_service_idx";
  DROP INDEX "topics_source_idx";
  DROP INDEX "topics_target_service_idx";
  DROP INDEX "payload_locked_documents_rels_research_runs_id_idx";
  ALTER TABLE "posts" DROP COLUMN "cta_service_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_cta_service_id";
  ALTER TABLE "topics" DROP COLUMN "source";
  ALTER TABLE "topics" DROP COLUMN "intent";
  ALTER TABLE "topics" DROP COLUMN "target_service_id";
  ALTER TABLE "topics" DROP COLUMN "demand_score";
  ALTER TABLE "topics" DROP COLUMN "audience";
  ALTER TABLE "topics" DROP COLUMN "seasonal_hook";
  ALTER TABLE "topics" DROP COLUMN "evidence";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "research_runs_id";
  DROP TYPE "public"."enum_topics_source";
  DROP TYPE "public"."enum_topics_intent";`)
}
