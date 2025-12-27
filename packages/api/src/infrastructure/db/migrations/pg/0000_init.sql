CREATE TYPE "public"."doc_source" AS ENUM('git', 'website');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "casbin_rule" (
	"id" serial PRIMARY KEY NOT NULL,
	"ptype" varchar(254),
	"v0" varchar(254),
	"v1" varchar(254),
	"v2" varchar(254),
	"v3" varchar(254),
	"v4" varchar(254),
	"v5" varchar(254)
);
--> statement-breakpoint
CREATE TABLE "doc" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"source" "doc_source" NOT NULL,
	"url" varchar(1024) NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"created_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000 NOT NULL,
	"updated_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"doc_id" integer NOT NULL,
	"created_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"password" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(254) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000 NOT NULL,
	"updated_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000 NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_phone_unique" UNIQUE("phone"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_doc_id_doc_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."doc"("id") ON DELETE no action ON UPDATE no action;