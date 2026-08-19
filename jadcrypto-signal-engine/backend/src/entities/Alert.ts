/**
 * Entidad Alert
 * ─────────────────────────────────────────────────────────────
 * Almacena una alerta SMC completa. La información estructural
 * (POI, ChoCH, Inducement, OI, RSI, TPs y Riesgo) se persiste como
 * JSON para mantener el esquema estable a futuro.
 *
 * Idempotencia:
 *   - PK + UUID con `default: gen_random_uuid()` (idempotente con pgcrypto).
 *   - Índices nombrados con `IF NOT EXISTS` (creados en migración inicial).
 *   - No usar `synchronize: true` en producción: las columnas JSONB
 *     son estables pero los índices son responsabilidad de la migración.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import type {
  AlertStatus,
  Direction,
  Symbol,
} from '../types/smc';
import type {
  POIData,
  ChoCHData,
  InducementData,
  OpenInterestData,
  RSIData,
  TakeProfitLevelData,
  RiskManagementData,
} from '../types/smc';

@Entity({ name: 'alerts' })
@Index('idx_alerts_symbol_created_at', ['symbol', 'createdAt'])
@Index('idx_alerts_status', ['status'])
@Index('idx_alerts_direction', ['direction'])
@Index('idx_alerts_idempotency_key_created_at', ['idempotencyKey', 'createdAt'])
export class Alert {
  /** Identificador único (UUID generado por pgcrypto) */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Clave deduplicadora del escenario SMC detectado.
   *
   * Formato canónico: `<SYMBOL>-<DIRECTION>-<TIMEFRAME>-<EPOCH_MS>`
   * Ejemplo: `BTCUSDT-LONG-1m-1724083200000`.
   *
   * El backend consulta por esta clave dentro de una ventana parametrizable
   * (default 15 min, configurable vía EngineConfig) antes de insertar
   * una nueva alerta o de emitir el Overlay, evitando duplicados por
   * reconexión de Binance WS.
   */
  @Column({
    type: 'varchar',
    length: 128,
    name: 'idempotency_key',
    unique: true,
  })
  idempotencyKey!: string;

  // ── Mercado y dirección ──
  @Column({ type: 'varchar', length: 16 })
  symbol!: Symbol;

  @Column({ type: 'varchar', length: 8 })
  direction!: Direction;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: AlertStatus;

  // ── Precios ──
  @Column({ type: 'numeric', precision: 20, scale: 8 })
  entryPrice!: string; // numeric se serializa como string en pg

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  stopLoss!: string;

  /** Lista de Take Profits: [{level, price, closePercent, hit, hitAt}] */
  @Column({ type: 'jsonb' })
  takeProfits!: TakeProfitLevelData[];

  // ── Bloques SMC ──
  @Column({ type: 'jsonb' })
  poi!: POIData;

  @Column({ type: 'jsonb' })
  choch!: ChoCHData;

  @Column({ type: 'jsonb' })
  inducement!: InducementData;

  // ── Confirmación (OI + RSI) ──
  @Column({ type: 'jsonb' })
  openInterest!: OpenInterestData;

  @Column({ type: 'jsonb' })
  rsi!: RSIData;

  // ── Gestión de riesgo ──
  @Column({ type: 'jsonb' })
  risk!: RiskManagementData;

  // ── Metadata ──
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  /** Mensaje descriptivo para el overlay / historial */
  @Column({ type: 'text' })
  message!: string;

  /** Score de confianza del escenario (0–100) */
  @Column({ type: 'smallint', default: 0 })
  confidence!: number;

  /** Bandera de descarte por el usuario (regla del modelfile) */
  @Column({ type: 'boolean', name: 'dismissed_by_user', default: false })
  dismissedByUser!: boolean;
}
