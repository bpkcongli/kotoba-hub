CREATE TABLE `lesson_content_blocks` (
	`id` char(36) NOT NULL,
	`lesson_id` char(36) NOT NULL,
	`block_type` varchar(50) NOT NULL,
	`content` json NOT NULL,
	`sort_order` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_content_blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `lesson_content_blocks_lesson_sort_uk` UNIQUE(`lesson_id`,`sort_order`),
	CONSTRAINT `lesson_content_blocks_block_type_ck` CHECK(`lesson_content_blocks`.`block_type` in ('PARAGRAPH', 'EXAMPLE_SENTENCE', 'GRAMMAR_STRUCTURE'))
);
--> statement-breakpoint
CREATE TABLE `lesson_post_study_questions` (
	`id` char(36) NOT NULL,
	`lesson_id` char(36) NOT NULL,
	`skill_id` char(36) NOT NULL,
	`difficulty_level` int NOT NULL,
	`question_type` varchar(50) NOT NULL,
	`prompt_payload` json NOT NULL,
	`expected_answer_payload` json NOT NULL,
	`explanation_text` text,
	`source_provider` varchar(50) NOT NULL,
	`source_ref_payload` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_post_study_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `lesson_post_study_questions_lesson_difficulty_uk` UNIQUE(`lesson_id`,`difficulty_level`),
	CONSTRAINT `lesson_post_study_questions_difficulty_level_ck` CHECK(`lesson_post_study_questions`.`difficulty_level` between 1 and 10),
	CONSTRAINT `lesson_post_study_questions_question_type_ck` CHECK(`lesson_post_study_questions`.`question_type` = 'SHORT_FREE_RESPONSE')
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` char(36) NOT NULL,
	`unit_id` char(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`learning_objective` text,
	`sort_order` int NOT NULL,
	`estimated_minutes` int,
	`is_published` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`),
	CONSTRAINT `lessons_slug_uk` UNIQUE(`slug`),
	CONSTRAINT `lessons_unit_sort_uk` UNIQUE(`unit_id`,`sort_order`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` char(36) NOT NULL,
	`lesson_id` char(36) NOT NULL,
	`code` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`curriculum_level` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`skill_type` varchar(50) NOT NULL,
	`supports_flashcards` boolean NOT NULL DEFAULT false,
	`supports_practice_objective` boolean NOT NULL DEFAULT false,
	`supports_practice_free_response` boolean NOT NULL DEFAULT false,
	`prerequisite_skill_codes` json,
	`sort_order` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skills_id` PRIMARY KEY(`id`),
	CONSTRAINT `skills_code_uk` UNIQUE(`code`),
	CONSTRAINT `skills_slug_uk` UNIQUE(`slug`),
	CONSTRAINT `skills_lesson_sort_uk` UNIQUE(`lesson_id`,`sort_order`)
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` char(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`curriculum_level` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`sort_order` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tracks_id` PRIMARY KEY(`id`),
	CONSTRAINT `tracks_slug_uk` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `unit_skill_mappings` (
	`id` char(36) NOT NULL,
	`unit_id` char(36) NOT NULL,
	`skill_id` char(36) NOT NULL,
	`lesson_id` char(36) NOT NULL,
	`is_primary` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `unit_skill_mappings_id` PRIMARY KEY(`id`),
	CONSTRAINT `unit_skill_mappings_unit_skill_uk` UNIQUE(`unit_id`,`skill_id`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` char(36) NOT NULL,
	`track_id` char(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`sort_order` int NOT NULL,
	`is_foundation_unit` boolean NOT NULL DEFAULT false,
	`is_published` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `units_id` PRIMARY KEY(`id`),
	CONSTRAINT `units_slug_uk` UNIQUE(`slug`),
	CONSTRAINT `units_track_sort_uk` UNIQUE(`track_id`,`sort_order`)
);
--> statement-breakpoint
ALTER TABLE `lesson_content_blocks` ADD CONSTRAINT `lesson_content_blocks_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_post_study_questions` ADD CONSTRAINT `lesson_post_study_questions_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_post_study_questions` ADD CONSTRAINT `lesson_post_study_questions_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skills` ADD CONSTRAINT `skills_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_skill_mappings` ADD CONSTRAINT `unit_skill_mappings_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_skill_mappings` ADD CONSTRAINT `unit_skill_mappings_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_skill_mappings` ADD CONSTRAINT `unit_skill_mappings_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `units` ADD CONSTRAINT `units_track_id_tracks_id_fk` FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lesson_content_blocks_lesson_id_idx` ON `lesson_content_blocks` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `lesson_post_study_questions_lesson_id_idx` ON `lesson_post_study_questions` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `lesson_post_study_questions_skill_id_idx` ON `lesson_post_study_questions` (`skill_id`);--> statement-breakpoint
CREATE INDEX `lessons_unit_id_idx` ON `lessons` (`unit_id`);--> statement-breakpoint
CREATE INDEX `skills_lesson_id_idx` ON `skills` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `skills_curriculum_level_type_idx` ON `skills` (`curriculum_level`,`skill_type`);--> statement-breakpoint
CREATE INDEX `tracks_curriculum_level_sort_idx` ON `tracks` (`curriculum_level`,`sort_order`);--> statement-breakpoint
CREATE INDEX `unit_skill_mappings_skill_id_idx` ON `unit_skill_mappings` (`skill_id`);--> statement-breakpoint
CREATE INDEX `unit_skill_mappings_lesson_id_idx` ON `unit_skill_mappings` (`lesson_id`);--> statement-breakpoint
CREATE INDEX `units_track_id_idx` ON `units` (`track_id`);