ALTER TABLE "doc" ADD COLUMN "slug" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "doc" ADD CONSTRAINT "doc_slug_unique" UNIQUE("slug");