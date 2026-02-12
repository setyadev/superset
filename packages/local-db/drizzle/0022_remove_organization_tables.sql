DROP TABLE `organization_members`;--> statement-breakpoint
DROP TABLE `organizations`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text NOT NULL,
	`status_color` text,
	`status_type` text,
	`status_position` integer,
	`priority` text NOT NULL,
	`repository_id` text,
	`assignee_id` text,
	`creator_id` text NOT NULL,
	`estimate` integer,
	`due_date` text,
	`labels` text,
	`branch` text,
	`pr_url` text,
	`external_provider` text,
	`external_id` text,
	`external_key` text,
	`external_url` text,
	`last_synced_at` text,
	`sync_error` text,
	`started_at` text,
	`completed_at` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "slug", "title", "description", "status", "status_color", "status_type", "status_position", "priority", "repository_id", "assignee_id", "creator_id", "estimate", "due_date", "labels", "branch", "pr_url", "external_provider", "external_id", "external_key", "external_url", "last_synced_at", "sync_error", "started_at", "completed_at", "deleted_at", "created_at", "updated_at") SELECT "id", "slug", "title", "description", "status", "status_color", "status_type", "status_position", "priority", "repository_id", "assignee_id", "creator_id", "estimate", "due_date", "labels", "branch", "pr_url", "external_provider", "external_id", "external_key", "external_url", "last_synced_at", "sync_error", "started_at", "completed_at", "deleted_at", "created_at", "updated_at" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_slug_unique` ON `tasks` (`slug`);--> statement-breakpoint
CREATE INDEX `tasks_slug_idx` ON `tasks` (`slug`);--> statement-breakpoint
CREATE INDEX `tasks_assignee_id_idx` ON `tasks` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_created_at_idx` ON `tasks` (`created_at`);--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `active_organization_id`;