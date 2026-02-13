CREATE TABLE "task" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(64) NOT NULL,
	"resource_id" varchar(256) NOT NULL,
	"status" varchar(16) DEFAULT 'running' NOT NULL,
	"message" varchar(1024),
	"created_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000 NOT NULL,
	"updated_at" bigint DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "task_resource_id_idx" ON "task" ("resource_id");--> statement-breakpoint
CREATE INDEX "task_type_resource_id_idx" ON "task" ("type","resource_id");
