CREATE TABLE IF NOT EXISTS `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`sesame_api_key` text,
	`device_uuid` text,
	`line_token` text,
	`line_channel_secret` text,
	`line_target_id` text,
	`line_target_type` text,
	`discord_webhook_url` text,
	`last_state` text,
	`last_timestamp` integer,
	`updated_at` text
);

INSERT OR IGNORE INTO settings (id) VALUES (1);
