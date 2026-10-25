CREATE TABLE `flashcard_deck_items` (
	`deck_id` char(36) NOT NULL,
	`item_id` char(36) NOT NULL,
	`sort_order` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcard_deck_items_deck_id_item_id_pk` PRIMARY KEY(`deck_id`,`item_id`),
	CONSTRAINT `flashcard_deck_items_sort_uk` UNIQUE(`deck_id`,`sort_order`)
);
--> statement-breakpoint
CREATE TABLE `flashcard_decks` (
	`id` char(36) NOT NULL,
	`owner_user_id` char(36),
	`slug` varchar(100),
	`unit_id` char(36),
	`title` varchar(255) NOT NULL,
	`description` text,
	`deck_source` varchar(50) NOT NULL,
	`deck_type` varchar(50) NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`sort_order` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcard_decks_id` PRIMARY KEY(`id`),
	CONSTRAINT `flashcard_decks_slug_uk` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `flashcard_item_states` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`item_id` char(36) NOT NULL,
	`last_session_id` char(36),
	`current_bucket` varchar(50) NOT NULL DEFAULT 'NEW',
	`consecutive_correct_count` int NOT NULL DEFAULT 0,
	`last_answered_at` timestamp(3),
	`next_due_at` timestamp(3),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcard_item_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `flashcard_item_states_user_item_uk` UNIQUE(`user_id`,`item_id`)
);
--> statement-breakpoint
CREATE TABLE `flashcard_items` (
	`id` char(36) NOT NULL,
	`skill_id` char(36),
	`item_type` varchar(50) NOT NULL,
	`surface_form_text` varchar(255) NOT NULL,
	`kana_display_text` text,
	`romaji_text` varchar(255),
	`english_meaning` text,
	`onyomi_readings` json,
	`kunyomi_readings` json,
	`example_words` json,
	`answer_option_payload` json NOT NULL,
	`explanation_text` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcard_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcard_session_answers` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`item_id` char(36) NOT NULL,
	`turn_number` int NOT NULL,
	`prompt_script_mode` varchar(50) NOT NULL,
	`answer_script_mode` varchar(50) NOT NULL,
	`prompt_text_snapshot` text NOT NULL,
	`options_payload` json NOT NULL,
	`selected_option_id` varchar(100) NOT NULL,
	`correct_option_id` varchar(100) NOT NULL,
	`is_correct` boolean NOT NULL,
	`bucket_before` varchar(50) NOT NULL,
	`bucket_after` varchar(50) NOT NULL,
	`response_time_ms` int,
	`answered_at` timestamp(3) NOT NULL,
	`progress_recorded` boolean NOT NULL DEFAULT false,
	`answer_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcard_session_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `flashcard_answers_turn_uk` UNIQUE(`session_id`,`turn_number`),
	CONSTRAINT `flashcard_answers_item_uk` UNIQUE(`session_id`,`item_id`)
);
--> statement-breakpoint
CREATE TABLE `flashcard_sessions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`deck_id` char(36) NOT NULL,
	`status` varchar(50) NOT NULL,
	`question_script_mode` varchar(50) NOT NULL,
	`answer_script_mode` varchar(50) NOT NULL,
	`current_item_id` char(36),
	`total_items` int NOT NULL,
	`total_answered` int NOT NULL DEFAULT 0,
	`correct_count` int NOT NULL DEFAULT 0,
	`incorrect_count` int NOT NULL DEFAULT 0,
	`started_at` timestamp(3) NOT NULL,
	`completed_at` timestamp(3),
	`deck_snapshot` json NOT NULL,
	`turns_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flashcard_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `flashcard_deck_items` ADD CONSTRAINT `flashcard_deck_items_deck_id_flashcard_decks_id_fk` FOREIGN KEY (`deck_id`) REFERENCES `flashcard_decks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_deck_items` ADD CONSTRAINT `flashcard_deck_items_item_id_flashcard_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `flashcard_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_decks` ADD CONSTRAINT `flashcard_decks_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_decks` ADD CONSTRAINT `flashcard_decks_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_item_states` ADD CONSTRAINT `flashcard_item_states_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_item_states` ADD CONSTRAINT `flashcard_item_states_item_id_flashcard_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `flashcard_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_item_states` ADD CONSTRAINT `flashcard_item_states_last_session_id_flashcard_sessions_id_fk` FOREIGN KEY (`last_session_id`) REFERENCES `flashcard_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_items` ADD CONSTRAINT `flashcard_items_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_session_answers` ADD CONSTRAINT `flashcard_session_answers_session_id_flashcard_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `flashcard_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_session_answers` ADD CONSTRAINT `flashcard_session_answers_item_id_flashcard_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `flashcard_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_sessions` ADD CONSTRAINT `flashcard_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_sessions` ADD CONSTRAINT `flashcard_sessions_deck_id_flashcard_decks_id_fk` FOREIGN KEY (`deck_id`) REFERENCES `flashcard_decks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `flashcard_sessions` ADD CONSTRAINT `flashcard_sessions_current_item_id_flashcard_items_id_fk` FOREIGN KEY (`current_item_id`) REFERENCES `flashcard_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `flashcard_deck_items_item_idx` ON `flashcard_deck_items` (`item_id`);--> statement-breakpoint
CREATE INDEX `flashcard_decks_owner_idx` ON `flashcard_decks` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `flashcard_decks_source_idx` ON `flashcard_decks` (`deck_source`);--> statement-breakpoint
CREATE INDEX `flashcard_item_states_user_due_idx` ON `flashcard_item_states` (`user_id`,`next_due_at`);--> statement-breakpoint
CREATE INDEX `flashcard_items_skill_id_idx` ON `flashcard_items` (`skill_id`);--> statement-breakpoint
CREATE INDEX `flashcard_answers_item_idx` ON `flashcard_session_answers` (`item_id`);--> statement-breakpoint
CREATE INDEX `flashcard_answers_answered_at_idx` ON `flashcard_session_answers` (`answered_at`);--> statement-breakpoint
CREATE INDEX `flashcard_sessions_user_status_idx` ON `flashcard_sessions` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `flashcard_sessions_deck_id_idx` ON `flashcard_sessions` (`deck_id`);