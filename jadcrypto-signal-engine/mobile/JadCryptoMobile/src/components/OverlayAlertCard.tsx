/**
 * OverlayAlertCard
 * ─────────────────────────────────────────────────────────────
 * Tarjeta flotante persistente para alertas SMC.
 * Se dibuja sobre otras apps mediante SYSTEM_ALERT_WINDOW (Android)
 * y reproduce audio en loop + vibración hasta que el usuario la silencia.
 *
 * Tema oscuro estilo Binance (#121824) con acentos LONG verde / SHORT rojo.
 * Tipos estrictos basados en src/types/alert.ts.
 */
import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Vibration,
  AccessibilityInfo,
  Platform,
} from 'react-native';

import type {
  SMCAlert,
  Direction,
  AlertStatus,
  POIType,
  Timeframe,
} from '../types/alert';

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

export interface OverlayAlertCardProps {
  /** Alerta SMC completa a renderizar */
  alert: SMCAlert;
  /** Callback al pulsar el botón "Silenciar alarma" */
  onSilence: (alertId: string) => void;
  /** Callback opcional al pulsar la tarjeta (abrir detalle / histórico) */
  onPress?: (alertId: string) => void;
  /**
   * Callback opcional invocado cuando se monta/desmonta la tarjeta.
   * Útil para que el contenedor del overlay inicie/detenga el loop de audio.
   */
  onAudioLoopChange?: (alertId: string, shouldPlay: boolean) => void;
  /** Ancho máximo de la tarjeta (útil para distintos tamaños de overlay) */
  maxWidth?: number;
  /** Test ID para testing */
  testID?: string;
}

// ─────────────────────────────────────────────────────────────
// Paleta Binance dark
// ─────────────────────────────────────────────────────────────

const palette = {
  bgBase: '#121824',     // fondo principal estilo Binance dark
  bgElevated: '#1E2536', // tarjetas / secciones
  bgInput: '#0B0F1A',    // inputs / métricas
  border: '#2A3142',     // separadores
  textPrimary: '#EAECEF',
  textSecondary: '#B7BDC6',
  textMuted: '#848E9C',
  long: '#02C076',       // verde LONG
  longDim: 'rgba(2, 192, 118, 0.12)',
  short: '#F6465D',      // rojo SHORT
  shortDim: 'rgba(246, 70, 93, 0.12)',
  warning: '#F0B90B',    // amarillo Binance
  danger: '#F6465D',
} as const;

const DIRECTION_COLORS: Record<Direction, { fg: string; bg: string }> = {
  LONG: { fg: palette.long, bg: palette.longDim },
  SHORT: { fg: palette.short, bg: palette.shortDim },
};

const POI_LABELS: Record<POIType, string> = {
  ORDER_BLOCK: 'OB',
  FVG: 'FVG',
};

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1H',
  '4h': '4H',
};

// ─────────────────────────────────────────────────────────────
// Helpers de formato
// ─────────────────────────────────────────────────────────────

/** Formatea un precio respetando decimales típicos por activo */
const formatPrice = (price: number): string => {
  if (!Number.isFinite(price)) return '—';
  const abs = Math.abs(price);
  if (abs >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (abs >= 1) return price.toFixed(3);
  return price.toFixed(5);
};

/** Formatea USD con separador de miles y 2 decimales */
const formatUSD = (value: number): string =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/** Formatea un ratio R:R (e.g. 3 → "1:3") */
const formatRR = (ratio: number): string => {
  if (!Number.isFinite(ratio) || ratio <= 0) return '1:?';
  const whole = Math.round(ratio);
  return `1:${whole}`;
};

/** Formatea porcentaje con signo */
const formatPercent = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// ─────────────────────────────────────────────────────────────
// Subcomponentes locales
// ─────────────────────────────────────────────────────────────

interface MetricRowProps {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  testID?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, tone = 'default', testID }) => {
  const colorMap: Record<NonNullable<MetricRowProps['tone']>, string> = {
    default: palette.textPrimary,
    positive: palette.long,
    negative: palette.short,
    warning: palette.warning,
  };
  return (
    <View style={styles.metricRow} testID={testID}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: colorMap[tone] }]}>{value}</Text>
    </View>
  );
};

interface PillProps {
  label: string;
  bg: string;
  fg: string;
  testID?: string;
}

const Pill: React.FC<PillProps> = ({ label, bg, fg, testID }) => (
  <View style={[styles.pill, { backgroundColor: bg }]} testID={testID}>
    <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
  </View>
);

interface SectionTitleProps {
  children: React.ReactNode;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ children }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────

export const OverlayAlertCard: React.FC<OverlayAlertCardProps> = ({
  alert,
  onSilence,
  onPress,
  onAudioLoopChange,
  maxWidth = 360,
  testID,
}) => {
  const directionStyle = DIRECTION_COLORS[alert.direction];

  // ── Cálculos derivados de gestión de riesgo ──
  const stopDistance = useMemo(() => {
    const fromRisk = alert.risk.stopDistance;
    return Number.isFinite(fromRisk) && fromRisk > 0 ? fromRisk : Math.abs(alert.entryPrice - alert.stopLoss);
  }, [alert.entryPrice, alert.stopLoss, alert.risk.stopDistance]);

  const projectedProfitUSD = useMemo(
    () => alert.risk.effectiveRiskUSD * alert.risk.riskRewardRatio,
    [alert.risk.effectiveRiskUSD, alert.risk.riskRewardRatio],
  );

  const isBlocked = alert.rsi.blocksEntry;
  const isOIConfirming = alert.openInterest.confirms;

  // ── Handlers ──
  const handleSilence = useCallback(() => {
    // Feedback háptico al silenciar (regla: vibración hasta descarte)
    Vibration.cancel();
    onAudioLoopChange?.(alert.id, false);
    onSilence(alert.id);
  }, [alert.id, onSilence, onAudioLoopChange]);

  const handlePress = useCallback(() => {
    AccessibilityInfo.announceForAccessibility(
      `Alerta ${alert.symbol} ${alert.direction}, entrada ${formatPrice(alert.entryPrice)}`,
    );
    onPress?.(alert.id);
  }, [alert.id, alert.symbol, alert.direction, alert.entryPrice, onPress]);

  // ── Indicadores de estado (overlay) ──
  const statusLabel: Record<AlertStatus, string> = {
    PENDING: 'PENDIENTE',
    ACTIVE: 'ACTIVA',
    TP1_HIT: 'TP1 ✓',
    TP2_HIT: 'TP2 ✓',
    TP3_HIT: 'TP3 ✓',
    SL_HIT: 'SL ✗',
    EXPIRED: 'EXPIRADA',
    DISMISSED: 'DESCARTADA',
  };

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ color: palette.bgElevated }}
      accessibilityRole="alert"
      accessibilityLabel={`Alerta ${alert.symbol} ${alert.direction}. Nivel de confianza ${alert.confidence}%.`}
      testID={testID ?? `overlay-alert-${alert.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          maxWidth,
          borderColor: directionStyle.fg,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.symbol}>{alert.symbol}</Text>
          <View
            style={[styles.directionBadge, { backgroundColor: directionStyle.bg }]}
            testID={`direction-badge-${alert.id}`}
          >
            <Text style={[styles.directionText, { color: directionStyle.fg }]}>
              {alert.direction}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pill
            label={statusLabel[alert.status]}
            bg={palette.bgInput}
            fg={palette.textSecondary}
            testID={`status-pill-${alert.id}`}
          />
        </View>
      </View>

      {/* ── BLOQUE SMC ── */}
      <View style={styles.section}>
        <SectionTitle>Estructura SMC</SectionTitle>

        <View style={styles.smcRow}>
          {/* POI */}
          <View style={styles.smcItem}>
            <Text style={styles.metricLabel}>POI</Text>
            <View style={styles.smcPillRow}>
              <Pill
                label={POI_LABELS[alert.poi.type]}
                bg={palette.bgInput}
                fg={palette.warning}
                testID={`poi-type-${alert.id}`}
              />
              <Text style={styles.timeframeText}>
                {TIMEFRAME_LABELS[alert.poi.timeframe]}
              </Text>
            </View>
            <Text style={styles.metricValue}>
              {formatPrice(alert.poi.low)} – {formatPrice(alert.poi.high)}
            </Text>
            {alert.poi.type === 'FVG' && alert.poi.midpoint !== undefined && (
              <Text style={styles.helperText}>
                50% → {formatPrice(alert.poi.midpoint)}
              </Text>
            )}
            {alert.poi.mitigated && (
              <Text style={[styles.helperText, { color: palette.warning }]}>
                Mitigado
              </Text>
            )}
          </View>

          {/* ChoCH */}
          <View style={styles.smcItem}>
            <Text style={styles.metricLabel}>ChoCH</Text>
            <Pill
              label={alert.choch.detected ? 'CONFIRMADO' : 'PENDIENTE'}
              bg={alert.choch.detected ? palette.longDim : palette.bgInput}
              fg={alert.choch.detected ? palette.long : palette.textMuted}
              testID={`choch-pill-${alert.id}`}
            />
            {alert.choch.detected && (
              <Text style={styles.helperText}>
                TF {TIMEFRAME_LABELS[alert.choch.timeframe]}
              </Text>
            )}
          </View>

          {/* Inducement */}
          <View style={styles.smcItem}>
            <Text style={styles.metricLabel}>Inducement</Text>
            <Pill
              label={alert.inducement.detected ? 'SWEPT' : '—'}
              bg={alert.inducement.detected ? palette.longDim : palette.bgInput}
              fg={alert.inducement.detected ? palette.long : palette.textMuted}
            />
            {alert.inducement.detected && (
              <Text style={styles.helperText} numberOfLines={1}>
                {alert.inducement.kind.replace('_', ' ')}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── PRECIOS ── */}
      <View style={styles.section}>
        <SectionTitle>Operación</SectionTitle>
        <View style={styles.priceGrid}>
          <MetricRow label="Entrada" value={formatPrice(alert.entryPrice)} />
          <MetricRow
            label="Stop Loss"
            value={formatPrice(alert.stopLoss)}
            tone="negative"
            testID={`sl-row-${alert.id}`}
          />
        </View>
        {alert.takeProfits.map((tp) => (
          <MetricRow
            key={tp.level}
            label={`TP${tp.level} (cierra ${tp.closePercent}%)`}
            value={formatPrice(tp.price)}
            tone={tp.hit ? 'positive' : 'default'}
            testID={`tp-row-${tp.level}-${alert.id}`}
          />
        ))}
        <Text style={styles.helperText}>
          Distancia SL: {formatPrice(stopDistance)} pts
        </Text>
      </View>

      {/* ── CONFIRMACIÓN (OI + RSI) ── */}
      <View style={styles.section}>
        <SectionTitle>Confirmación</SectionTitle>
        <MetricRow
          label="Open Interest"
          value={formatPercent(alert.openInterest.deltaPercent)}
          tone={isOIConfirming ? 'positive' : 'negative'}
          testID={`oi-row-${alert.id}`}
        />
        <Text style={styles.helperText}>
          OI actual: {(alert.openInterest.current / 1_000_000).toFixed(2)}M
          {isOIConfirming ? ' · sostiene dirección' : ' · NO confirma'}
        </Text>

        <View style={styles.spacer} />

        <MetricRow
          label={`RSI (14) · ${alert.rsi.value.toFixed(1)}`}
          value={
            alert.rsi.isExtreme
              ? alert.rsi.value > 70
                ? 'SOBRECOMPRA'
                : 'SOBREVENTA'
              : 'NEUTRAL'
          }
          tone={
            isBlocked ? 'negative' : alert.rsi.isExtreme ? 'warning' : 'default'
          }
          testID={`rsi-row-${alert.id}`}
        />
        <Text style={styles.helperText}>
          {alert.rsi.minutesInExtreme > 0
            ? `${alert.rsi.minutesInExtreme} min en zona extrema`
            : 'Sin saturación prolongada'}
          {isBlocked ? ' · entrada bloqueada' : ''}
        </Text>
      </View>

      {/* ── GESTIÓN DE RIESGO ── */}
      <View style={styles.section}>
        <SectionTitle>Gestión de Riesgo</SectionTitle>
        <MetricRow label="Balance total" value={formatUSD(alert.risk.totalBalance)} />
        <MetricRow
          label="Balance libre"
          value={formatUSD(alert.risk.freeBalance)}
          testID={`free-balance-row-${alert.id}`}
        />
        <MetricRow
          label="Riesgo configurado"
          value={`${alert.risk.riskPercent}%`}
          tone="warning"
          testID={`risk-percent-row-${alert.id}`}
        />
        <View style={styles.divider} />
        <MetricRow
          label="Riesgo efectivo"
          value={formatUSD(alert.risk.effectiveRiskUSD)}
          tone="negative"
          testID={`effective-risk-row-${alert.id}`}
        />
        <MetricRow
          label="Beneficio proyectado (TP1)"
          value={formatUSD(projectedProfitUSD)}
          tone="positive"
        />
        <MetricRow
          label="Ratio R:B"
          value={formatRR(alert.risk.riskRewardRatio)}
          testID={`rr-row-${alert.id}`}
        />
        <MetricRow
          label="Tamaño posición"
          value={`${alert.risk.positionSize} ${alert.symbol.replace('USDT', '')}`}
        />
        <Text style={styles.helperText}>
          Riesgo dentro del rango permitido (1% – 2%)
        </Text>
      </View>

      {/* ── CONFIANZA + ACCIÓN ── */}
      <View style={styles.footer}>
        <View style={styles.confidenceBlock}>
          <Text style={styles.metricLabel}>Confianza</Text>
          <Text
            style={[
              styles.confidenceValue,
              {
                color:
                  alert.confidence >= 80
                    ? palette.long
                    : alert.confidence >= 60
                      ? palette.warning
                      : palette.short,
              },
            ]}
          >
            {alert.confidence}%
          </Text>
        </View>

        <Pressable
          onPress={handleSilence}
          android_ripple={{ color: palette.shortDim }}
          accessibilityRole="button"
          accessibilityLabel="Silenciar alarma"
          testID={`silence-btn-${alert.id}`}
          style={({ pressed }) => [
            styles.silenceButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.silenceButtonText}>Silenciar alarma</Text>
        </Pressable>
      </View>

      {/* Mensaje descriptivo inferior */}
      <Text style={styles.message} numberOfLines={3}>
        {alert.message}
      </Text>
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.bgBase,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    margin: 8,
    // Sombras suaves para el overlay flotante
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      default: {},
    }),
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  symbol: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  directionText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Sections
  section: {
    backgroundColor: palette.bgElevated,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  sectionTitle: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Métricas
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  metricLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  spacer: {
    height: 6,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 6,
  },

  // Pills
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // SMC row
  smcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  smcItem: {
    flex: 1,
  },
  smcPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeframeText: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  // Prices
  priceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  confidenceBlock: {
    flex: 1,
  },
  confidenceValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },

  // Silence button
  silenceButton: {
    backgroundColor: palette.short,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  silenceButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  message: {
    color: palette.textMuted,
    fontSize: 11,
    marginTop: 10,
    lineHeight: 15,
    fontStyle: 'italic',
  },
});

export default OverlayAlertCard;
