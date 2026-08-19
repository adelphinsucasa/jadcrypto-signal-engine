/**
 * Tipos compartidos entre el backend y los DTOs.
 * Reflejan 1:1 los tipos del frontend (mobile/src/types/alert.ts).
 */

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

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h';
export type Direction = 'LONG' | 'SHORT';
export type POIType = 'ORDER_BLOCK' | 'FVG';
export type AlertStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'TP1_HIT'
  | 'TP2_HIT'
  | 'TP3_HIT'
  | 'SL_HIT'
  | 'EXPIRED'
  | 'DISMISSED';

export type LiquidityKind =
  | 'EQUAL_LOWS'
  | 'EQUAL_HIGHS'
  | 'PREVIOUS_LOW'
  | 'PREVIOUS_HIGH';

/** Estructura JSON del POI persistido dentro de la alerta. */
export interface POIData {
  type: POIType;
  high: number;
  low: number;
  midpoint?: number;
  mitigated: boolean;
  timeframe: Timeframe;
}

/** Estructura JSON del Change of Character. */
export interface ChoCHData {
  detected: boolean;
  timeframe: Timeframe;
  timestamp: number;
}

/** Estructura JSON del barrido de liquidez. */
export interface InducementData {
  detected: boolean;
  level: number;
  kind: LiquidityKind;
  timestamp: number;
}

/** Estructura JSON del Open Interest. */
export interface OpenInterestData {
  current: number;
  atBreakout: number;
  deltaPercent: number;
  confirms: boolean;
}

/** Estructura JSON del RSI. */
export interface RSIData {
  value: number;
  isExtreme: boolean;
  minutesInExtreme: number;
  blocksEntry: boolean;
}

/** Estructura JSON de un nivel de Take Profit. */
export interface TakeProfitLevelData {
  level: 1 | 2 | 3;
  price: number;
  closePercent: number;
  hit: boolean;
  hitAt?: number;
}

/** Estructura JSON de gestión de riesgo. */
export interface RiskManagementData {
  totalBalance: number;
  freeBalance: number;
  riskPercent: 1 | 1.5 | 2;
  effectiveRiskUSD: number;
  positionSize: number;
  stopDistance: number;
  riskRewardRatio: number;
}
