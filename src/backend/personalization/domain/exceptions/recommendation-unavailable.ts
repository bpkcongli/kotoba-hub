export class RecommendationUnavailable extends Error {
  constructor() {
    super('No published practice content is available for this learner profile.');
    this.name = 'RecommendationUnavailable';
  }
}
