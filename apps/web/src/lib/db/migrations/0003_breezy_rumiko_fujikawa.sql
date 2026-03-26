CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_verification_tokens_email" ON "verification_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_verification_tokens_token" ON "verification_tokens" USING btree ("token");