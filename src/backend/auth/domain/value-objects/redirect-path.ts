export class RedirectPath {
  private constructor(readonly value: string) {}

  static create(value: string): RedirectPath | null {
    if (
      !value.startsWith('/') ||
      value.startsWith('//') ||
      value.includes('\\') ||
      /[\x00-\x1f\x7f]/.test(value)
    ) {
      return null;
    }

    return new RedirectPath(value);
  }
}
