/**
 * Datos mock para desarrollo y prototipado del Overlay/UI (Paso 1).
 * Cubren los estados y símbolos Top 10 definidos en src/types/alert.ts.
 */
import type { SMCAlert } from '../types/alert';

const now = Date.now();
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;

/**
 * Helper para no repetir la construcción de los Take Profits.
 * Por defecto respeta el ratio 1:3 en TP1; TP2/TP3 son extensiones 1:5 / 1:8.
 */
const buildTPs = (entry: number, sl: number, direction: 'LONG' | 'SHORT'): SMCAlert['takeProfits'] => {
  const stopDistance = Math.abs(entry - sl);
  const sign = direction === 'LONG' ? 1 : -1;
  return [
    { level: 1, price: entry + sign * stopDistance * 3, closePercent: 50, hit: false },
    { level: 2, price: entry + sign * stopDistance * 5, closePercent: 30, hit: false },
    { level: 3, price: entry + sign * stopDistance * 8, closePercent: 20, hit: false },
  ];
};

export const MOCK_ALERTS: SMCAlert[] = [
  // ── 1. BTCUSDT LONG — Order Block + ChoCH 5m + OI incremental ──
  {
    id: 'alrt-001-btc-long-ob',
    symbol: 'BTCUSDT',
    direction: 'LONG',
    status: 'ACTIVE',
    entryPrice: 67_450.5,
    stopLoss: 67_180.0,
    takeProfits: buildTPs(67_450.5, 67_180.0, 'LONG'),
    poi: {
      type: 'ORDER_BLOCK',
      high: 67_300.0,
      low: 67_120.0,
      mitigated: false,
      timeframe: '1h',
    },
    choch: {
      detected: true,
      timeframe: '5m',
      timestamp: now - 4 * ONE_MINUTE,
    },
    inducement: {
      detected: true,
      level: 67_050.0,
      kind: 'EQUAL_LOWS',
      timestamp: now - 35 * ONE_MINUTE,
    },
    openInterest: {
      current: 128_540_000,
      atBreakout: 127_900_000,
      deltaPercent: 0.5,
      confirms: true,
    },
    rsi: {
      value: 58.3,
      isExtreme: false,
      minutesInExtreme: 0,
      blocksEntry: false,
    },
    risk: {
      totalBalance: 10_000,
      freeBalance: 9_700,
      riskPercent: 1,
      effectiveRiskUSD: 97,
      positionSize: 0.036,
      stopDistance: 270.5,
      riskRewardRatio: 3,
    },
    createdAt: now - 3 * ONE_MINUTE,
    expiresAt: now + 12 * ONE_MINUTE,
    message: 'BTC LONG · OB 1H mitigado + ChoCH 5m · OI +0.5% sostiene ruptura',
    confidence: 87,
  },

  // ── 2. ETHUSDT SHORT — FVG 50% + liquidez en máximos iguales ──
  {
    id: 'alrt-002-eth-short-fvg',
    symbol: 'ETHUSDT',
    direction: 'SHORT',
    status: 'PENDING',
    entryPrice: 3_482.2,
    stopLoss: 3_512.0,
    takeProfits: buildTPs(3_482.2, 3_512.0, 'SHORT'),
    poi: {
      type: 'FVG',
      high: 3_540.0,
      low: 3_490.0,
      midpoint: 3_515.0,
      mitigated: false,
      timeframe: '4h',
    },
    choch: {
      detected: true,
      timeframe: '1m',
      timestamp: now - 1 * ONE_MINUTE,
    },
    inducement: {
      detected: true,
      level: 3_555.0,
      kind: 'EQUAL_HIGHS',
      timestamp: now - 2 * ONE_HOUR,
    },
    openInterest: {
      current: 64_120_000,
      atBreakout: 63_400_000,
      deltaPercent: 1.13,
      confirms: true,
    },
    rsi: {
      value: 72.8,
      isExtreme: true,
      minutesInExtreme: 18,
      blocksEntry: false, // < 30 min en macro 4H, todavía válido
    },
    risk: {
      totalBalance: 10_000,
      freeBalance: 9_600,
      riskPercent: 1.5,
      effectiveRiskUSD: 144,
      positionSize: 0.483,
      stopDistance: 29.8,
      riskRewardRatio: 3,
    },
    createdAt: now - 30 * 1000,
    expiresAt: now + 15 * ONE_MINUTE,
    message: 'ETH SHORT · FVG 4H en 50% + sweep EQUAL_HIGHS · RSI 72.8 (18min)',
    confidence: 81,
  },

  // ── 3. SOLUSDT LONG — escenario descartado por RSI macro prolongado ──
  {
    id: 'alrt-003-sol-long-blocked',
    symbol: 'SOLUSDT',
    direction: 'LONG',
    status: 'EXPIRED',
    entryPrice: 168.4,
    stopLoss: 165.1,
    takeProfits: buildTPs(168.4, 165.1, 'LONG'),
    poi: {
      type: 'ORDER_BLOCK',
      high: 166.2,
      low: 164.8,
      mitigated: false,
      timeframe: '1h',
    },
    choch: {
      detected: true,
      timeframe: '5m',
      timestamp: now - 55 * ONE_MINUTE,
    },
    inducement: {
      detected: false,
      level: 0,
      kind: 'PREVIOUS_LOW',
      timestamp: 0,
    },
    openInterest: {
      current: 21_300_000,
      atBreakout: 21_050_000,
      deltaPercent: 1.19,
      confirms: true,
    },
    rsi: {
      value: 74.5,
      isExtreme: true,
      minutesInExtreme: 142, // > 90 min en 4H ⇒ descartado por regla SMC
      blocksEntry: true,
    },
    risk: {
      totalBalance: 10_000,
      freeBalance: 9_400,
      riskPercent: 2,
      effectiveRiskUSD: 188,
      positionSize: 5.7,
      stopDistance: 3.3,
      riskRewardRatio: 3,
    },
    createdAt: now - 90 * ONE_MINUTE,
    expiresAt: now - 30 * ONE_MINUTE,
    message: 'SOL LONG · DESCARTADO por RSI sobrecomprado >90min en 4H',
    confidence: 0,
  },

  // ── 4. BNBUSDT LONG — TP1 alcanzado ──
  {
    id: 'alrt-004-bnb-long-tp1',
    symbol: 'BNBUSDT',
    direction: 'LONG',
    status: 'TP1_HIT',
    entryPrice: 612.8,
    stopLoss: 604.5,
    takeProfits: (() => {
      const tps = buildTPs(612.8, 604.5, 'LONG');
      tps[0].hit = true;
      tps[0].hitAt = now - 22 * ONE_MINUTE;
      return tps;
    })(),
    poi: {
      type: 'FVG',
      high: 610.2,
      low: 605.0,
      midpoint: 607.6,
      mitigated: true, // mitigado durante la entrada, ya consumido
      timeframe: '15m',
    },
    choch: {
      detected: true,
      timeframe: '1m',
      timestamp: now - 70 * ONE_MINUTE,
    },
    inducement: {
      detected: true,
      level: 601.2,
      kind: 'PREVIOUS_LOW',
      timestamp: now - 3 * ONE_HOUR,
    },
    openInterest: {
      current: 18_900_000,
      atBreakout: 18_420_000,
      deltaPercent: 2.6,
      confirms: true,
    },
    rsi: {
      value: 61.0,
      isExtreme: false,
      minutesInExtreme: 0,
      blocksEntry: false,
    },
    risk: {
      totalBalance: 10_000,
      freeBalance: 9_850,
      riskPercent: 1,
      effectiveRiskUSD: 98.5,
      positionSize: 1.19,
      stopDistance: 8.3,
      riskRewardRatio: 3,
    },
    createdAt: now - 2 * ONE_HOUR,
    expiresAt: now - 90 * ONE_MINUTE,
    message: 'BNB LONG · TP1 alcanzado · corriendo TP2 (1:5)',
    confidence: 92,
  },

  // ── 5. XRPUSDT SHORT — operación descartada por el usuario ──
  {
    id: 'alrt-005-xrp-short-dismissed',
    symbol: 'XRPUSDT',
    direction: 'SHORT',
    status: 'DISMISSED',
    entryPrice: 0.6234,
    stopLoss: 0.6310,
    takeProfits: buildTPs(0.6234, 0.6310, 'SHORT'),
    poi: {
      type: 'ORDER_BLOCK',
      high: 0.6295,
      low: 0.6275,
      mitigated: false,
      timeframe: '1h',
    },
    choch: {
      detected: false,
      timeframe: '5m',
      timestamp: 0,
    },
    inducement: {
      detected: true,
      level: 0.6340,
      kind: 'EQUAL_HIGHS',
      timestamp: now - 6 * ONE_HOUR,
    },
    openInterest: {
      current: 9_840_000,
      atBreakout: 9_910_000,
      deltaPercent: -0.71,
      confirms: false, // OI no sostiene la dirección ⇒ alerta débil
    },
    rsi: {
      value: 66.4,
      isExtreme: false,
      minutesInExtreme: 0,
      blocksEntry: false,
    },
    risk: {
      totalBalance: 10_000,
      freeBalance: 9_200,
      riskPercent: 1.5,
      effectiveRiskUSD: 138,
      positionSize: 1815.79,
      stopDistance: 0.0076,
      riskRewardRatio: 3,
    },
    createdAt: now - 5 * ONE_HOUR,
    expiresAt: now - 4 * ONE_HOUR,
    message: 'XRP SHORT · descartada por el usuario (OI no confirma)',
    confidence: 54,
  },

  // ── 6. DOGEUSDT LONG — alerta vigente en overlay ──
  {
    id: 'alrt-006-doge-long-active',
    symbol: 'DOGEUSDT',
    direction: 'LONG',
    status: 'ACTIVE',
    entryPrice: 0.1482,
    stopLoss: 0.1455,
    takeProfits: buildTPs(0.1482, 0.1455, 'LONG'),
    poi: {
      type: 'FVG',
      high: 0.1472,
      low: 0.1458,
      midpoint: 0.1465,
      mitigated: false,
      timeframe: '15m',
    },
    choch: {
      detected: true,
      timeframe: '5m',
      timestamp: now - 2 * ONE_MINUTE,
    },
    inducement: {
      detected: true,
      level: 0.1440,
      kind: 'EQUAL_LOWS',
      timestamp: now - 45 * ONE_MINUTE,
    },
    openInterest: {
      current: 7_420_000,
      atBreakout: 7_280_000,
      deltaPercent: 1.92,
      confirms: true,
    },
    rsi: {
      value: 55.7,
      isExtreme: false,
      minutesInExtreme: 0,
      blocksEntry: false,
    },
    risk: {
      totalBalance: 10_000,
      freeBalance: 9_500,
      riskPercent: 2,
      effectiveRiskUSD: 190,
      positionSize: 7037.04,
      stopDistance: 0.0027,
      riskRewardRatio: 3,
    },
    createdAt: now - 1 * ONE_MINUTE,
    expiresAt: now + 14 * ONE_MINUTE,
    message: 'DOGE LONG · FVG 15m + sweep EQUAL_LOWS · OI +1.92%',
    confidence: 84,
  },

  // ── 7. LINKUSDT SHORT — golpea Stop Loss ──
  {
    id: 'alrt-007-link-short-sl',
    symbol: 'LINKUSDT',
    direction: 'SHORT',
    status: 'SL_HIT',
    entryPrice: 18.42,
    stopLoss: 18.78,
    takeProfits: buildTPs(18.42, 18.78, 'SHORT'),
    poi: {
      type: 'ORDER_BLOCK',
      high: 18.70,
      low: 18.55,
      mitigated: true,
      timeframe: '4h',
    },
    choch: {
      detected: true,
      timeframe: '5m',
      timestamp: now - 4 * ONE_HOUR,
    },
    inducement: {
      detected: true,
      level: 18.92,
      kind: 'PREVIOUS_HIGH',
      timestamp: now - 8 * ONE_HOUR,
    },
    openInterest: {
      current: 4_120_000,
      atBreakout: 4_080_000,
      deltaPercent: 0.98,
      confirms: true,
    },
    rsi: {
      value: 47.2,
      isExtreme: false,
      minutesInExtreme: 0,
      blocksEntry: false,
    },
    risk: {
      totalBalance: 10_000,
      freeBalance: 9_810,
      riskPercent: 1,
      effectiveRiskUSD: 98.1,
      positionSize: 27.23,
      stopDistance: 0.36,
      riskRewardRatio: 3,
    },
    createdAt: now - 6 * ONE_HOUR,
    expiresAt: now - 5 * ONE_HOUR,
    message: 'LINK SHORT · SL alcanzado (-1R) — patrón válido, mercado en contra',
    confidence: 71,
  },

  // ── 8. ADAUSDT LONG — alerta reciente con ratio extendido ──
  {
    id: 'alrt-008-ada-long-active',
    symbol: 'ADAUSDT',
    direction: 'LONG',
    status: 'ACTIVE',
    entryPrice: 0.4521,
    stopLoss: 0.4468,
    takeProfits: buildTPs(0.4521, 0.4468, 'LONG'),
    poi: {
      type: 'ORDER_BLOCK',
      high: 0.4490,
      low: 0.4472,
      mitigated: false,
      timeframe: '1h',
    },
    choch: {
      detected: true,
      timeframe: '1m',
      timestamp: now - 90 * 1000,
    },
    inducement: {
      detected: true,
      level: 0.4435,
      kind: 'EQUAL_LOWS',
      timestamp: now - 25 * ONE_MINUTE,
    },
    openInterest: {
      current: 3_910_000,
      atBreakout: 3_840_000,
      deltaPercent: 1.82,
      confirms: true,
    },
    rsi: {
      value: 52.4,
      isExtreme: false,
      minutesInExtreme: 0,
      blocksEntry: false,
    },
    risk: {
      totalBalance: 10_000,
      freeBalance: 9_650,
      riskPercent: 1,
      effectiveRiskUSD: 96.5,
      positionSize: 182.08,
      stopDistance: 0.0053,
      riskRewardRatio: 3,
    },
    createdAt: now - 45 * 1000,
    expiresAt: now + 15 * ONE_MINUTE,
    message: 'ADA LONG · OB 1H + ChoCH 1m + EQUAL_LOWS barridos',
    confidence: 88,
  },
];
