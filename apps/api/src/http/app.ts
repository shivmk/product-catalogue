import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { ApiErrorBody } from '@catalogue/shared';
import type { CatalogueService } from '../services/CatalogueService.js';
import type { EnquiryService } from '../services/EnquiryService.js';
import { catalogueRoutes } from './catalogueRoutes.js';
import { enquiryRoutes } from './enquiryRoutes.js';
import { errorHandler, notFoundHandler } from './errorHandler.js';

export interface AppDependencies {
  catalogue: CatalogueService;
  enquiries: EnquiryService;
  logger: Logger;
  corsOrigins: string[];
  trustProxy: number;
  enquiryRateLimit: { max: number; windowMs: number };
}

/** Builds the HTTP app from already-constructed services, so tests can pass in fakes. */
export function createApp(deps: AppDependencies): Express {
  const app = express();
  app.set('trust proxy', deps.trustProxy);
  app.disable('x-powered-by');

  app.use(helmet());
  if (deps.corsOrigins.length > 0) app.use(cors({ origin: deps.corsOrigins }));
  app.use(express.json({ limit: '10kb' }));
  app.use(
    pinoHttp({ logger: deps.logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }),
  );

  const enquiryLimiter = rateLimit({
    windowMs: deps.enquiryRateLimit.windowMs,
    limit: deps.enquiryRateLimit.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many enquiries. Please try again later.' },
      } satisfies ApiErrorBody);
    },
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', catalogueRoutes(deps.catalogue));
  app.use('/api', enquiryRoutes(deps.enquiries, enquiryLimiter));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
