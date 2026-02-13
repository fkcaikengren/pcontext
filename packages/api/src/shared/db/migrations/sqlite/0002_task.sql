CREATE TABLE `task` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`resource_id` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`message` text,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `task_resource_id_idx` ON `task` (`resource_id`);--> statement-breakpoint
CREATE INDEX `task_type_resource_id_idx` ON `task` (`type`,`resource_id`);
