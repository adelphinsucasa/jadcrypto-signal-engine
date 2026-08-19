/**
 * HistoryScreen
 * ─────────────────────────────────────────────────────────────
 * Vista de historial de alertas SMC. Sincronizada con PostgreSQL
 * (Paso 2 / 3 del itinerario) y alimentada por mockAlerts en desarrollo.
 *
 * Orden cronológico inverso: la alerta más reciente aparece arriba.
 * Cumple la regla del modelfile: muestra el estado del motor y el
 * intervalo de escaneo configurado por el usuario.
 */
import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  StatusBar,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OverlayAlertCard } from '../components';
import { MOCK_ALERTS } from '../mocks/mockAlerts';
import type { SMCAlert } from '../types/alert';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface EngineStatus {
  /** Switch global del motor de escaneo (regla Engine Switch del modelfile) */
  enabled: boolean;
  /** Intervalo configurable en minutos (default: 3) */
  scanIntervalMinutes: number;
  /** Fuente del estado (mock / api) — útil para debugging */
  source?: 'mock' | 'api';
}

export interface HistoryScreenProps {
  /** Lista de alertas; por defecto usa MOCK_ALERTS para desarrollo */
  alerts?: ReadonlyArray<SMCAlert>;
  /** Estado actual del motor */
  engineStatus?: EngineStatus;
  /** Pull-to-refresh: re-fetch desde la API REST del backend */
  onRefresh?: () => Promise<void> | void;
  /** Callback al silenciar una alerta (delegado a OverlayAlertCard) */
  onSilenceAlert?: (alertId: string) => void;
  /** Callback al pulsar una alerta (abrir detalle) */
  onPressAlert?: (alertId: string) => void;
  /** Test ID raíz */
  testID?: string;
}

const DEFAULT_ENGINE_STATUS: EngineStatus = {
  enabled: true,
  scanIntervalMinutes: 3,
  source: 'mock',
};

// ─────────────────────────────────────────────────────────────
// Paleta (fondo #0B0E11 — base oscura Binance)
// ─────────────────────────────────────────────────────────────

const palette = {
  bgBase: '#0B0E11',
  bgElevated: '#121824',
  border: '#1E2536',
  textPrimary: '#EAECEF',
  textSecondary: '#B7BDC6',
  textMuted: '#848E9C',
  accent: '#F0B90B', // amarillo marca Binance
  long: '#02C076',
  short: '#F6465D',
} as const;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Formatea un timestamp en algo legible para listas (es-ES) */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return 'hace segundos';
  if (diffMin < 60) return `hace ${diffMin} min`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─────────────────────────────────────────────────────────────
// Subcomponentes locales
// ─────────────────────────────────────────────────────────────

interface HeaderBrandProps {
  testID?: string;
}

const HeaderBrand: React.FC<HeaderBrandProps> = ({ testID }) => (
  <View style={styles.brandRow} testID={testID}>
    <View style={styles.brandLogo}>
      <Text style={styles.brandLogoText}>JC</Text>
    </View>
    <View style={styles.brandTextBlock}>
      <Text style={styles.brandTitle}>JadCrypto</Text>
      <Text style={styles.brandSubtitle}>Signal Engine · Histórico SMC</Text>
    </View>
  </View>
);

interface EngineStatusBannerProps {
  status: EngineStatus;
  testID?: string;
}

const EngineStatusBanner: React.FC<EngineStatusBannerProps> = ({ status, testID }) => {
  const stateColor = status.enabled ? palette.long : palette.short;
  const stateLabel = status.enabled ? 'ACTIVO' : 'DETENIDO';

  return (
    <View
      style={[styles.engineBanner, { borderColor: stateColor }]}
      testID={testID ?? 'engine-status-banner'}
      accessibilityRole="summary"
      accessibilityLabel={`Motor ${stateLabel}, escaneo cada ${status.scanIntervalMinutes} minutos`}
    >
      <View style={styles.engineDotGroup}>
        <View style={[styles.engineDot, { backgroundColor: stateColor }]} />
        <Text style={styles.engineBannerLabel}>
          Motor: <Text style={{ color: stateColor, fontWeight: '800' }}>{stateLabel}</Text>
        </Text>
      </View>
      <Text style={styles.engineBannerDivider}>|</Text>
      <Text style={styles.engineBannerLabel}>
        Escaneo: cada {status.scanIntervalMinutes} min
      </Text>
      {status.source === 'mock' && (
        <View style={styles.sourcePill}>
          <Text style={styles.sourcePillText}>MOCK</Text>
        </View>
      )}
    </View>
  );
};

interface ListEmptyProps {
  onRefresh?: () => void;
}

const ListEmpty: React.FC<ListEmptyProps> = ({ onRefresh }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyTitle}>Sin alertas en el histórico</Text>
    <Text style={styles.emptySubtitle}>
      Cuando el motor emita señales SMC aparecerán aquí ordenadas de más reciente a más antigua.
    </Text>
    {onRefresh && (
      <Pressable onPress={onRefresh} style={styles.emptyButton} accessibilityRole="button">
        <Text style={styles.emptyButtonText}>Reintentar</Text>
      </Pressable>
    )}
  </View>
);

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  alerts,
  engineStatus = DEFAULT_ENGINE_STATUS,
  onRefresh,
  onSilenceAlert,
  onPressAlert,
  testID,
}) => {
  const insets = useSafeAreaInsets();

  /**
   * Orden cronológico inverso: createdAt descendente.
   * useMemo evita re-ordenamientos en cada re-render del componente padre.
   */
  const sortedAlerts = useMemo(() => {
    const source = alerts ?? MOCK_ALERTS;
    return [...source].sort((a, b) => b.createdAt - a.createdAt);
  }, [alerts]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SMCAlert>) => (
      <View style={styles.row}>
        <Text style={styles.rowTimestamp}>{formatTimestamp(item.createdAt)}</Text>
        <OverlayAlertCard
          alert={item}
          onSilence={onSilenceAlert ?? (() => {})}
          onPress={onPressAlert}
        />
      </View>
    ),
    [onSilenceAlert, onPressAlert],
  );

  const keyExtractor = useCallback((alert: SMCAlert) => alert.id, []);

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top }]}
      testID={testID ?? 'history-screen'}
    >
      <StatusBar barStyle="light-content" backgroundColor={palette.bgBase} />

      <FlatList<SMCAlert>
        data={sortedAlerts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <HeaderBrand testID="history-header-brand" />
            <EngineStatusBanner status={engineStatus} />
            <View style={styles.sectionDivider} />
            <Text style={styles.historyTitle}>Histórico de alertas</Text>
            <Text style={styles.historyMeta}>
              {sortedAlerts.length === 0
                ? 'Sin alertas registradas'
                : `${sortedAlerts.length} alerta${sortedAlerts.length === 1 ? '' : 's'} · más reciente arriba`}
            </Text>
          </View>
        }
        ListEmptyComponent={<ListEmpty onRefresh={onRefresh} />}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={false}
              onRefresh={onRefresh}
              tintColor={palette.accent}
              colors={[palette.accent]}
              progressBackgroundColor={palette.bgElevated}
            />
          ) : undefined
        }
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={8}
        windowSize={11}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bgBase,
  },
  listContent: {
    paddingHorizontal: 12,
  },

  // Header
  headerContainer: {
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: palette.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoText: {
    color: palette.bgBase,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandTextBlock: {
    flex: 1,
  },
  brandTitle: {
    color: palette.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandSubtitle: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  // Engine status banner
  engineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  engineDotGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  engineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  engineBannerLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  engineBannerDivider: {
    color: palette.textMuted,
    fontSize: 14,
    paddingHorizontal: 2,
  },
  sourcePill: {
    backgroundColor: palette.bgBase,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  sourcePillText: {
    color: palette.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Section divider + title
  sectionDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginTop: 10,
    marginBottom: 12,
  },
  historyTitle: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  historyMeta: {
    color: palette.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  // Rows
  row: {
    marginVertical: 4,
  },
  rowTimestamp: {
    color: palette.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  itemSeparator: {
    height: 4,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: palette.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: palette.bgBase,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});

export default HistoryScreen;
