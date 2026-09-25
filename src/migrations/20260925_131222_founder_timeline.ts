import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_team_members_timeline_kind" AS ENUM('work', 'education', 'award', 'course');
  CREATE TABLE "team_members_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_team_members_timeline_kind" DEFAULT 'work' NOT NULL,
  	"period" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"organisation" varchar,
  	"note" varchar
  );
  
  ALTER TABLE "team_members_timeline" ADD CONSTRAINT "team_members_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "team_members_timeline_order_idx" ON "team_members_timeline" USING btree ("_order");
  CREATE INDEX "team_members_timeline_parent_id_idx" ON "team_members_timeline" USING btree ("_parent_id");
  CREATE INDEX "team_members_timeline_locale_idx" ON "team_members_timeline" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "team_members_timeline" CASCADE;
  DROP TYPE "public"."enum_team_members_timeline_kind";`)
}
