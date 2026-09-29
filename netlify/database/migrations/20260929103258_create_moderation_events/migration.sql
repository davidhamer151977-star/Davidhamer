CREATE TABLE "moderation_events" (
	"id" serial PRIMARY KEY,
	"profile_id" integer NOT NULL,
	"content_type" text NOT NULL,
	"decision" text NOT NULL,
	"category" text NOT NULL,
	"reason" text NOT NULL,
	"confidence" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_profile_id_profiles_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE;