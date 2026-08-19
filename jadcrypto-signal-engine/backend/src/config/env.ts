/**
 * Configuración de entorno (parseada y validada).
 */
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('*'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_SYNCHRONIZE: z.coerce.boolean().default(false),
  DB_LOGGING: z.coerce.boolean().default(false),

  ENGINE_ENABLED: z.coerce.boolean().default(true),
  SCAN_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(1440).default(3),

  BINANCE_FUTURES_WS_URL: z.string().url().default('wss://fstream.binance.com'),
  BINANCE_FUTURES_REST_URL: z.string().url().default('https://fapi.binance.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
