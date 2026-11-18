ALTER TABLE `flashcard_decks` ADD `content_revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `flashcard_decks` ADD `localizations` json;--> statement-breakpoint
ALTER TABLE `flashcard_items` ADD `content_revision` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `flashcard_items` ADD `localizations` json;