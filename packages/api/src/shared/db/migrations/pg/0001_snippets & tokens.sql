ALTER TABLE "doc" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."doc_source";--> statement-breakpoint
CREATE TYPE "public"."doc_source" AS ENUM('github', 'gitee', 'website');--> statement-breakpoint
ALTER TABLE "doc" ALTER COLUMN "source" SET DATA TYPE "public"."doc_source" USING "source"::"public"."doc_source";--> statement-breakpoint
ALTER TABLE "doc" ADD COLUMN "tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doc" ADD COLUMN "snippets" integer DEFAULT 0 NOT NULL;