/**
 * Tipos centrales del sistema de alertas SMC (Smart Money Concepts)
 * Modelados según las reglas de negocio definidas en Agent_Context.md
 */

// ─────────────────────────────────────────────────────────────
// Mercado y dirección
// ─────────────────────────────────────────────────────────────

/** Activos Top 10 por volumen 24h + volatilidad > 5% */
export type Symbol =
  | 'BTCUSDT'
  | 'ETHUSDT'
  | 'SOLUSDT'
  | 'BNBUSDT'
  | 'XRPUSDT'
  | 'DOGEUSDT'
  | 'ADAUSDT'
  | 'AVAXUSDT'
  | 'LINKUSDT'
  | 'DOTUSDT';

/** Temporalidades usadas por el motor de análisis */
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h';

/** Dirección de la operación (HH/HL = LONG, LH/LL = SHORT) */
export type Direction = 'LONG' | 'SHORT';

/** Estados posibles del ciclo de vida de una alerta */
export type AlertStatus = 'PENDING' | 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'SL_HIT' | 'EXPIRED' | 'DISMISSED';

// ─────────────────────────────────────────────────────────────
// Bloques SMC
// ─────────────────────────────────────────────────────────────

/** Tipos de Punto de Interés (POI) identificados */
export type POIType = 'ORDER_BLOCK' | 'FVG';

/**
 * Punto de Interés detectado en el mercado.
 * - OB: rango de velas con desequilibrio institucional.
 * - FVG: hueco entre mechas (fair value gap); el 50% se usa para confirmación.
 */
export interface PointOfInterest {
  type: POIType;
  /** Precio alto del bloque/zona */
  high: number;
  /** Precio bajo del bloque/zona */
  low: number;
  /** Mitad del FVG (cuando type === 'FVG'), usada como entrada óptima */
  midpoint?: number;
  /** ¿Ha sido mitigado previamente? (regla: solo OBs/FVGs no mitigados) */
  mitigated: boolean;
  /** Temporalidad donde se identificó */
  timeframe: Timeframe;
}

/**
 * Cambio de Carácter (Change of Character): ruptura de estructura micro
 * que confirma la entrada cuando el precio interactúa con el OB o el 50% del FVG.
 */
export interface ChangeOfCharacter {
  detected: boolean;
  /** Temporalidad donde se confirmó (5m / 1m) */
  timeframe: Timeframe;
  /** Vela en la que se produjo el rompimiento */
  timestamp: number;
}

/**
 * Inducement / Liquidez previa al POI:
 * mínimos o máximos relativos iguales que el precio busca antes de revertir.
 */
export interface LiquiditySweep {
  detected: boolean;
  /** Precio del swing de liquidez barrido */
  level: number;
  /** Tipo de liquidez tomada */
  kind: 'EQUAL_LOWS' | 'EQUAL_HIGHS' | 'PREVIOUS_LOW' | 'PREVIOUS_HIGH';
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────
// Confirmación con derivados y osciladores
// ─────────────────────────────────────────────────────────────

/** Open Interest: incremental (OINV) que sostenga la dirección de la ruptura */
export interface OpenInterestData {
  /** OI actual */
  current: number;
  /** OI en el instante del rompimiento */
  atBreakout: number;
  /** Variación porcentual desde el rompimiento */
  deltaPercent: number;
  /** ¿Sostiene la dirección de la ruptura? */
  confirms: boolean;
}

/** RSI(14): si está saturado en zonas extremas por tiempo prolongado en macro, descartar */
export interface RSIData {
  value: number;
  /** true si está en sobrecompra (>70) o sobreventa (<30) */
  isExtreme: boolean;
  /** Minutos consecutivos en zona extrema (macro 1H/4H) */
  minutesInExtreme: number;
  /** ¿Bloquea la entrada por saturación prolongada? */
  blocksEntry: boolean;
}

// ─────────────────────────────────────────────────────────────
// Gestión de riesgo
// ─────────────────────────────────────────────────────────────

/**
 * Niveles de Take Profit. Por defecto TP1 respeta ratio 1:3.
 * TP2/TP3 son extensiones opcionales según estructura.
 */
export interface TakeProfitLevel {
  /** Número de TP (1, 2 o 3) */
  level: 1 | 2 | 3;
  /** Precio del take profit */
  price: number;
  /** Porcentaje de la posición a cerrar en este TP (0-100) */
  closePercent: number;
  /** ¿Ya fue alcanzado? */
  hit: boolean;
  /** Timestamp del hit */
  hitAt?: number;
}

/**
 * Gestión de riesgo parametrizable:
 * Riesgo = 1%–2% del balance libre.
 * Riesgo_Efectivo = Balance_Total - Σ Riesgos de Operaciones Abiertas.
 */
export interface RiskManagement {
  /** Balance total de la cuenta (USD) */
  totalBalance: number;
  /** Balance libre (descontando riesgos de operaciones abiertas) */
  freeBalance: number;
  /** Porcentaje de riesgo configurado (1–2) */
  riskPercent: 1 | 1.5 | 2;
  /** Riesgo efectivo en USD para esta operación */
  effectiveRiskUSD: number;
  /** Tamaño de posición calculado (qty del activo) */
  positionSize: number;
  /** Distancia en puntos/pips entre Entry y Stop Loss */
  stopDistance: number;
  /** Ratio Riesgo:Beneficio (por defecto 1:3) */
  riskRewardRatio: number;
}

// ─────────────────────────────────────────────────────────────
// Alerta principal
// ─────────────────────────────────────────────────────────────

/**
 * Alerta SMC completa tal como se muestra en el overlay flotante
 * y se persiste en el histórico (PostgreSQL).
 */
export interface SMCAlert {
  /** Identificador único (UUID) */
  id: string;
  /** Par de futuros de Binance */
  symbol: Symbol;
  /** Dirección de la operación */
  direction: Direction;
  /** Estado actual del ciclo de vida */
  status: AlertStatus;

  // ── Precios ──
  /** Precio de entrada sugerido */
  entryPrice: number;
  /** Stop Loss */
  stopLoss: number;
  /** Take Profits escalonados */
  takeProfits: TakeProfitLevel[];

  // ── Bloques SMC ──
  /** Punto de Interés detectado */
  poi: PointOfInterest;
  /** Confirmación micro (ChoCH) */
  choch: ChangeOfCharacter;
  /** Inducement / barrido de liquidez */
  inducement: LiquiditySweep;

  // ── Confirmación ──
  /** Open Interest que sostiene la dirección */
  openInterest: OpenInterestData;
  /** RSI(14) macro */
  rsi: RSIData;

  // ── Riesgo ──
  risk: RiskManagement;

  // ── Metadata ──
  /** Timestamp de generación (ms epoch) */
  createdAt: number;
  /** Ventana de validez en minutos (auto-expira si no se ejecuta) */
  expiresAt: number;
  /** Mensaje descriptivo para el usuario (overlay) */
  message: string;
  /** Score de confianza del escenario (0–100) */
  confidence: number;
}

/**
 * Resumen ligero para listas en historial
 * (sin anidar todos los objetos del análisis SMC).
 */
export type AlertSummary = Pick<
  SMCAlert,
  | 'id'
  | 'symbol'
  | 'direction'
  | 'status'
  | 'entryPrice'
  | 'stopLoss'
  | 'takeProfits'
  | 'createdAt'
  | 'expiresAt'
  | 'confidence'
>;
