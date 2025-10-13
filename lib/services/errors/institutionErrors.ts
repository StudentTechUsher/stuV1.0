// Custom error types for institution service
export class InstitutionNotFoundError extends Error {
  constructor(message = 'Institution not found') {
    super(message);
    this.name = 'InstitutionNotFoundError';
  }
}

export class InstitutionFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'InstitutionFetchError';
  }
}

export class InstitutionUpdateError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'InstitutionUpdateError';
  }
}

export class InstitutionUnauthorizedError extends Error {
  constructor(message = 'Not authorized to modify institution settings') {
    super(message);
    this.name = 'InstitutionUnauthorizedError';
  }
}