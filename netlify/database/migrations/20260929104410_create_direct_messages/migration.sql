CREATE TABLE "direct_messages" (
	"id" serial PRIMARY KEY,
	"sender_id" integer NOT NULL,
	"recipient_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "direct_messages_sender_idx" ON "direct_messages" ("sender_id","created_at");--> statement-breakpoint
CREATE INDEX "direct_messages_recipient_idx" ON "direct_messages" ("recipient_id","created_at");--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_profiles_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipient_id_profiles_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "profiles"("id") ON DELETE CASCADE;