import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { OfflineCheckinEvent } from "../services/checkinQueue";

type OfflineSyncScreenProps = {
  events: OfflineCheckinEvent[];
  syncing: boolean;
  onSync: () => void;
};

export function OfflineSyncScreen({ events, syncing, onSync }: OfflineSyncScreenProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View>
          <Text style={styles.title}>Offline Sync</Text>
          <Text style={styles.description}>
            Queue statuses are mapped to backend sync results event by event.
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={onSync} disabled={syncing}>
          <Text style={styles.primaryButtonText}>{syncing ? "Syncing..." : "Sync now"}</Text>
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <Text style={styles.empty}>No offline events stored.</Text>
      ) : (
        events.map((event) => (
          <View key={event.syncEventId} style={styles.eventCard}>
            <View style={styles.eventRow}>
              <Text style={styles.eventId}>{event.syncEventId}</Text>
              <Text style={[styles.statusBadge, badgeStyle(event.localStatus)]}>{event.localStatus}</Text>
            </View>
            <Text style={styles.eventMeta}>Session: {event.sessionId}</Text>
            <Text style={styles.eventMeta}>Scanned at: {event.scannedAt}</Text>
            {event.backendResult ? <Text style={styles.eventMeta}>Backend result: {event.backendResult}</Text> : null}
            {event.backendErrorCode ? <Text style={styles.eventMeta}>Error code: {event.backendErrorCode}</Text> : null}
          </View>
        ))
      )}
    </View>
  );
}

function badgeStyle(status: OfflineCheckinEvent["localStatus"]) {
  switch (status) {
    case "SYNCED":
      return { backgroundColor: "#dcfce7", color: "#166534" };
    case "SYNCING":
      return { backgroundColor: "#e0f2fe", color: "#075985" };
    case "FAILED":
      return { backgroundColor: "#fee2e2", color: "#991b1b" };
    case "CONFLICT":
      return { backgroundColor: "#fef3c7", color: "#92400e" };
    default:
      return { backgroundColor: "#e2e8f0", color: "#334155" };
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: "#1f2933",
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    color: "#5b6770",
    fontSize: 14,
    marginTop: 6,
    maxWidth: 220,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1f2933",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  empty: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 14,
  },
  eventCard: {
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  eventRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eventId: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eventMeta: {
    color: "#475569",
    fontSize: 13,
    marginTop: 6,
  },
});
