ALTER TABLE `doc` ADD `slug` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `doc_slug_unique` ON `doc` (`slug`);