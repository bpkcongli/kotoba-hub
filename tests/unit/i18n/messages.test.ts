import { validationMessage } from '@/frontend/shared/helpers/error-message';
import { uiTranslator, type UiMessageKey } from '@/shared/i18n';
import { mergeUiMessages } from '@/shared/i18n/merge-messages';
import en from '@/shared/i18n/messages/en.json';
import id from '@/shared/i18n/messages/id.json';

function flatten(messages: object, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(messages).flatMap(([key, value]) => {
      expect(key).toMatch(/^[A-Z][A-Z_]*$/);

      const path = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        expect(value.trim()).not.toBe('');

        return [[path, value]];
      }

      expect(value).not.toBeNull();
      expect(Array.isArray(value)).toBe(false);
      expect(Object.keys(value).length).toBeGreaterThan(0);

      return Object.entries(flatten(value, path));
    }),
  );
}

function qualifiedKey(path: string): UiMessageKey {
  const separator = path.indexOf('.');
  const key = `${path.slice(0, separator)}:${path.slice(separator + 1)}`;

  expect(key).toMatch(/^[A-Z][A-Z_]*:[A-Z][A-Z_]*(?:\.[A-Z][A-Z_]*){2,}$/);

  return key as UiMessageKey;
}

function placeholders(message: string) {
  return [...new Set(Array.from(message.matchAll(/\{(\w+)(?:,|\})/g), (match) => match[1]))].sort();
}

test('nested UI catalogs have equivalent semantic keys, placeholders and renderable ICU messages', () => {
  const english = flatten(en);
  const indonesian = flatten(id);

  expect(Object.keys(indonesian).sort()).toEqual(Object.keys(english).sort());

  for (const [path, message] of Object.entries(english)) {
    expect(placeholders(indonesian[path])).toEqual(placeholders(message));
  }

  for (const [locale, messages] of [
    ['en', english],
    ['id', indonesian],
  ] as const) {
    const t = uiTranslator(locale);

    for (const [path, message] of Object.entries(messages)) {
      const key = qualifiedKey(path);
      const values = Object.fromEntries(
        placeholders(message).map((name) => [
          name,
          ['count', 'number', 'completed', 'total'].includes(name) ? 2 : 'example',
        ]),
      );

      expect(t.has(key)).toBe(true);
      expect(t(key, values)).not.toBe(key);
      expect(t(key, values)).not.toBe('');
    }
  }
});

test('qualified keys work with ICU pluralization and fixed translators remain locale-specific', () => {
  const english = uiTranslator('en');
  const indonesian = uiTranslator('id');
  const key = 'SYLLABUS:CATALOG_SUMMARY.LESSON_COUNT.LABEL';

  expect(english(key, { count: 1 })).toBe('1 lesson');
  expect(english(key, { count: 2 })).toBe('2 lessons');
  expect(indonesian(key, { count: 2 })).toBe('2 pelajaran');
  expect(english(key, { count: 1 })).toBe('1 lesson');
  expect(indonesian.has('ONBOARDING:ONBOARDING_SCREEN')).toBe(false);
  expect(indonesian.has('ONBOARDING:ONBOARDING_SCREEN.UNKNOWN_BUTTON.LABEL')).toBe(false);
  expect(indonesian.has('ONBOARDING.ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL')).toBe(
    false,
  );
});

test('a missing translated leaf falls back to English without replacing translated siblings', () => {
  const localized = structuredClone(id);
  const screen = { ...localized.ONBOARDING.ONBOARDING_SCREEN };
  Reflect.deleteProperty(screen.RELOAD_CATALOG_BUTTON, 'LABEL');
  const incomplete = {
    ...localized,
    ONBOARDING: { ...localized.ONBOARDING, ONBOARDING_SCREEN: screen },
  };
  const merged = mergeUiMessages(en, incomplete);

  expect(merged.ONBOARDING.ONBOARDING_SCREEN.RELOAD_CATALOG_BUTTON.LABEL).toBe(
    en.ONBOARDING.ONBOARDING_SCREEN.RELOAD_CATALOG_BUTTON.LABEL,
  );
  expect(merged.ONBOARDING.ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL).toBe(
    id.ONBOARDING.ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL,
  );
  expect(incomplete.ONBOARDING.ONBOARDING_SCREEN.RELOAD_CATALOG_BUTTON).not.toHaveProperty('LABEL');
  expect(en.ONBOARDING.ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL).toBe(
    'Continue onboarding',
  );
});

test('local validation descriptors use grouped keys while API validation messages remain text', () => {
  const t = uiTranslator('id');
  const key = 'ONBOARDING:ASSESSMENT_FORM.TARGET_LEVEL_SELECT.VALIDATION_MESSAGE';

  expect(validationMessage(key, t)).toBe(
    id.ONBOARDING.ASSESSMENT_FORM.TARGET_LEVEL_SELECT.VALIDATION_MESSAGE,
  );
  expect(validationMessage('A validation message supplied by the API.', t)).toBe(
    'A validation message supplied by the API.',
  );
  expect(validationMessage('ONBOARDING:ASSESSMENT_FORM.UNKNOWN_FIELD.VALIDATION_MESSAGE', t)).toBe(
    'ONBOARDING:ASSESSMENT_FORM.UNKNOWN_FIELD.VALIDATION_MESSAGE',
  );
});
