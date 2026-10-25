export class FlashcardError extends Error {
  constructor(
    public readonly code:
      | 140405001
      | 140405002
      | 140405003
      | 142205001
      | 142205002
      | 142205003
      | 142205004
      | 142205005
      | 142205006,
    message: string,
    public readonly field = 'payload',
  ) {
    super(message);
    this.name = 'FlashcardError';
  }
}
