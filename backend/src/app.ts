import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import path from 'path';
import { env } from './config/env';
import { logger } from './config/logger';
import routes from './routes';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { apiRateLimiter } from './middlewares/rateLimiter';

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === `${env.apiPrefix}/health` } }));
  }

  app.use(apiRateLimiter);

  // Serves locally-stored uploads when STORAGE_DRIVER=local. Cloudinary
  // assets are served directly from Cloudinary's CDN via their own URL.
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  app.use(env.apiPrefix, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
