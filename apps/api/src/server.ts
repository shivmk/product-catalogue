import { pino } from 'pino';
import { loadConfig, type Config } from './config.js';
import type { Mailer } from './ports/Mailer.js';
import { FakeStoreProductRepository } from './adapters/fakeStore/FakeStoreProductRepository.js';
import { StaticFeaturedProductsProvider } from './adapters/StaticFeaturedProductsProvider.js';
import { SmtpMailer } from './adapters/mail/SmtpMailer.js';
import { ConsoleMailer } from './adapters/mail/ConsoleMailer.js';
import { CatalogueService } from './services/CatalogueService.js';
import { EnquiryService } from './services/EnquiryService.js';
import { createApp } from './http/app.js';

/*
 * Composition root: the only place that knows which adapters are in use.
 * Swapping the product source or email provider means changing what is constructed here.
 */

const config = loadConfig();
const logger = pino({ level: config.LOG_LEVEL });

function createMailer(config: Config): Mailer {
  if (config.MAIL_TRANSPORT === 'console') {
    if (config.NODE_ENV === 'production') {
      throw new Error('MAIL_TRANSPORT=console is for development only. Configure SMTP.');
    }
    return new ConsoleMailer(logger);
  }
  return new SmtpMailer({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
    from: config.MAIL_FROM,
  });
}

const products = new FakeStoreProductRepository({
  baseUrl: config.FAKE_STORE_BASE_URL,
  timeoutMs: config.UPSTREAM_TIMEOUT_MS,
  cacheTtlMs: config.PRODUCT_CACHE_TTL_SECONDS * 1000,
  onStaleServed: (err) => logger.warn({ err }, 'Product source failed; serving cached catalogue'),
});

const catalogue = new CatalogueService(
  products,
  new StaticFeaturedProductsProvider(config.FEATURED_PRODUCT_IDS),
  { featuredFallbackCount: 5, categoryTopRatedCount: config.CATEGORY_TOP_RATED_COUNT },
);

const enquiries = new EnquiryService(products, createMailer(config), {
  salesInbox: config.SALES_INBOX,
  publicWebUrl: config.PUBLIC_WEB_URL,
});

const app = createApp({
  catalogue,
  enquiries,
  logger,
  corsOrigins: config.CORS_ORIGINS,
  trustProxy: config.TRUST_PROXY,
  enquiryRateLimit: {
    max: config.ENQUIRY_RATE_LIMIT_MAX,
    windowMs: config.ENQUIRY_RATE_LIMIT_WINDOW_MINUTES * 60_000,
  },
});

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, mail: config.MAIL_TRANSPORT }, 'API listening');
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => process.exit(0));
  });
}
