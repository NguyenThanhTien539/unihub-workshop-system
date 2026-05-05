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
} from "../../services/mockCheckinService";
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
  const [token, setToken] = useState("valid-demo-ticket");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = async (nextToken = token) => {
    setLoading(true);
    setResult(await verifyCheckin(nextToken));
    setLoading(false);
  };

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.title}>QR Scanner</Text>
            <Text style={styles.body}>AI Tools for Career Readiness - A101</Text>
          </View>
          <Badge label="Online" tone="success" />
        </View>
        <View style={styles.scannerFrame}>
          <Text style={styles.scannerText}>QR scan area</Text>
        </View>
        <TextInput
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          placeholder="valid-demo-ticket"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <Button
          label={loading ? "Verifying..." : "Mock scan"}
          onPress={() => scan()}
          disabled={loading}
        />
      </Card>
      <View style={styles.quickGrid}>
        <Button label="Valid" onPress={() => scan("valid-demo-ticket")} />
        <Button label="Used" onPress={() => scan("used-demo-ticket")} variant="secondary" />
        <Button label="Invalid" onPress={() => scan("invalid-demo-ticket")} variant="secondary" />
        <Button label="Offline" onPress={() => scan("offline-demo-ticket")} variant="secondary" />
      </View>
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
      <Text style={styles.todo}>
        TODO: Replace mock scan verification with POST /api/checkins/verify.
        Body: {"{ qrToken, staffId, deviceId, checkedInAt }"}. Expected:
        VALID, ALREADY_USED, or INVALID ticket result.
      </Text>
    </Card>
  );
}

function OfflineQueueScreen() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getOfflineQueue().then(setQueue);
  }, []);

  const pendingCount = queue.filter((item) => item.status === "PENDING_SYNC").length;

  const sync = async () => {
    setSyncing(true);
    setMessage(null);
    const synced = await syncOfflineQueue(queue);
    setQueue(synced);
    setMessage(`Synced ${synced.length} offline check-ins.`);
    setSyncing(false);
  };

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
        <Text style={styles.todo}>
          TODO: Replace mock offline sync with POST /api/checkins/offline-sync.
          Body: {"{ deviceId, staffId, checkins: [...] }"}. Expected:
          syncedCount and failedItems. Offline check-ins should later be
          persisted using AsyncStorage, SQLite, SecureStore, or Room depending
          on the stack.
        </Text>
        <Button
          label={syncing ? "Syncing..." : "Sync now"}
          onPress={sync}
          disabled={syncing || queue.length === 0}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
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

  useEffect(() => {
    getCheckinHistory().then(setHistory);
  }, []);

  return (
    <View style={styles.stack}>
      {history.map((item) => (
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
      <Text style={styles.todo}>
        UI role guards only improve user experience. Real access control must
        be enforced by backend middleware/security filters using JWT role
        claims.
      </Text>
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
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
  todo: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  success: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.md,
  },
});
