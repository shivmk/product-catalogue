/** Typed errors thrown by services and adapters; the error middleware maps them to HTTP responses. */

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** A dependency we don't control (product source, email provider) failed. Details stay in the logs. */
export class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UpstreamError';
  }
}
