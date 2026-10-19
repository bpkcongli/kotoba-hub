CREATE TABLE `lesson_understanding_snapshots` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`lesson_id` char(36) NOT NULL,
	`last_progress_event_id` char(36),
	`last_question_id` char(36),
	`current_understanding_level` int NOT NULL DEFAULT 0,
	`last_attempted_difficulty_level` int,
	`last_correct_difficulty_level` int,
	`total_correct_count` int NOT NULL DEFAULT 0,
	`total_attempt_count` int NOT NULL DEFAULT 0,
	`last_attempted_at` timestamp(3),
	`last_correct_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_understanding_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `lesson_understanding_snapshots_user_lesson_uk` UNIQUE(`user_id`,`lesson_id`),
	CONSTRAINT `lesson_understanding_snapshots_level_ck` CHECK(`lesson_understanding_snapshots`.`current_understanding_level` between 0 and 10),
	CONSTRAINT `lesson_understanding_snapshots_last_attempted_difficulty_ck` CHECK(`lesson_understanding_snapshots`.`last_attempted_difficulty_level` is null or `lesson_understanding_snapshots`.`last_attempted_difficulty_level` between 1 and 10),
	CONSTRAINT `lesson_understanding_snapshots_last_correct_difficulty_ck` CHECK(`lesson_understanding_snapshots`.`last_correct_difficulty_level` is null or `lesson_understanding_snapshots`.`last_correct_difficulty_level` between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE `progress_events` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`skill_id` char(36) NOT NULL,
	`source_type` varchar(50) NOT NULL,
	`source_session_id` char(36),
	`source_entity_id` char(36) NOT NULL,
	`question_type` varchar(50) NOT NULL,
	`is_correct` boolean NOT NULL,
	`numeric_score` decimal(5,2) NOT NULL,
	`confidence_weight` decimal(5,2),
	`response_time_ms` int,
	`lesson_id` char(36) NOT NULL,
	`unit_id` char(36) NOT NULL,
	`track_id` char(36) NOT NULL,
	`grading_metadata` json,
	`answered_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `progress_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `progress_events_score_ck` CHECK(`progress_events`.`numeric_score` between 0 and 100),
	CONSTRAINT `progress_events_confidence_ck` CHECK(`progress_events`.`confidence_weight` is null or `progress_events`.`confidence_weight` between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE `skill_mastery_snapshots` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`skill_id` char(36) NOT NULL,
	`last_progress_event_id` char(36),
	`mastery_score` decimal(5,2) NOT NULL,
	`accuracy_score` decimal(5,2) NOT NULL,
	`recency_score` decimal(5,2) NOT NULL,
	`confidence_score` decimal(5,2) NOT NULL,
	`attempts_window_size` int NOT NULL,
	`correct_attempts_count` int NOT NULL,
	`mastery_state` varchar(50) NOT NULL,
	`recommended_difficulty_band` varchar(50) NOT NULL,
	`last_activity_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skill_mastery_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `skill_mastery_snapshots_user_skill_uk` UNIQUE(`user_id`,`skill_id`),
	CONSTRAINT `skill_mastery_snapshots_score_ck` CHECK(`skill_mastery_snapshots`.`mastery_score` between 0 and 100),
	CONSTRAINT `skill_mastery_snapshots_window_ck` CHECK(`skill_mastery_snapshots`.`attempts_window_size` between 0 and 20 and `skill_mastery_snapshots`.`correct_attempts_count` between 0 and `skill_mastery_snapshots`.`attempts_window_size`)
);
--> statement-breakpoint
ALTER TABLE `lesson_understanding_snapshots` ADD CONSTRAINT `lesson_understanding_snapshots_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_understanding_snapshots` ADD CONSTRAINT `lesson_understanding_snapshots_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_understanding_snapshots` ADD CONSTRAINT `lesson_understanding_last_event_fk` FOREIGN KEY (`last_progress_event_id`) REFERENCES `progress_events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_understanding_snapshots` ADD CONSTRAINT `lesson_understanding_last_question_fk` FOREIGN KEY (`last_question_id`) REFERENCES `lesson_post_study_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_events` ADD CONSTRAINT `progress_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_events` ADD CONSTRAINT `progress_events_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_events` ADD CONSTRAINT `progress_events_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_events` ADD CONSTRAINT `progress_events_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_events` ADD CONSTRAINT `progress_events_track_id_tracks_id_fk` FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_mastery_snapshots` ADD CONSTRAINT `skill_mastery_snapshots_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_mastery_snapshots` ADD CONSTRAINT `skill_mastery_snapshots_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_mastery_snapshots` ADD CONSTRAINT `skill_mastery_last_event_fk` FOREIGN KEY (`last_progress_event_id`) REFERENCES `progress_events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lesson_understanding_snapshots_user_level_idx` ON `lesson_understanding_snapshots` (`user_id`,`current_understanding_level`);--> statement-breakpoint
CREATE INDEX `lesson_understanding_snapshots_lesson_idx` ON `lesson_understanding_snapshots` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `progress_events_user_skill_answered_idx` ON `progress_events` (`user_id`,`skill_id`,`answered_at`);--> statement-breakpoint
CREATE INDEX `progress_events_source_idx` ON `progress_events` (`source_type`,`source_session_id`,`source_entity_id`);--> statement-breakpoint
CREATE INDEX `progress_events_unit_idx` ON `progress_events` (`user_id`,`unit_id`,`answered_at`);--> statement-breakpoint
CREATE INDEX `skill_mastery_snapshots_user_state_idx` ON `skill_mastery_snapshots` (`user_id`,`mastery_state`);--> statement-breakpoint
CREATE INDEX `skill_mastery_snapshots_difficulty_idx` ON `skill_mastery_snapshots` (`user_id`,`recommended_difficulty_band`);