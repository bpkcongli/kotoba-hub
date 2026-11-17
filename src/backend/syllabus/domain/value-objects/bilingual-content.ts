import type { Locale, Localization } from '@/shared/locale';

export interface ContentTranslation {
  sourceRevision: number;
  translationRevision: number;
  isPublished: boolean;
  sourceRefs: unknown[];
  title?: string | null;
  description?: string | null;
  learningObjective?: string;
  content?: Record<string, unknown>;
  body?: string;
  translation?: string;
  ALL?: string | null;
  STANDARD?: string | null;
  POLITE?: string | null;
  placeholder?: string | null;
  hintTexts?: string[];
  explanation?: string | null;
}

export interface BilingualOwner {
  contentRevision?: number;
  seedSchemaVersion?: string;
  localizations?: Partial<Record<Locale, ContentTranslation>>;
  localization?: Localization;
}

export class BilingualContent {
  static current(owner: BilingualOwner, locale: Locale): ContentTranslation | null {
    const text = owner.localizations?.[locale];
    return text?.isPublished && text.sourceRevision === owner.contentRevision ? text : null;
  }

  static resolve(owner: BilingualOwner, requestedLocale: Locale) {
    const resolvedLocale = this.current(owner, requestedLocale) ? requestedLocale : 'en';
    const text = this.current(owner, resolvedLocale);
    if (!text || !this.current(owner, 'en'))
      throw new Error('Current English content is required.');

    return {
      text,
      localization: {
        requestedLocale,
        resolvedLocale,
        isFallback: requestedLocale !== resolvedLocale,
        contentRevision: owner.contentRevision!,
        translationRevision: text.translationRevision,
      } satisfies Localization,
    };
  }
}

export function translationText(text: ContentTranslation): Record<string, unknown> {
  const { sourceRevision, translationRevision, isPublished, sourceRefs, ...payload } = text;

  void sourceRevision;
  void translationRevision;
  void isPublished;
  void sourceRefs;

  return payload;
}
