-- ─────────────────────────────────────────────────────────────
-- JadCrypto Signal Engine — Inicialización SQL idempotente
-- Corre automáticamente por docker-entrypoint-initdb.d la
-- PRIMERA vez que se crea el volumen. Es seguro re-ejecutarlo.
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "alerts" (
    "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "idempotency_key"   varchar(128) NOT NULL UNIQUE,
    "symbol"            varchar(16) NOT NULL,
    "direction"         varchar(8)  NOT NULL,
    "status"            varchar(16) NOT NULL DEFAULT 'PENDING',
    "entryPrice"        numeric(20, 8) NOT NULL,
    "stopLoss"          numeric(20, 8) NOT NULL,
    "takeProfits"       jsonb NOT NULL,
    "poi"               jsonb NOT NULL,
    "choch"             jsonb NOT NULL,
    "inducement"        jsonb NOT NULL,
    "openInterest"      jsonb NOT NULL,
    "rsi"               jsonb NOT NULL,
    "risk"              jsonb NOT NULL,
    "message"           text NOT NULL,
    "confidence"        smallint NOT NULL DEFAULT 0,
    "dismissed_by_user" boolean NOT NULL DEFAULT false,
    "created_at"        timestamptz NOT NULL DEFAULT now(),
    "expires_at"        timestamptz NOT NULL,
    "updated_at"        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "chk_alerts_confidence" CHECK ("confidence" BETWEEN 0 AND 100),
    CONSTRAINT "chk_alerts_direction"  CHECK ("direction" IN ('LONG','SHORT')),
    CONSTRAINT "chk_alerts_status"     CHECK ("status" IN
      ('PENDING','ACTIVE','TP1_HIT','TP2_HIT','TP3_HIT','SL_HIT','EXPIRED','DISMISSED'))
);

CREATE INDEX IF NOT EXISTS "idx_alerts_symbol_created_at"
    ON "alerts" ("symbol", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_alerts_status" ON "alerts" ("status");
CREATE INDEX IF NOT EXISTS "idx_alerts_direction" ON "alerts" ("direction");
CREATE INDEX IF NOT EXISTS "idx_alerts_idempotency_key_created_at"
    ON "alerts" ("idempotency_key", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "engine_config" (
    "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "engine_enabled"         boolean NOT NULL DEFAULT true,
    "scan_interval_minutes"  integer NOT NULL DEFAULT 3,
    "symbols_universe"       jsonb,
    "updated_at"             timestamptz NOT NULL DEFAULT now(),
    "version"                integer NOT NULL DEFAULT 1,
    CONSTRAINT "chk_engine_interval" CHECK ("scan_interval_minutes" BETWEEN 1 AND 1440)
);

INSERT INTO "engine_config"
    ("engine_enabled", "scan_interval_minutes", "symbols_universe")
SELECT true, 3,
       '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT",
         "DOGEUSDT","ADAUSDT","AVAXUSDT","LINKUSDT","DOTUSDT"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "engine_config");
