/**
 * Entidad EngineConfig
 * ─────────────────────────────────────────────────────────────
 * Almacena los parámetros del motor de escaneo SMC según la regla
 * "Control de Ejecución Dinámico (Engine Switch)" del modelfile:
 *
 *   - engine_enabled: boolean      → on/off del escaneo automático
 *   - scan_interval_minutes: number → intervalo entre ciclos (default: 3)
 *
 * Solo debe existir UNA fila activa (singleton). El backend garantiza
 * idempotencia sembrando la fila inicial en una transacción
 * `INSERT ... ON CONFLICT DO NOTHING`.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'engine_config' })
export class EngineConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Switch global del motor (regla Engine Switch) */
  @Column({ type: 'boolean', name: 'engine_enabled', default: true })
  engineEnabled!: boolean;

  /** Intervalo configurable en minutos (default: 3) */
  @Column({
    type: 'integer',
    name: 'scan_interval_minutes',
    default: 3,
  })
  scanIntervalMinutes!: number;

  /** Lista de símbolos Top 10 (JSONB para permitir edición sin migrar) */
  @Column({ type: 'jsonb', name: 'symbols_universe', nullable: true })
  symbolsUniverse!: string[] | null;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  /** Optimistic locking para evitar carreras entre start/stop del motor */
  @VersionColumn()
  version!: number;
}
