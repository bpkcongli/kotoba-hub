export class PracticeError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly field = 'body',
  ) {
    super(message);
    this.name = 'PracticeError';
  }
}
