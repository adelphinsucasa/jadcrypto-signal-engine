/**
 * TypeORM DataSource
 * ─────────────────────────────────────────────────────────────
 * Configuración de la conexión a PostgreSQL usando variables
 * de entorno. `synchronize` está deshabilitado por seguridad:
 * los cambios de esquema se aplican vía migraciones versionadas
 * (carpeta src/db/migrations).
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';

import { Alert } from '../entities/Alert';
import { EngineConfig } from '../entities/EngineConfig';

loadEnv();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Variable de entorno requerida: ${key}`);
  }
  return value;
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: required('DB_HOST'),
  port: Number.parseInt(required('DB_PORT'), 10),
  username: required('DB_USER'),
  password: required('DB_PASSWORD'),
  database: required('DB_NAME'),
  entities: [Alert, EngineConfig],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default AppDataSource;
