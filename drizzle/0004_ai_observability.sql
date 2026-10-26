CREATE TABLE `ai_request_attempts` (
	`id` char(36) NOT NULL,
	`ai_request_log_id` char(36) NOT NULL,
	`attempt_number` int NOT NULL,
	`provider` varchar(50) NOT NULL,
	`model` varchar(100) NOT NULL,
	`provider_request_id` varchar(100),
	`attempt_status` varchar(50) NOT NULL,
	`latency_ms` int,
	`prompt_tokens` int,
	`completion_tokens` int,
	`total_tokens` int,
	`estimated_cost_usd` decimal(12,6),
	`schema_parse_success` boolean NOT NULL DEFAULT false,
	`failure_code` varchar(100),
	`failure_reason` text,
	`redacted_input_payload` json,
	`redacted_output_payload` json,
	`started_at` timestamp(3) NOT NULL,
	`completed_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`attempt_metadata` json,
	CONSTRAINT `ai_request_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_request_attempts_request_number_uk` UNIQUE(`ai_request_log_id`,`attempt_number`)
);
--> statement-breakpoint
CREATE TABLE `ai_request_logs` (
	`id` char(36) NOT NULL,
	`request_key` varchar(100) NOT NULL,
	`user_id` char(36),
	`source_module` varchar(50) NOT NULL,
	`operation_name` varchar(100) NOT NULL,
	`source_entity_type` varchar(50),
	`source_entity_id` char(36),
	`provider` varchar(50) NOT NULL,
	`model` varchar(100) NOT NULL,
	`request_status` varchar(50) NOT NULL,
	`schema_name` varchar(100),
	`retry_count` int NOT NULL DEFAULT 0,
	`total_latency_ms` int,
	`prompt_tokens` int,
	`completion_tokens` int,
	`total_tokens` int,
	`estimated_cost_usd` decimal(12,6),
	`schema_parse_success` boolean NOT NULL DEFAULT false,
	`failure_code` varchar(100),
	`failure_reason` text,
	`redacted_input_payload` json,
	`redacted_output_payload` json,
	`started_at` timestamp(3) NOT NULL,
	`completed_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`metadata` json,
	CONSTRAINT `ai_request_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_request_logs_request_key_uk` UNIQUE(`request_key`)
);
--> statement-breakpoint
ALTER TABLE `ai_request_attempts` ADD CONSTRAINT `ai_request_attempts_ai_request_log_id_ai_request_logs_id_fk` FOREIGN KEY (`ai_request_log_id`) REFERENCES `ai_request_logs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_request_logs` ADD CONSTRAINT `ai_request_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_request_attempts_provider_model_idx` ON `ai_request_attempts` (`provider`,`model`,`started_at`);--> statement-breakpoint
CREATE INDEX `ai_request_attempts_status_idx` ON `ai_request_attempts` (`attempt_status`,`started_at`);--> statement-breakpoint
CREATE INDEX `ai_request_logs_user_started_idx` ON `ai_request_logs` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `ai_request_logs_source_idx` ON `ai_request_logs` (`source_module`,`operation_name`,`started_at`);--> statement-breakpoint
CREATE INDEX `ai_request_logs_status_idx` ON `ai_request_logs` (`request_status`,`started_at`);
