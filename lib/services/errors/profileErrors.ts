// Custom error types for profile service
export class ProfileNotFoundError extends Error {
  constructor(message = 'Profile not found') {
    super(message);
    this.name = 'ProfileNotFoundError';
  }
}

export class ProfileFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ProfileFetchError';
  }
}

export class ProfileUpdateError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ProfileUpdateError';
  }
}