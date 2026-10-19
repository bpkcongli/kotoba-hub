export class InvalidProgressEvent extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProgressEvent';
  }
}
