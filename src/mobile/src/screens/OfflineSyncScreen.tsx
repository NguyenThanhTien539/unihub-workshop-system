import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../components/AppButton";
import { ErrorView } from "../components/ErrorView";
import { LoadingView } from "../components/LoadingView";
import { StatusBadge } from "../components/StatusBadge";
import { colors } from "../config/theme";
import {
  getOfflineEventCounts,
  getRecentEvents,
  OfflineEventCounts,
} from "../db/offlineEventDao";
import { useNetworkStore } from "../network/networkStore";
import { syncPendingEvents, SyncSummary } from "../sync/syncService";
import { formatDateTime } from "../utils/date";
import { getFriendlyErrorMessage } from "../utils/errors";

export function OfflineSyncScreen() {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [counts, setCounts] = useState<OfflineEventCounts | null>(null);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getRecentEvents>>>([]);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSyncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [nextCounts, nextEvents] = await Promise.all([
      getOfflineEventCounts(),
      getRecentEvents(30),
    ]);
    setCounts(nextCounts);
    setEvents(nextEvents);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoading(true);
      refresh()
        .catch((loadError) => {
          if (isActive) {
            setError(getFriendlyErrorMessage(loadError));
          }
        })
        .finally(() => {
          if (isActive) {
            setLoading(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [refresh]),
  );

  async function handleManualSync() {
    setSyncing(true);
    setError(null);
    try {
      const nextSummary = await syncPendingEvents({ manual: true });
      setSummary(nextSummary);
      await refresh();
    } catch (syncError) {
      setError(getFriendlyErrorMessage(syncError));
    } finally {
      setSyncing(false);
    }
  }

  if (isLoading) {
    return <LoadingView label="Dang doc hang cho..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.title}>Offline sync</Text>
            <Text style={styles.subtitle}>Hang cho SQLite tren thiet bi.</Text>
          </View>
          <StatusBadge label={isOnline ? "Online" : "Offline"} tone={isOnline ? "success" : "warning"} />
        </View>

        <View style={styles.metrics}>
          <Metric label="Pending" value={counts?.pending ?? 0} />
          <Metric label="Failed" value={counts?.failed ?? 0} />
          <Metric label="Done today" value={counts?.syncedToday ?? 0} />
        </View>

        <AppButton
          title={isOnline ? "Dong bo ngay" : "Dang offline"}
          onPress={handleManualSync}
          disabled={!isOnline}
          loading={isSyncing}
        />

        {summary ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Ket qua dong bo</Text>
            <Text style={styles.summaryText}>
              {summary.accepted} thanh cong - {summary.duplicate} duplicate - {summary.rejected} rejected - {summary.failed} loi
            </Text>
            {summary.message ? <Text style={styles.summaryText}>{summary.message}</Text> : null}
          </View>
        ) : null}

        {error ? <ErrorView message={error} /> : null}

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Gan day</Text>
        </View>

        <View style={styles.list}>
          {events.map((event) => (
            <View key={event.syncEventId} style={styles.eventCard}>
              <View style={styles.eventRow}>
                <Text style={styles.eventTitle}>{event.syncEventId}</Text>
                <StatusBadge label={event.localStatus} tone={toneForStatus(event.localStatus)} />
              </View>
              <Text style={styles.eventMeta}>Session: {event.sessionId}</Text>
              <Text style={styles.eventMeta}>Scanned: {formatDateTime(event.scannedAt)}</Text>
              {event.errorMessage ? <Text style={styles.eventError}>{event.errorMessage}</Text> : null}
            </View>
          ))}
        </View>

        {events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Chua co ban ghi offline.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function toneForStatus(status: string) {
  if (status === "SYNCED") {
    return "success" as const;
  }
  if (status === "PENDING_SYNC" || status === "SYNCING") {
    return "info" as const;
  }
  if (status === "SYNC_FAILED") {
    return "danger" as const;
  }
  return "warning" as const;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    gap: 14,
    padding: 16,
  },
  topbar: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  metrics: {
    flexDirection: "row",
    gap: 10,
  },
  metric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  summary: {
    backgroundColor: colors.infoSoft,
    borderColor: "#b8d4fb",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  summaryTitle: {
    color: colors.info,
    fontSize: 14,
    fontWeight: "800",
  },
  summaryText: {
    color: colors.info,
    fontSize: 13,
    lineHeight: 18,
  },
  listHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  list: {
    gap: 10,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  eventRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  eventTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  eventMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  eventError: {
    color: colors.danger,
    fontSize: 12,
  },
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
});
