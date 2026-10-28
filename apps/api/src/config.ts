import { z } from 'zod';

const csv = z.string().transform((value) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean),
);

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Number of reverse proxies in front of the API (nginx in docker compose), so rate limiting sees real client IPs. */
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),
  /** Only needed when the web app is served from a different origin than the API. */
  CORS_ORIGINS: csv.default([]),

  FAKE_STORE_BASE_URL: z.url().default('https://fakestoreapi.com'),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  PRODUCT_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),

  /** The products the business has chosen as "top rated", in display order. */
  FEATURED_PRODUCT_IDS: csv
    .transform((parts) => parts.map(Number))
    .pipe(z.array(z.number().int().positive()))
    .default([1, 5, 9, 13, 18]),
  CATEGORY_TOP_RATED_COUNT: z.coerce.number().int().positive().default(3),

  MAIL_TRANSPORT: z.enum(['smtp', 'console']).default('console'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: booleanString.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SALES_INBOX: z.email().default('sales@example.com'),
  MAIL_FROM: z.string().default('Product Catalogue <no-reply@example.com>'),
  /** Used to put a link to the product page in the sales email. */
  PUBLIC_WEB_URL: z.url().default('http://localhost:8080'),

  ENQUIRY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  ENQUIRY_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Treat empty strings (e.g. `SMTP_USER=` in an env file) as "not set" so defaults apply.
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
  const result = ConfigSchema.safeParse(cleaned);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${problems}`);
  }
  return result.data;
}
