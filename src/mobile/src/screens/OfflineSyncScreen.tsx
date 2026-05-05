import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { OfflineQueueItem } from "../models/types";
import { getOfflineQueue, syncOfflineQueue } from "../services/mockApi";
import { colors, spacing } from "../theme/theme";
import { Badge, Button, Card } from "../components/ui";

export function OfflineSyncScreen() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getOfflineQueue().then(setQueue);
  }, []);

  const pendingCount = queue.filter((item) => item.status === "PENDING_SYNC")
    .length;

  const sync = async () => {
    setSyncing(true);
    setQueue(await syncOfflineQueue(queue));
    setSyncing(false);
  };

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Offline queue</Text>
            <Text style={styles.body}>
              {pendingCount} pending check-ins waiting for backend validation.
            </Text>
          </View>
          <Badge
            label={pendingCount > 0 ? "Pending" : "Synced"}
            tone={pendingCount > 0 ? "warning" : "success"}
          />
        </View>
        <Text style={styles.todo}>
          TODO: Persist queued scans in SQLite. Sync with POST
          /api/checkins/offline-sync. Keep failed events pending and mark
          duplicate/rejected events for staff review.
        </Text>
        <Button
          label={syncing ? "Syncing..." : "Sync when online"}
          onPress={sync}
          disabled={syncing || queue.length === 0}
        />
      </Card>
      {queue.length === 0 ? (
        <Card>
          <Text style={styles.body}>No offline scans on this device.</Text>
        </Card>
      ) : (
        queue.map((item) => <QueueCard key={item.id} item={item} />)
      )}
    </View>
  );
}

function QueueCard({ item }: { item: OfflineQueueItem }) {
  return (
    <Card>
      <View style={styles.headerRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.itemTitle}>{item.studentName}</Text>
          <Text style={styles.meta}>{item.workshopTitle}</Text>
          <Text style={styles.meta}>Scanned at {item.scannedAt}</Text>
        </View>
        <Badge
          label={item.status.replace("_", " ")}
          tone={item.status === "SYNCED" ? "success" : "warning"}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  todo: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
    marginVertical: spacing.md,
  },
  itemCopy: {
    flex: 1,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
});
