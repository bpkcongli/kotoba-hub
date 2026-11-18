'use client';

import { useLocale } from 'next-intl';
import sanitizeHtml from 'sanitize-html';
import { useUiTranslations } from '@/frontend/shared/hooks';
import type { LessonContentBlock } from '@/frontend/syllabus/interfaces/entities';

export function LessonRichText({
  html,
  japanese = false,
  locale,
}: {
  html: string;
  japanese?: boolean;
  locale?: 'en' | 'id';
}) {
  const clean = sanitizeHtml(html, {
    allowedTags: [
      'div',
      'p',
      'br',
      'span',
      'strong',
      'em',
      'b',
      'i',
      'ul',
      'ol',
      'li',
      'ruby',
      'rt',
      'rp',
      'h3',
      'h4',
      'blockquote',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'code',
    ],
    allowedAttributes: { '*': ['class'] },
    allowedClasses: {
      '*': [
        'text-emphasis',
        'text-warning',
        'question-blank',
        'question-dialogue',
        'question-scenario',
        'question-continuation',
      ],
    },
    disallowedTagsMode: 'discard',
  });

  return (
    <div
      lang={japanese ? 'ja' : locale}
      className={`min-w-0 space-y-3 overflow-x-auto leading-8 wrap-anywhere [&_.text-emphasis]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_ul]:list-disc ${japanese ? 'font-japanese text-body-lg' : ''}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export function LessonContent({ blocks }: { blocks: LessonContentBlock[] }) {
  const t = useUiTranslations();
  const uiLocale = useLocale();

  return (
    <div className="min-w-0 space-y-8 wrap-anywhere">
      {[...blocks]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((block) => (
          <section
            lang={block.localization?.resolvedLocale}
            key={block.id}
            className="min-w-0 space-y-3">
            {block.localization?.isFallback && (
              <p lang={uiLocale} className="text-body-sm text-muted-foreground">
                {t('SYLLABUS:LESSON_CONTENT.TRANSLATION_FALLBACK_NOTICE.LABEL')}
              </p>
            )}

            {block.blockType === 'PARAGRAPH' ? (
              <>
                {block.content.title && (
                  <h2 className="text-h3 font-semibold">{block.content.title}</h2>
                )}

                <LessonRichText html={block.content.body} />
              </>
            ) : block.blockType === 'EXAMPLE_SENTENCE' ? (
              <div className="space-y-3 border-l-4 border-brand-secondary bg-secondary p-5">
                <h2 lang={uiLocale} className="text-body-sm font-semibold">
                  {t('SYLLABUS:LESSON_CONTENT.EXAMPLE_BLOCK.LABEL')}
                </h2>

                <LessonRichText html={block.content.japaneseSentence} japanese />

                <LessonRichText
                  html={
                    'translation' in block.content
                      ? block.content.translation
                      : block.content.englishTranslation
                  }
                />
              </div>
            ) : (
              <>
                <h2 lang={uiLocale} className="text-h3 font-semibold">
                  {t('SYLLABUS:LESSON_CONTENT.GRAMMAR_STRUCTURE_BLOCK.LABEL')}
                </h2>

                {(['ALL', 'STANDARD', 'POLITE'] as const).map((variant) =>
                  block.content[variant] ? (
                    <div key={variant} className="space-y-2">
                      {variant !== 'ALL' && (
                        <h3 lang={uiLocale} className="text-body-sm font-semibold">
                          {variant === 'STANDARD'
                            ? t('SYLLABUS:LESSON_CONTENT.FORM_COMPARISON.STANDARD_LABEL')
                            : t('SYLLABUS:LESSON_CONTENT.FORM_COMPARISON.POLITE_LABEL')}
                        </h3>
                      )}

                      <LessonRichText html={block.content[variant]} />
                    </div>
                  ) : null,
                )}
              </>
            )}
          </section>
        ))}
    </div>
  );
}
