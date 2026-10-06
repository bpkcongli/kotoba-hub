CREATE TABLE `accounts` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`provider_account_id` varchar(255) NOT NULL,
	`provider_email` varchar(255),
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` timestamp,
	`token_type` varchar(255),
	`scope` varchar(255),
	`id_token` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_provider_account_uk` UNIQUE(`provider`,`provider_account_id`)
);
--> statement-breakpoint
CREATE TABLE `learner_profiles` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`current_level` varchar(50),
	`target_level` varchar(50) NOT NULL,
	`daily_goal_minutes` int NOT NULL,
	`preferred_script` varchar(50) NOT NULL,
	`weak_skill_focuses` json NOT NULL,
	`known_skill_claims` json NOT NULL,
	`onboarding_completed` boolean NOT NULL DEFAULT false,
	`onboarding_completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learner_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `learner_profiles_user_id_uk` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`ip_address` varchar(255),
	`user_agent` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_uk` UNIQUE(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`display_name` varchar(255) NOT NULL,
	`avatar_url` varchar(512),
	`email_verified` boolean NOT NULL DEFAULT false,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uk` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learner_profiles` ADD CONSTRAINT `learner_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);