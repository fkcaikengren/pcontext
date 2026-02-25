ALTER TABLE "doc" ALTER COLUMN "task_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "task" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "task" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7();