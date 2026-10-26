import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Client portal accounts (26 October 2026). `customers` stops being a Payload
 * auth collection: the portal signs clients in with an emailed code or a
 * WhatsApp link and keeps its own session, so the password, reset and
 * session columns go, and the sign-in state, the owner link and "disabled"
 * come in. The email column stays (now optional), so no account is lost.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "customers_sessions" CASCADE;
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_customers_fk";
  
  DROP INDEX "payload_preferences_rels_customers_id_idx";
  ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "customers" DROP COLUMN "reset_password_token";
  ALTER TABLE "customers" DROP COLUMN "reset_password_expiration";
  ALTER TABLE "customers" DROP COLUMN "salt";
  ALTER TABLE "customers" DROP COLUMN "hash";
  ALTER TABLE "customers" DROP COLUMN "reset_password_requested_at";
  ALTER TABLE "customers" DROP COLUMN "login_attempts";
  ALTER TABLE "customers" DROP COLUMN "lock_until";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "customers_id";
ALTER TABLE "customers" ADD COLUMN "owner_id" integer;
  ALTER TABLE "customers" ADD COLUMN "disabled" boolean DEFAULT false;
  ALTER TABLE "customers" ADD COLUMN "last_login_at" timestamp(3) with time zone;
  ALTER TABLE "customers" ADD COLUMN "session_version" numeric DEFAULT 0;
  ALTER TABLE "customers" ADD COLUMN "login_code_hash" varchar;
  ALTER TABLE "customers" ADD COLUMN "login_code_expires_at" timestamp(3) with time zone;
  ALTER TABLE "customers" ADD COLUMN "login_code_attempts" numeric DEFAULT 0;
  ALTER TABLE "customers" ADD COLUMN "login_link_hash" varchar;
  ALTER TABLE "customers" ADD COLUMN "login_link_expires_at" timestamp(3) with time zone;
  ALTER TABLE "customers" ADD CONSTRAINT "customers_owner_id_customers_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "customers_whatsapp_idx" ON "customers" USING btree ("whatsapp");
  CREATE INDEX "customers_owner_idx" ON "customers" USING btree ("owner_id");
  CREATE INDEX "customers_login_link_hash_idx" ON "customers" USING btree ("login_link_hash");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" DROP CONSTRAINT "customers_owner_id_customers_id_fk";
  
  DROP INDEX "customers_whatsapp_idx";
  DROP INDEX "customers_owner_idx";
  DROP INDEX "customers_login_link_hash_idx";
  ALTER TABLE "customers" DROP COLUMN "owner_id";
  ALTER TABLE "customers" DROP COLUMN "disabled";
  ALTER TABLE "customers" DROP COLUMN "last_login_at";
  ALTER TABLE "customers" DROP COLUMN "session_version";
  ALTER TABLE "customers" DROP COLUMN "login_code_hash";
  ALTER TABLE "customers" DROP COLUMN "login_code_expires_at";
  ALTER TABLE "customers" DROP COLUMN "login_code_attempts";
  ALTER TABLE "customers" DROP COLUMN "login_link_hash";
  ALTER TABLE "customers" DROP COLUMN "login_link_expires_at";
CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  ALTER TABLE "customers" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "customers" ADD COLUMN "reset_password_token" varchar;
  ALTER TABLE "customers" ADD COLUMN "reset_password_expiration" timestamp(3) with time zone;
  ALTER TABLE "customers" ADD COLUMN "salt" varchar;
  ALTER TABLE "customers" ADD COLUMN "hash" varchar;
  ALTER TABLE "customers" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;
  ALTER TABLE "customers" ADD COLUMN "login_attempts" numeric DEFAULT 0;
  ALTER TABLE "customers" ADD COLUMN "lock_until" timestamp(3) with time zone;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");`)
}
