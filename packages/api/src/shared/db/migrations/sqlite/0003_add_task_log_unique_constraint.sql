PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_doc` (
	`id` integer PRIMARY KEY NOT NULL,
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
CREATE TABLE `__new_favorite` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`doc_id` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doc_id`) REFERENCES `doc`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_favorite`("id", "user_id", "doc_id", "created_at") SELECT "id", "user_id", "doc_id", "created_at" FROM `favorite`;--> statement-breakpoint
DROP TABLE `favorite`;--> statement-breakpoint
ALTER TABLE `__new_favorite` RENAME TO `favorite`;--> statement-breakpoint
-- Clean up duplicate task_logs before adding unique constraint
DELETE FROM `task_logs` WHERE id IN (
  SELECT tl1.id FROM `task_logs` tl1 INNER JOIN (
    SELECT task_id, created_at, content, MIN(id) as min_id FROM `task_logs`
    GROUP BY task_id, created_at, content HAVING COUNT(*) > 1
  ) tl2 ON tl1.task_id = tl2.task_id AND tl1.created_at = tl2.created_at AND tl1.content = tl2.content
  WHERE tl1.id > tl2.min_id
);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_task_time_content` ON `task_logs` (`task_id`,`created_at`,`content`);