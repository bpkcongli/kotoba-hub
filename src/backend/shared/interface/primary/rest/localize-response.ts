import { createTranslator } from 'next-intl';
import { z } from 'zod';
import type { Locale } from '@/shared/locale';
import detailKeys from './messages/detail-keys.json';
import en from './messages/en.json';
import id from './messages/id.json';

const envelopeSchema = z
  .object({
    status: z
      .object({
        code: z.number(),
        traceId: z.string(),
        message: z.string(),
        errorDetails: z.array(z.object({ field: z.string(), message: z.string() }).loose()),
      })
      .loose(),
  })
  .loose();

const messages: Record<
  Locale,
  {
    status: Record<string, string>;
    detail: Record<string, string>;
    validation: Record<string, string>;
  }
> = { en, id };

export function apiTranslator(locale: Locale) {
  return createTranslator({ locale, messages: messages[locale] });
}

export function localizeValidationMessage(message: string, locale: Locale): string {
  if (locale === 'en') return message;

  const t = apiTranslator(locale);

  const key = (detailKeys as Record<string, string>)[message];
  if (key) return t(`detail.${key}`);

  const bound = /(>=|>|<=|<)\s*(-?\d+(?:\.\d+)?)/.exec(message);
  if (bound && (message.startsWith('Too small:') || message.startsWith('Too big:'))) {
    const minimum = message.startsWith('Too small:');
    let key = minimum
      ? bound[1] === '>'
        ? 'minimumExclusive'
        : 'minimum'
      : bound[1] === '<'
        ? 'maximumExclusive'
        : 'maximum';

    if (message.includes('string to have'))
      key = minimum ? 'minimumCharacters' : 'maximumCharacters';

    if (message.includes('array to have')) key = minimum ? 'minimumItems' : 'maximumItems';

    return t(`validation.${key}`, { value: Number(bound[2]) });
  }

  const type = /^Invalid input: expected (string|number|boolean|array|object|int),/.exec(message);
  if (type) return t('validation.invalidType', { type: type[1] });

  const options = /^Invalid (?:option|input): expected (?:one of )?(.+)$/.exec(message);
  if (options) return t('validation.invalidOption', { options: options[1] });

  const format = /^Invalid (UUID|URL|ISO datetime|email address)$/.exec(message);
  if (format) return t('validation.invalidFormat', { format: format[1] });

  return t('validation.invalidValue');
}

export async function localizeApiResponse(response: Response, locale: Locale): Promise<Response> {
  if (!response.headers.get('content-type')?.includes('application/json')) return response;

  const parsed = envelopeSchema.safeParse(
    await response
      .clone()
      .json()
      .catch(() => null),
  );
  if (!parsed.success) return response;

  const body = parsed.data;
  const t = apiTranslator(locale);

  const statusKey = `status.${body.status.code}` as const;
  if (t.has(statusKey)) body.status.message = t(statusKey);

  body.status.errorDetails = body.status.errorDetails.map((detail) => ({
    ...detail,
    message: localizeValidationMessage(detail.message, locale),
  }));

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Language', locale);
  headers.delete('Content-Length');
  headers.delete('ETag');

  return new Response(JSON.stringify(body), { status: response.status, headers });
}
