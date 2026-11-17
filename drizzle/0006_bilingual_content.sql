CREATE TABLE `lesson_content_block_translations` (
	`content_block_id` char(36) NOT NULL,
	`locale` varchar(2) NOT NULL,
	`content` json NOT NULL,
	`source_revision` int NOT NULL,
	`translation_revision` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`source_ref_payload` json NOT NULL,
	`revision_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_content_block_translations_content_block_id_locale_pk` PRIMARY KEY(`content_block_id`,`locale`),
	CONSTRAINT `lesson_content_block_translations_locale_ck` CHECK(`lesson_content_block_translations`.`locale` in ('en', 'id')),
	CONSTRAINT `lesson_content_block_translations_revision_ck` CHECK(`lesson_content_block_translations`.`source_revision` > 0 and `lesson_content_block_translations`.`translation_revision` > 0)
);
--> statement-breakpoint
CREATE TABLE `lesson_post_study_question_translations` (
	`question_id` char(36) NOT NULL,
	`locale` varchar(2) NOT NULL,
	`content` json NOT NULL,
	`source_revision` int NOT NULL,
	`translation_revision` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`source_ref_payload` json NOT NULL,
	`revision_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_post_study_question_translations_question_id_locale_pk` PRIMARY KEY(`question_id`,`locale`),
	CONSTRAINT `lesson_post_study_question_translations_locale_ck` CHECK(`lesson_post_study_question_translations`.`locale` in ('en', 'id')),
	CONSTRAINT `lesson_post_study_question_translations_revision_ck` CHECK(`lesson_post_study_question_translations`.`source_revision` > 0 and `lesson_post_study_question_translations`.`translation_revision` > 0)
);
--> statement-breakpoint
CREATE TABLE `lesson_translations` (
	`lesson_id` char(36) NOT NULL,
	`locale` varchar(2) NOT NULL,
	`title` varchar(255) NOT NULL,
	`learning_objective` text NOT NULL,
	`source_revision` int NOT NULL,
	`translation_revision` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`source_ref_payload` json NOT NULL,
	`revision_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lesson_translations_lesson_id_locale_pk` PRIMARY KEY(`lesson_id`,`locale`),
	CONSTRAINT `lesson_translations_locale_ck` CHECK(`lesson_translations`.`locale` in ('en', 'id')),
	CONSTRAINT `lesson_translations_revision_ck` CHECK(`lesson_translations`.`source_revision` > 0 and `lesson_translations`.`translation_revision` > 0)
);
--> statement-breakpoint
CREATE TABLE `practice_post_study_deliveries` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`question_id` char(36) NOT NULL,
	`snapshot_payload` json NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`receipt_id` char(36),
	CONSTRAINT `practice_post_study_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `practice_post_study_delivery_receipt_uk` UNIQUE(`receipt_id`)
);
--> statement-breakpoint
CREATE TABLE `skill_translations` (
	`skill_id` char(36) NOT NULL,
	`locale` varchar(2) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`content` json NOT NULL,
	`source_revision` int NOT NULL,
	`translation_revision` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`source_ref_payload` json NOT NULL,
	`revision_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skill_translations_skill_id_locale_pk` PRIMARY KEY(`skill_id`,`locale`),
	CONSTRAINT `skill_translations_locale_ck` CHECK(`skill_translations`.`locale` in ('en', 'id')),
	CONSTRAINT `skill_translations_revision_ck` CHECK(`skill_translations`.`source_revision` > 0 and `skill_translations`.`translation_revision` > 0)
);
--> statement-breakpoint
CREATE TABLE `track_translations` (
	`track_id` char(36) NOT NULL,
	`locale` varchar(2) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`source_revision` int NOT NULL,
	`translation_revision` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`source_ref_payload` json NOT NULL,
	`revision_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `track_translations_track_id_locale_pk` PRIMARY KEY(`track_id`,`locale`),
	CONSTRAINT `track_translations_locale_ck` CHECK(`track_translations`.`locale` in ('en', 'id')),
	CONSTRAINT `track_translations_revision_ck` CHECK(`track_translations`.`source_revision` > 0 and `track_translations`.`translation_revision` > 0)
);
--> statement-breakpoint
CREATE TABLE `unit_translations` (
	`unit_id` char(36) NOT NULL,
	`locale` varchar(2) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`source_revision` int NOT NULL,
	`translation_revision` int NOT NULL,
	`is_published` boolean NOT NULL DEFAULT false,
	`source_ref_payload` json NOT NULL,
	`revision_payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `unit_translations_unit_id_locale_pk` PRIMARY KEY(`unit_id`,`locale`),
	CONSTRAINT `unit_translations_locale_ck` CHECK(`unit_translations`.`locale` in ('en', 'id')),
	CONSTRAINT `unit_translations_revision_ck` CHECK(`unit_translations`.`source_revision` > 0 and `unit_translations`.`translation_revision` > 0)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` char(36) NOT NULL,
	`content_locale` varchar(2) NOT NULL DEFAULT 'en',
	`ui_locale` varchar(2) NOT NULL DEFAULT 'en',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `user_preferences_content_locale_ck` CHECK(`user_preferences`.`content_locale` in ('en', 'id')),
	CONSTRAINT `user_preferences_ui_locale_ck` CHECK(`user_preferences`.`ui_locale` in ('en', 'id'))
);
--> statement-breakpoint
ALTER TABLE `lesson_content_blocks` ADD `revision_payload` json;--> statement-breakpoint
ALTER TABLE `lesson_content_blocks` ADD `content_revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_content_blocks` ADD `seed_schema_version` varchar(10) DEFAULT '1.0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_post_study_questions` ADD `revision_payload` json;--> statement-breakpoint
ALTER TABLE `lesson_post_study_questions` ADD `content_revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_post_study_questions` ADD `seed_schema_version` varchar(10) DEFAULT '1.0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_post_study_questions` ADD `is_published` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `lessons` ADD `revision_payload` json;--> statement-breakpoint
ALTER TABLE `lessons` ADD `content_revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `lessons` ADD `seed_schema_version` varchar(10) DEFAULT '1.0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `skills` ADD `content` json;--> statement-breakpoint
ALTER TABLE `skills` ADD `revision_payload` json;--> statement-breakpoint
ALTER TABLE `skills` ADD `content_revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `skills` ADD `seed_schema_version` varchar(10) DEFAULT '1.0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `revision_payload` json;--> statement-breakpoint
ALTER TABLE `tracks` ADD `content_revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `seed_schema_version` varchar(10) DEFAULT '1.0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `units` ADD `revision_payload` json;--> statement-breakpoint
ALTER TABLE `units` ADD `content_revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `units` ADD `seed_schema_version` varchar(10) DEFAULT '1.0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_content_block_translations` ADD CONSTRAINT `block_translation_owner_fk` FOREIGN KEY (`content_block_id`) REFERENCES `lesson_content_blocks`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_post_study_question_translations` ADD CONSTRAINT `question_translation_owner_fk` FOREIGN KEY (`question_id`) REFERENCES `lesson_post_study_questions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_translations` ADD CONSTRAINT `lesson_translations_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_post_study_deliveries` ADD CONSTRAINT `practice_post_study_deliveries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_post_study_deliveries` ADD CONSTRAINT `post_study_delivery_question_fk` FOREIGN KEY (`question_id`) REFERENCES `lesson_post_study_questions`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_post_study_deliveries` ADD CONSTRAINT `post_study_delivery_receipt_fk` FOREIGN KEY (`receipt_id`) REFERENCES `practice_post_study_receipts`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_translations` ADD CONSTRAINT `skill_translations_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `track_translations` ADD CONSTRAINT `track_translations_track_id_tracks_id_fk` FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_translations` ADD CONSTRAINT `unit_translations_unit_id_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lesson_content_block_translations_locale_idx` ON `lesson_content_block_translations` (`locale`,`is_published`);--> statement-breakpoint
CREATE INDEX `lesson_post_study_question_translations_locale_idx` ON `lesson_post_study_question_translations` (`locale`,`is_published`);--> statement-breakpoint
CREATE INDEX `lesson_translations_locale_idx` ON `lesson_translations` (`locale`,`is_published`);--> statement-breakpoint
CREATE INDEX `practice_post_study_delivery_user_expiry_idx` ON `practice_post_study_deliveries` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `skill_translations_locale_idx` ON `skill_translations` (`locale`,`is_published`);--> statement-breakpoint
CREATE INDEX `track_translations_locale_idx` ON `track_translations` (`locale`,`is_published`);--> statement-breakpoint
CREATE INDEX `unit_translations_locale_idx` ON `unit_translations` (`locale`,`is_published`);--> statement-breakpoint
ALTER TABLE `lesson_content_blocks` ADD CONSTRAINT `lesson_content_blocks_content_revision_ck` CHECK (`lesson_content_blocks`.`content_revision` > 0);--> statement-breakpoint
ALTER TABLE `lesson_post_study_questions` ADD CONSTRAINT `lesson_post_study_questions_content_revision_ck` CHECK (`lesson_post_study_questions`.`content_revision` > 0);--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_content_revision_ck` CHECK (`lessons`.`content_revision` > 0);--> statement-breakpoint
ALTER TABLE `skills` ADD CONSTRAINT `skills_content_revision_ck` CHECK (`skills`.`content_revision` > 0);--> statement-breakpoint
ALTER TABLE `tracks` ADD CONSTRAINT `tracks_content_revision_ck` CHECK (`tracks`.`content_revision` > 0);--> statement-breakpoint
ALTER TABLE `units` ADD CONSTRAINT `units_content_revision_ck` CHECK (`units`.`content_revision` > 0);