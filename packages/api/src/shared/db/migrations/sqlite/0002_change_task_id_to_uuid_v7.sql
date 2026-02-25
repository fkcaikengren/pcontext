PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_doc` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`url` text NOT NULL,
	`task_id` text,
	`access_count` integer DEFAULT 0 NOT NULL,
	`tokens` integer DEFAULT 0 NOT NULL,
	`snippets` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_doc`("id", "slug", "name", "source", "url", "task_id", "access_count", "tokens", "snippets", "created_at", "updated_at") SELECT "id", "slug", "name", "source", "url", "task_id", "access_count", "tokens", "snippets", "created_at", "updated_at" FROM `doc`;--> statement-breakpoint
DROP TABLE `doc`;--> statement-breakpoint
ALTER TABLE `__new_doc` RENAME TO `doc`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `doc_slug_unique` ON `doc` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_task` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`message` text,
	`extra_data` text,
	`logs_length` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_task`("id", "type", "status", "message", "extra_data", "logs_length", "created_at", "updated_at") SELECT "id", "type", "status", "message", "extra_data", "logs_length", "created_at", "updated_at" FROM `task`;--> statement-breakpoint
DROP TABLE `task`;--> statement-breakpoint
ALTER TABLE `__new_task` RENAME TO `task`;