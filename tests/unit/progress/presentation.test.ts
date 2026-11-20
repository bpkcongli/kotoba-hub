import { progressNumber, progressTime } from '@/frontend/progress/helpers';

describe('progress presentation locale', () => {
  it('formats scores in the UI language without changing their value', () => {
    expect(progressNumber(1234.5, 'en')).toBe('1,234.5');
    expect(progressNumber(1234.5, 'id')).toBe('1.234,5');
    expect(progressNumber(0, 'id')).toBe('0');
  });

  it('keeps the timestamp in UTC for either language', () => {
    const instant = '2026-11-18T23:05:00Z';

    for (const locale of ['en', 'id'] as const) {
      const expected = new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      }).format(new Date(instant));

      expect(progressTime(instant, locale)).toBe(expected);
    }
  });

  it('handles missing or invalid timestamps without throwing', () => {
    expect(progressTime(null, 'en')).toBe('Not available');
    expect(progressTime('invalid', 'id')).toBe('Tidak tersedia');
  });

  it('formats UTC+7 without a zone label and rolls over to the next date', () => {
    const instant = '2026-11-18T23:05:00Z';
    const options = { timeZone: 'Asia/Jakarta', showTimeZone: false };

    expect(progressTime(instant, 'id', options)).toBe('19 Nov 2026, 6.05');
    expect(progressTime(instant, 'en', options)).toBe('Nov 19, 2026, 6:05 AM');
  });
});
