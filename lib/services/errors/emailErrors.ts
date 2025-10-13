// Custom error types for email service
export class EmailConfigError extends Error {
  constructor(message = 'Email service not configured') {
    super(message);
    this.name = 'EmailConfigError';
  }
}

export class EmailSendError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'EmailSendError';
  }
}