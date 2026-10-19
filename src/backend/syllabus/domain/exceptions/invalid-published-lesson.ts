export class InvalidPublishedLesson extends Error {
  constructor(
    readonly lessonSlug: string,
    readonly reason: string,
  ) {
    super(`Published lesson ${lessonSlug}: ${reason}`);
    this.name = 'InvalidPublishedLesson';
  }
}
