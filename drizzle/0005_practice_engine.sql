CREATE TABLE `practice_answers` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`question_id` char(36) NOT NULL,
	`attempt_number` int NOT NULL DEFAULT 1,
	`user_answer_payload` json NOT NULL,
	`is_correct` boolean NOT NULL,
	`numeric_score` decimal(5,2) NOT NULL,
	`feedback_text` text,
	`grading_source` varchar(50) NOT NULL,
	`grading_metadata` json NOT NULL,
	`response_time_ms` int,
	`answered_at` timestamp(3) NOT NULL,
	`progress_recorded` boolean NOT NULL DEFAULT false,
	`answer_payload` json NOT NULL,
	`result_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practice_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `practice_answers_question_attempt_uk` UNIQUE(`question_id`,`attempt_number`)
);
--> statement-breakpoint
CREATE TABLE `practice_post_study_receipts` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`idempotency_key` char(36) NOT NULL,
	`receipt_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practice_post_study_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `practice_post_study_user_key_uk` UNIQUE(`user_id`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `practice_questions` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`skill_id` char(36) NOT NULL,
	`question_type` varchar(50) NOT NULL,
	`grading_strategy` varchar(50) NOT NULL,
	`difficulty_band` varchar(50) NOT NULL,
	`prompt_text` text NOT NULL,
	`prompt_payload` json NOT NULL,
	`expected_answer_payload` json NOT NULL,
	`question_snapshot` json NOT NULL,
	`sort_order` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practice_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `practice_questions_session_sort_uk` UNIQUE(`session_id`,`sort_order`)
);
--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`status` varchar(50) NOT NULL,
	`difficulty_band` varchar(50) NOT NULL,
	`question_mix` json NOT NULL,
	`recommendation_spec` json NOT NULL,
	`total_questions` int NOT NULL,
	`answered_questions_count` int NOT NULL DEFAULT 0,
	`started_at` timestamp(3) NOT NULL,
	`completed_at` timestamp(3),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practice_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `practice_answers` ADD CONSTRAINT `practice_answers_session_id_practice_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `practice_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_answers` ADD CONSTRAINT `practice_answers_question_id_practice_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `practice_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_post_study_receipts` ADD CONSTRAINT `practice_post_study_receipts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_questions` ADD CONSTRAINT `practice_questions_session_id_practice_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `practice_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_questions` ADD CONSTRAINT `practice_questions_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_sessions` ADD CONSTRAINT `practice_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `practice_answers_session_idx` ON `practice_answers` (`session_id`);--> statement-breakpoint
CREATE INDEX `practice_questions_skill_idx` ON `practice_questions` (`skill_id`);--> statement-breakpoint
CREATE INDEX `practice_sessions_user_status_idx` ON `practice_sessions` (`user_id`,`status`);