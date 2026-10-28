import type { z } from 'zod';
import { ValidationError } from '../errors.js';

/** Parses untrusted input with a zod schema, turning failures into a ValidationError with per-field messages. */
export function parseOrThrow<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  message = 'Request is invalid',
): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  throw new ValidationError(message, fields);
}
