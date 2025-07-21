CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(16) NOT NULL,
	"skin_url" text,
	"cape_url" text,
	"skin_hash" varchar(64),
	"cape_hash" varchar(64),
	"skin_model" varchar(10) DEFAULT 'steve',
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"server_id" varchar(255) NOT NULL,
	"shared_secret" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" varchar(64) NOT NULL,
	"data" text NOT NULL,
	"width" integer DEFAULT 64,
	"height" integer DEFAULT 32,
	"uploaded_by" uuid,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "skins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" varchar(64) NOT NULL,
	"data" text NOT NULL,
	"model" varchar(10) DEFAULT 'steve',
	"width" integer DEFAULT 64,
	"height" integer DEFAULT 64,
	"uploaded_by" uuid,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_id" uuid,
	"access_token" varchar(255) NOT NULL,
	"client_token" varchar(255) NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(16) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"is_email_verified" boolean DEFAULT false,
	"email_verification_token" varchar(255),
	"password_reset_token" varchar(255),
	"password_reset_expires" timestamp,
	"role" varchar(20) DEFAULT 'user',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capes" ADD CONSTRAINT "capes_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skins" ADD CONSTRAINT "skins_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_name_idx" ON "profiles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_sessions_profile_server_idx" ON "game_sessions" USING btree ("profile_id","server_id");--> statement-breakpoint
CREATE INDEX "game_sessions_expires_at_idx" ON "game_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "capes_hash_idx" ON "capes" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "capes_uploaded_by_idx" ON "capes" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "skins_hash_idx" ON "skins" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "skins_uploaded_by_idx" ON "skins" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "access_tokens_token_idx" ON "access_tokens" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "access_tokens_user_id_idx" ON "access_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "access_tokens_expires_at_idx" ON "access_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");