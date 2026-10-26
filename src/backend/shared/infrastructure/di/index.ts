import 'server-only';
import type { AiService } from '@/backend/shared/application/services/ai.service';
import { AiServiceImpl } from '@/backend/shared/application/services/impl/ai.service.impl';
import { readAiEnv } from '@/backend/shared/infrastructure/config/ai-env';
import { OpenAiProvider } from '@/backend/shared/interface/secondary/ai/openai-provider';
import { DrizzleAiRequestLogRepository } from '@/backend/shared/interface/secondary/persistence/drizzle-ai-request-log.repository';

export function getAiService(): AiService {
  const config = readAiEnv();

  return new AiServiceImpl(
    new OpenAiProvider(config.apiKey),
    new DrizzleAiRequestLogRepository(),
    config,
  );
}
