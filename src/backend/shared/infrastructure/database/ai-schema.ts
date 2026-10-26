import {
  boolean,
  char,
  decimal,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { users } from '@/backend/users/infrastructure/database/schema';

function tokenColumns() {
  return {
    promptTokens: int('prompt_tokens'),
    completionTokens: int('completion_tokens'),
    totalTokens: int('total_tokens'),
    estimatedCostUsd: decimal('estimated_cost_usd', { precision: 12, scale: 6, mode: 'number' }),
  };
}

function diagnosticColumns() {
  return {
    schemaParseSuccess: boolean('schema_parse_success').notNull().default(false),
    failureCode: varchar('failure_code', { length: 100 }),
    failureReason: text('failure_reason'),

    redactedInputPayload: json('redacted_input_payload').$type<Record<string, unknown>>(),
    redactedOutputPayload: json('redacted_output_payload').$type<Record<string, unknown>>(),

    startedAt: timestamp('started_at', { fsp: 3 }).notNull(),
    completedAt: timestamp('completed_at', { fsp: 3 }),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  };
}

export const aiRequestLogs = mysqlTable(
  'ai_request_logs',
  {
    id: char('id', { length: 36 }).primaryKey(),
    requestKey: varchar('request_key', { length: 100 }).notNull(),
    userId: char('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),

    sourceModule: varchar('source_module', { length: 50 }).notNull(),
    operationName: varchar('operation_name', { length: 100 }).notNull(),
    sourceEntityType: varchar('source_entity_type', { length: 50 }),
    sourceEntityId: char('source_entity_id', { length: 36 }),

    provider: varchar('provider', { length: 50 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),

    requestStatus: varchar('request_status', { length: 50 }).notNull(),
    schemaName: varchar('schema_name', { length: 100 }),
    retryCount: int('retry_count').notNull().default(0),
    totalLatencyMs: int('total_latency_ms'),

    ...tokenColumns(),
    ...diagnosticColumns(),

    metadata: json('metadata').$type<Record<string, unknown>>(),
  },
  (table) => [
    uniqueIndex('ai_request_logs_request_key_uk').on(table.requestKey),
    index('ai_request_logs_user_started_idx').on(table.userId, table.startedAt),
    index('ai_request_logs_source_idx').on(
      table.sourceModule,
      table.operationName,
      table.startedAt,
    ),
    index('ai_request_logs_status_idx').on(table.requestStatus, table.startedAt),
  ],
);

export const aiRequestAttempts = mysqlTable(
  'ai_request_attempts',
  {
    id: char('id', { length: 36 }).primaryKey(),
    aiRequestLogId: char('ai_request_log_id', { length: 36 })
      .notNull()
      .references(() => aiRequestLogs.id),
    attemptNumber: int('attempt_number').notNull(),

    provider: varchar('provider', { length: 50 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    providerRequestId: varchar('provider_request_id', { length: 100 }),

    attemptStatus: varchar('attempt_status', { length: 50 }).notNull(),
    latencyMs: int('latency_ms'),

    ...tokenColumns(),
    ...diagnosticColumns(),

    attemptMetadata: json('attempt_metadata').$type<Record<string, unknown>>(),
  },
  (table) => [
    uniqueIndex('ai_request_attempts_request_number_uk').on(
      table.aiRequestLogId,
      table.attemptNumber,
    ),
    index('ai_request_attempts_provider_model_idx').on(
      table.provider,
      table.model,
      table.startedAt,
    ),
    index('ai_request_attempts_status_idx').on(table.attemptStatus, table.startedAt),
  ],
);
