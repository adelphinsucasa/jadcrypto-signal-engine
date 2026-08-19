/**
 * Servidor HTTP — punto de entrada.
 * ─────────────────────────────────────────────────────────────
 * - Inicializa la conexión a PostgreSQL.
 * - Ejecuta migraciones pendientes (idempotentes).
 * - Arranca la API REST. NO inicia el motor de escaneo aquí;
 *   el motor es responsabilidad de `engine.service.ts` (Paso 3)
 *   y se controla dinámicamente vía EngineConfig.
 */
import 'reflect-metadata';

import { buildApp } from './app';
import { env } from './config/env';
import { AppDataSource } from './db/datasource';

const start = async (): Promise<void> => {
  try {
    // ── Conexión a PostgreSQL ──
    await AppDataSource.initialize();
    // eslint-disable-next-line no-console
    console.log('✅ [db] Conexión a PostgreSQL establecida');

    // ── Migraciones idempotentes ──
    const ran = await AppDataSource.runMigrations({ transaction: 'each' });
    if (ran.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`✅ [db] Migraciones aplicadas: ${ran.map((m) => m.name).join(', ')}`);
    } else {
      // eslint-disable-next-line no-console
      console.log('ℹ️  [db] Esquema ya sincronizado (sin migraciones nuevas)');
    }

    // ── Arranque del servidor HTTP ──
    const app = buildApp();
    app.listen(env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 JadCrypto API escuchando en http://localhost:${env.PORT}`);
      // eslint-disable-next-line no-console
      console.log(
        `   Engine por defecto: ${env.ENGINE_ENABLED ? 'ACTIVO' : 'DETENIDO'} | ` +
          `Intervalo: ${env.SCAN_INTERVAL_MINUTES} min`,
      );
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error fatal durante el arranque:', error);
    process.exit(1);
  }
};

// ── Manejo elegante de señales ──
const shutdown = async (signal: string): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log(`\n📴 Señal ${signal} recibida, cerrando…`);
  try {
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error durante el cierre:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

void start();
