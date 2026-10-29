import sanitizeHtml from 'sanitize-html';
import type { LessonContentBlock } from '@/frontend/syllabus/interfaces/entities';

export function LessonRichText({ html, japanese = false }: { html: string; japanese?: boolean }) {
  const clean = sanitizeHtml(html, {
    allowedTags: [
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
    allowedAttributes: { span: ['class'] },
    allowedClasses: { span: ['text-emphasis'] },
    disallowedTagsMode: 'discard',
  });

  return (
    <div
      lang={japanese ? 'ja' : undefined}
      className={`min-w-0 space-y-3 overflow-x-auto leading-8 wrap-anywhere [&_.text-emphasis]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_ul]:list-disc ${japanese ? 'font-japanese text-body-lg' : ''}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export function LessonContent({ blocks }: { blocks: LessonContentBlock[] }) {
  return (
    <div className="min-w-0 space-y-8 wrap-anywhere">
      {[...blocks]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((block) => (
          <section key={block.id} className="min-w-0 space-y-3">
            {block.blockType === 'PARAGRAPH' ? (
              <>
                {block.content.title && (
                  <h2 className="text-h3 font-semibold">{block.content.title}</h2>
                )}

                <LessonRichText html={block.content.body} />
              </>
            ) : block.blockType === 'EXAMPLE_SENTENCE' ? (
              <div className="space-y-3 border-l-4 border-brand-secondary bg-secondary p-5">
                <h2 className="text-body-sm font-semibold">Example</h2>

                <LessonRichText html={block.content.japaneseSentence} japanese />

                <LessonRichText html={block.content.englishTranslation} />
              </div>
            ) : (
              <>
                <h2 className="text-h3 font-semibold">Grammar structure</h2>

                {(['ALL', 'STANDARD', 'POLITE'] as const).map((variant) =>
                  block.content[variant] ? (
                    <div key={variant} className="space-y-2">
                      {variant !== 'ALL' && (
                        <h3 className="text-body-sm font-semibold">
                          {variant === 'STANDARD' ? 'Standard form' : 'Polite form'}
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
