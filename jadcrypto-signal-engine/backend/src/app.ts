/**
 * Bootstrap de Express.
 * La inicialización del DB y las migraciones se hace en server.ts.
 */
import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';

export const buildApp = (): Application => {
  const app = express();

  // ── Middlewares globales ──
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // ── Healthcheck ──
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'jadcrypto-signal-engine-backend',
      timestamp: new Date().toISOString(),
      engine: {
        enabled: env.ENGINE_ENABLED,
        scanIntervalMinutes: env.SCAN_INTERVAL_MINUTES,
      },
    });
  });

  // ── Rutas (se irán montando en los próximos pasos) ──
  // app.use('/api/alerts', alertsRouter);
  // app.use('/api/engine', engineRouter);

  // ── 404 ──
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return app;
};
