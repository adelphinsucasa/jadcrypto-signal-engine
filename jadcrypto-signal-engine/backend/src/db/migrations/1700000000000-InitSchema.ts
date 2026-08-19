/**
 * Migración inicial: esquema base + singleton de EngineConfig.
 *
 * Esta migración es IDEMPOTENTE: usa `CREATE EXTENSION IF NOT EXISTS`,
 * `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` y
 * `INSERT ... ON CONFLICT DO NOTHING`. Puede ejecutarse varias veces
 * sin efectos colaterales.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // pgcrypto para gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ── Tabla de alertas ────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "alerts" (
        "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "idempotency_key"    varchar(128) NOT NULL UNIQUE,
        "symbol"             varchar(16) NOT NULL,
        "direction"          varchar(8)  NOT NULL,
        "status"             varchar(16) NOT NULL DEFAULT 'PENDING',
        "entryPrice"         numeric(20, 8) NOT NULL,
        "stopLoss"           numeric(20, 8) NOT NULL,
        "takeProfits"        jsonb NOT NULL,
        "poi"                jsonb NOT NULL,
        "choch"              jsonb NOT NULL,
        "inducement"         jsonb NOT NULL,
        "openInterest"       jsonb NOT NULL,
        "rsi"                jsonb NOT NULL,
        "risk"               jsonb NOT NULL,
        "message"            text NOT NULL,
        "confidence"         smallint NOT NULL DEFAULT 0,
        "dismissed_by_user"  boolean NOT NULL DEFAULT false,
        "created_at"         timestamptz NOT NULL DEFAULT now(),
        "expires_at"         timestamptz NOT NULL,
        "updated_at"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_alerts_confidence"  CHECK ("confidence" BETWEEN 0 AND 100),
        CONSTRAINT "chk_alerts_direction"   CHECK ("direction" IN ('LONG','SHORT')),
        CONSTRAINT "chk_alerts_status"      CHECK ("status" IN
          ('PENDING','ACTIVE','TP1_HIT','TP2_HIT','TP3_HIT','SL_HIT','EXPIRED','DISMISSED'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_alerts_symbol_created_at"
         ON "alerts" ("symbol", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_alerts_status" ON "alerts" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_alerts_direction" ON "alerts" ("direction")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_alerts_idempotency_key_created_at"
         ON "alerts" ("idempotency_key", "created_at" DESC)`,
    );

    // ── Tabla singleton EngineConfig ─────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "engine_config" (
        "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "engine_enabled"         boolean NOT NULL DEFAULT true,
        "scan_interval_minutes"  integer NOT NULL DEFAULT 3,
        "symbols_universe"       jsonb,
        "updated_at"             timestamptz NOT NULL DEFAULT now(),
        "version"                integer NOT NULL DEFAULT 1,
        CONSTRAINT "chk_engine_interval" CHECK ("scan_interval_minutes" BETWEEN 1 AND 1440)
      )
    `);

    // Sembrado idempotente: solo inserta si la tabla está vacía.
    // No usamos uuid fijo para mantener portabilidad entre entornos;
    // la aplicación garantiza singleton vía repositorio.
    await queryRunner.query(`
      INSERT INTO "engine_config"
        ("engine_enabled", "scan_interval_minutes", "symbols_universe")
      SELECT true, 3,
             '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT",
               "DOGEUSDT","ADAUSDT","AVAXUSDT","LINKUSDT","DOTUSDT"]'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM "engine_config")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "alerts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "engine_config"`);
  }
}
