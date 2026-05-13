import { useEffect, useRef, useState } from "react";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import { StyleSheet, Text, View } from "react-native";
import {
  CheckinHistoryItem,
  CheckinResult,
  OfflineQueueItem,
  Account,
} from "../../models/types";
import {
  getCheckinHistory,
  getCheckinSessions,
  getOfflineQueue,
  queueOfflineCheckin,
  syncOfflineQueue,
  verifyCheckin,
} from "../../services/checkinService";
import { CheckinSession } from "../../services/checkinApi";
import { colors, spacing } from "../../theme/theme";
import { Badge, Button, Card, EmptyState, TabBar } from "../../components/ui";
import { SelectField } from "../../components/SelectField";

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
  const scanLockedRef = useRef(false);
  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [lastScannedToken, setLastScannedToken] = useState("");
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const refreshSessions = async () => {
    setSessionsLoading(true);
    setError(null);
    try {
      const nextSessions = await getCheckinSessions();
      setSessions(nextSessions);
      setSelectedSessionId((current) => current || nextSessions[0]?.sessionId || "");
    } catch (err) {
      setSessions([]);
      setError(err instanceof Error ? err.message : "Unable to load check-in sessions.");
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  const scan = async (qrToken: string) => {
    if (!selectedSessionId || loading || queueing || !scannerEnabled || scanLockedRef.current) {
      return;
    }

    scanLockedRef.current = true;
    setScannerEnabled(false);
    setLoading(true);
    setLastScannedToken(qrToken);
    setResult(null);
    setError(null);
    setMessage(null);
    try {
      setResult(await verifyCheckin(selectedSessionId, qrToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (!data.trim()) {
      return;
    }
    void scan(data);
  };

  const queueOffline = async () => {
    setQueueing(true);
    setResult(null);
    setError(null);
    setMessage(null);
    try {
      await queueOfflineCheckin(selectedSessionId, lastScannedToken);
      setMessage("Scan queued offline. Open Offline Queue to sync it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to queue offline scan.");
    } finally {
      setQueueing(false);
    }
  };

  const resetScanner = () => {
    setResult(null);
    setError(null);
    setMessage(null);
    setLastScannedToken("");
    scanLockedRef.current = false;
    setScannerEnabled(true);
  };

  const cameraReady = permission?.granted;

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.title}>QR Scanner</Text>
            <Text style={styles.body}>Scan a student check-in QR from their email ticket.</Text>
          </View>
        </View>
        <SelectField
          label="Workshop session"
          value={selectedSessionId}
          options={sessions.map((session) => ({
            label: session.workshopTitle,
            value: session.sessionId,
            description: `${session.roomName}, ${session.building} - ${session.checkinOpen ? "Open" : "Closed"}`,
          }))}
          placeholder="Select a session"
          loading={sessionsLoading}
          loadError={!sessionsLoading && sessions.length === 0 ? error : null}
          emptyText="No check-in sessions available"
          onChange={setSelectedSessionId}
          onRetry={refreshSessions}
        />
        {cameraReady ? (
          <View style={styles.scannerFrame}>
            <CameraView
              facing="back"
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scannerEnabled ? handleBarcodeScanned : undefined}
            />
            <View style={styles.scannerOverlay}>
              <Text style={styles.scannerText}>
                {loading ? "Verifying..." : scannerEnabled ? "Align QR inside frame" : "Scan paused"}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.scannerFrame}>
            <Text style={styles.scannerText}>Camera permission required</Text>
          </View>
        )}
        {!cameraReady ? (
          <Button label="Allow camera" onPress={requestPermission} disabled={loading || queueing} />
        ) : null}
        <Button
          label="Scan another"
          onPress={resetScanner}
          disabled={loading || queueing || scannerEnabled}
          variant="secondary"
        />
        <Button
          label={queueing ? "Queueing..." : "Queue offline"}
          onPress={queueOffline}
          disabled={loading || queueing || !lastScannedToken || !selectedSessionId}
          variant="secondary"
        />
      </Card>
      {message ? <Card><Text style={styles.success}>{message}</Text></Card> : null}
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
    gap: spacing.xl,
  },
  rowBetween: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
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
    marginTop: spacing.md,
  },
  scannerFrame: {
    alignItems: "center",
    backgroundColor: "#101820",
    borderRadius: 8,
    height: 220,
    justifyContent: "center",
    marginTop: spacing.xl,
    overflow: "hidden",
  },
  scannerText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    bottom: 0,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    marginTop: spacing.lg,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
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
    lineHeight: 18,
    marginTop: spacing.lg,
  },
});
