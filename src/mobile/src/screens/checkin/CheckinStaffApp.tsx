import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import {
  CheckinHistoryItem,
  CheckinResult,
  OfflineQueueItem,
  Account,
} from "../../models/types";
import {
  getCheckinHistory,
  getOfflineQueue,
  syncOfflineQueue,
  verifyCheckin,
} from "../../services/checkinService";
import { colors, spacing } from "../../theme/theme";
import { Badge, Button, Card, EmptyState, TabBar } from "../../components/ui";

type CheckinTab = "scanner" | "queue" | "history" | "profile";

export function CheckinStaffApp({ account }: { account: Account }) {
  const [tab, setTab] = useState<CheckinTab>("scanner");

  return (
    <View style={styles.stack}>
      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "scanner", label: "Scanner" },
          { key: "queue", label: "Offline Queue" },
          { key: "history", label: "History" },
          { key: "profile", label: "Profile" },
        ]}
      />
      {tab === "scanner" ? <ScannerScreen /> : null}
      {tab === "queue" ? <OfflineQueueScreen /> : null}
      {tab === "history" ? <HistoryScreen /> : null}
      {tab === "profile" ? <StaffProfile account={account} /> : null}
    </View>
  );
}

function ScannerScreen() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      setResult(await verifyCheckin(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.title}>QR Scanner</Text>
            <Text style={styles.body}>Enter a QR token to verify check-in.</Text>
          </View>
        </View>
        <View style={styles.scannerFrame}>
          <Text style={styles.scannerText}>QR scan area</Text>
        </View>
        <TextInput
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder="QR token"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <Button
          label={loading ? "Verifying..." : "Verify"}
          onPress={scan}
          disabled={loading || !token.trim()}
        />
      </Card>
      {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}
      {result ? <CheckinResultCard result={result} /> : null}
    </View>
  );
}

function CheckinResultCard({ result }: { result: CheckinResult }) {
  const tone =
    result.kind === "VALID"
      ? "success"
      : result.kind === "INVALID"
        ? "danger"
        : "warning";

  return (
    <Card>
      <Badge label={result.kind.replace("_", " ")} tone={tone} />
      <Text style={styles.resultTitle}>{result.title}</Text>
      {result.studentName ? (
        <Text style={styles.meta}>
          {result.studentName} - {result.studentId}
        </Text>
      ) : null}
      <Text style={styles.body}>{result.detail}</Text>
    </Card>
  );
}

function OfflineQueueScreen() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      setQueue(await getOfflineQueue());
    } catch (err) {
      setQueue([]);
      setError(err instanceof Error ? err.message : "Unable to load offline queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  const pendingCount = queue.filter((item) => item.status === "PENDING_SYNC").length;

  const sync = async () => {
    setSyncing(true);
    setMessage(null);
    setError(null);
    try {
      const synced = await syncOfflineQueue();
      setQueue(synced);
      setMessage("Offline queue synced.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sync offline queue.");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>Loading offline queue...</Text>
        <Text style={styles.body}>Checking queued check-ins.</Text>
      </Card>
    );
  }

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.title}>Offline Queue</Text>
            <Text style={styles.body}>{pendingCount} pending items</Text>
          </View>
          <Badge label={pendingCount > 0 ? "Pending" : "Synced"} tone={pendingCount > 0 ? "warning" : "success"} />
        </View>
        <Button
          label={syncing ? "Syncing..." : "Sync now"}
          onPress={sync}
          disabled={syncing || queue.length === 0}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {error ? (
          <Button label="Retry" onPress={refreshQueue} variant="secondary" />
        ) : null}
      </Card>
      {queue.length === 0 ? (
        <EmptyState title="No offline check-ins" body="Offline scans will appear here when network is unavailable." />
      ) : (
        queue.map((item) => (
          <Card key={item.id}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{item.studentName}</Text>
                <Text style={styles.meta}>{item.workshopTitle}</Text>
                <Text style={styles.meta}>Scanned at {item.scannedAt}</Text>
              </View>
              <Badge label={item.status.replace("_", " ")} tone={item.status === "SYNCED" ? "success" : "warning"} />
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

function HistoryScreen() {
  const [history, setHistory] = useState<CheckinHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      setHistory(await getCheckinHistory());
    } catch (err) {
      setHistory([]);
      setError(err instanceof Error ? err.message : "Unable to load check-in history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>Loading history...</Text>
        <Text style={styles.body}>Fetching completed check-ins.</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Text style={styles.error}>{error}</Text>
        <Button label="Retry" onPress={refreshHistory} variant="secondary" />
      </Card>
    );
  }

  return (
    <View style={styles.stack}>
      {history.length === 0 ? (
        <EmptyState title="No check-in records available" body="Completed check-ins will appear here." />
      ) : history.map((item) => (
        <Card key={item.id}>
          <Badge label={item.status.replace("_", " ")} tone={item.status === "VALID" ? "success" : "warning"} />
          <Text style={styles.itemTitle}>{item.studentName}</Text>
          <Text style={styles.meta}>{item.studentId}</Text>
          <Text style={styles.meta}>{item.workshopTitle}</Text>
          <Text style={styles.body}>Checked in at {item.checkedInAt}</Text>
        </Card>
      ))}
    </View>
  );
}

function StaffProfile({ account }: { account: Account }) {
  return (
    <Card>
      <Badge label="CHECKIN_STAFF" tone="success" />
      <Text style={styles.resultTitle}>{account.name}</Text>
      <Text style={styles.meta}>{account.email}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  rowBetween: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  flex: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  scannerFrame: {
    alignItems: "center",
    backgroundColor: "#101820",
    borderRadius: 8,
    height: 220,
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  scannerText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
  },
  success: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.md,
  },
});
