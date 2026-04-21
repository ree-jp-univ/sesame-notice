CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`device_uuid` text,
	`line_token` text,
	`line_channel_secret` text,
	`line_target_id` text,
	`line_target_type` text,
	`discord_webhook_url` text,
	`last_state` text,
	`last_timestamp` integer,
	`updated_at` text,
	`biz_jwt_token` text,
	`last_login_at` text,
	`last_warning_sent_at` text
);
--> statement-breakpoint
INSERT INTO `__new_settings`("user_id", "device_uuid", "line_token", "line_channel_secret", "line_target_id", "line_target_type", "discord_webhook_url", "last_state", "last_timestamp", "updated_at", "biz_jwt_token", "last_login_at", "last_warning_sent_at") SELECT "user_id", "device_uuid", "line_token", "line_channel_secret", "line_target_id", "line_target_type", "discord_webhook_url", "last_state", "last_timestamp", "updated_at", "biz_jwt_token", "last_login_at", "last_warning_sent_at" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;