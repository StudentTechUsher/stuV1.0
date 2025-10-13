// Custom error types for utility service
export class ColorExtractionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ColorExtractionError';
  }
}