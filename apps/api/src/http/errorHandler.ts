import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorBody } from '@catalogue/shared';
import { NotFoundError, UpstreamError, ValidationError } from '../errors.js';

function body(
  code: ApiErrorBody['error']['code'],
  message: string,
  fields?: Record<string, string>,
): ApiErrorBody {
  return { error: { code, message, ...(fields && { fields }) } };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body('NOT_FOUND', 'Route not found'));
};

/** Maps typed errors to responses. Anything unexpected becomes a generic 500; details go to the log only. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  if (error instanceof ValidationError) {
    res.status(400).json(body('VALIDATION_FAILED', error.message, error.fields));
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json(body('NOT_FOUND', error.message));
    return;
  }
  if (error instanceof UpstreamError) {
    req.log.error({ err: error }, 'Upstream dependency failed');
    res
      .status(502)
      .json(body('UPSTREAM_UNAVAILABLE', `${error.message}. Please try again shortly.`));
    return;
  }
  // express.json() rejects malformed or oversized bodies with an error carrying a 4xx status.
  if (isHttpClientError(error)) {
    res.status(error.status).json(body('VALIDATION_FAILED', 'Request body is invalid'));
    return;
  }
  req.log.error({ err: error }, 'Unhandled error');
  res.status(500).json(body('INTERNAL', 'Something went wrong'));
};

function isHttpClientError(error: unknown): error is { status: number } {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}
