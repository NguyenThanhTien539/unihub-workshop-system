import { useEffect, useRef, useState } from "react";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import NetInfo from "@react-native-community/netinfo";
import { ActivityIndicator, AppState, Modal, StyleSheet, Text, View } from "react-native";
import {
  CheckinHistoryItem,
  CheckinResult,
  OfflineQueueItem,
  Account,
} from "../../models/types";
import {
  clearOldOfflineQueueItems,
  getCheckinHistory,
  getCheckinSessions,
  getOfflineQueue,
  getRejectedOfflineQueue,
  queueOfflineCheckin,
  syncOfflineQueue,
  verifyCheckin,
  type OfflineSyncSummary,
} from "../../services/checkinService";
import { ApiError } from "../../services/apiClient";
import { CheckinSession } from "../../services/checkinApi";
import { colors, spacing } from "../../theme/theme";
import {
  getActionErrorMessage,
  useNotification,
} from "../../components/NotificationModal";
import { Badge, Button, Card, EmptyState, TabBar } from "../../components/ui";
import { SelectField } from "../../components/SelectField";

type CheckinTab = "scanner" | "queue" | "history" | "profile";
type SyncStatus = "online" | "offline" | "syncing" | "synced" | "failed";

export function CheckinStaffApp({ account }: { account: Account }) {
  const [tab, setTab] = useState<CheckinTab>("scanner");
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("online");
  const [syncMessage, setSyncMessage] = useState("Online");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const autoSyncingRef = useRef(false);
  const wasOnlineRef = useRef<boolean | null>(null);
  const { showError, showSuccess, showWarning } = useNotification();

  const finishSync = async (
    summary: OfflineSyncSummary,
    source: string,
    showModal: boolean,
  ) => {
    const rejectedDetail = summary.rejectedReasons.length
      ? ` ${summary.rejectedReasons.join(" ")}`
      : "";
    const message = `${summary.message}${rejectedDetail}`;
    setSyncStatus(summary.retryableFailed > 0 ? "failed" : "synced");
    setSyncMessage(message);
    setRefreshVersion((current) => current + 1);
    console.debug("[AutoSync] completed", { source, summary });

    if (!showModal || summary.processed === 0) {
      return;
    }
    if (summary.rejected > 0 || summary.duplicate > 0 || summary.retryableFailed > 0) {
      await showWarning(message, "Sync partially completed");
    } else {
      await showSuccess("Offline check-ins were synced successfully.", "Sync completed");
    }
  };

  const triggerSync = async (
    source: string,
    showModal = false,
    onlineOverride?: boolean,
  ) => {
    if (autoSyncingRef.current) {
      console.debug("[AutoSync] skipped because already syncing", { source });
      return;
    }
    const canSync = onlineOverride ?? isOnline;
    if (!canSync) {
      console.debug("[AutoSync] skipped because offline", { source });
      return;
    }

    autoSyncingRef.current = true;
    setSyncStatus("syncing");
    setSyncMessage("Syncing offline check-ins...");
    console.debug("[AutoSync] triggered", { source });
    try {
      const summary = await syncOfflineQueue();
      await finishSync(summary, source, showModal);
    } catch (error) {
      const message = getActionErrorMessage(error, "Unable to sync offline queue.");
      setSyncStatus("failed");
      setSyncMessage(message);
      setRefreshVersion((current) => current + 1);
      console.debug("[AutoSync] failed", {
        source,
        status: error instanceof ApiError ? error.status : undefined,
        message,
      });
      if (showModal) {
        await showError(message, "Sync failed");
      }
    } finally {
      autoSyncingRef.current = false;
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      const isOnline = Boolean(
        state.isConnected && (reachable === null || reachable),
      );
      console.debug("[Network] status changed", isOnline ? "online" : "offline");
      setIsOnline(isOnline);
      setSyncStatus((current) => {
        if (!isOnline) {
          return "offline";
        }
        return current === "offline" ? "online" : current;
      });
      setSyncMessage(isOnline ? "Online" : "Offline");
      const wasOnline = wasOnlineRef.current;
      wasOnlineRef.current = isOnline;

      if (wasOnline === false && isOnline) {
        void triggerSync("reconnect", false, true);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    void NetInfo.fetch().then((state) => {
      const reachable = state.isInternetReachable;
      const online = Boolean(state.isConnected && (reachable === null || reachable));
      setIsOnline(online);
      setSyncStatus(online ? "online" : "offline");
      setSyncMessage(online ? "Online" : "Offline");
      if (online) {
        void triggerSync("app-start", false, true);
      }
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void NetInfo.fetch().then((networkState) => {
          const reachable = networkState.isInternetReachable;
          const online = Boolean(networkState.isConnected && (reachable === null || reachable));
          setIsOnline(online);
          if (online) {
            void triggerSync("foreground", false, true);
          }
        });
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.stack}>
      <NetworkSyncBanner status={syncStatus} message={syncMessage} />
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
      {tab === "scanner" ? <ScannerScreen isOnline={isOnline} /> : null}
      {tab === "queue" ? (
        <OfflineQueueScreen
          syncing={syncStatus === "syncing"}
          refreshVersion={refreshVersion}
          onSync={() => triggerSync("manual", true)}
        />
      ) : null}
      {tab === "history" ? <HistoryScreen /> : null}
      {tab === "profile" ? <StaffProfile account={account} /> : null}
    </View>
  );
}

function NetworkSyncBanner({
  status,
  message,
}: {
  status: SyncStatus;
  message: string;
}) {
  const tone =
    status === "offline" || status === "failed"
      ? "danger"
      : status === "syncing"
        ? "warning"
        : "success";

  return (
    <Card>
      <View style={styles.bannerRow}>
        <View style={styles.flex}>
          <Text style={styles.actionType}>
            {status === "offline"
              ? "Offline"
              : status === "syncing"
                ? "Syncing"
                : status === "failed"
                  ? "Sync failed"
                  : status === "synced"
                    ? "Sync completed"
                    : "Online"}
          </Text>
          <Text style={styles.body}>{message}</Text>
        </View>
        {status === "syncing" ? <ActivityIndicator color={colors.warning} /> : null}
        <Badge label={status.replace("_", " ")} tone={tone} />
      </View>
    </Card>
  );
}

function ScannerScreen({ isOnline }: { isOnline: boolean }) {
  const scanLockedRef = useRef(false);
  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [lastScannedToken, setLastScannedToken] = useState("");
  const [lastScannedAt, setLastScannedAt] = useState("");
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { showError, showSuccess, showWarning } = useNotification();

  const refreshSessions = async () => {
    setSessionsLoading(true);
    setError(null);
    try {
      const nextSessions = await getCheckinSessions();
      setSessions(nextSessions);
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
    if (loading || queueing || !scannerEnabled || scanLockedRef.current) {
      return;
    }

    scanLockedRef.current = true;
    const scannedAt = toBackendTimestamp(new Date());
    setScannerEnabled(false);
    setLoading(true);
    setLastScannedToken(qrToken);
    setLastScannedAt(scannedAt);
    setResult(null);
    setError(null);
    console.debug("[QR Scan] raw value", {
      type: typeof qrToken,
      preview: getRawPreview(qrToken),
    });
    try {
      if (!isOnline) {
        await queueOfflineCheckin(selectedSessionId, qrToken, scannedAt);
        await showWarning(
          "Offline mode: scanned QR codes will be saved and synced automatically when connection returns.",
          "Offline scan saved",
        );
        return;
      }
      const nextResult = await verifyCheckin(selectedSessionId, qrToken, scannedAt);
      setResult(nextResult);
      if (nextResult.kind === "VALID") {
        await showSuccess(nextResult.detail, nextResult.title);
      } else {
        await showWarning(nextResult.detail, nextResult.title);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        try {
          await queueOfflineCheckin(selectedSessionId, qrToken, scannedAt);
          await showWarning(
            "Network was unavailable. The scan was saved and will sync automatically when connection returns.",
            "Offline scan saved",
          );
          return;
        } catch (queueError) {
          await showError(getActionErrorMessage(queueError, "Unable to queue offline scan."));
          return;
        }
      }
      await showError(getActionErrorMessage(err, "Check-in failed."));
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
    try {
      await queueOfflineCheckin(selectedSessionId, lastScannedToken, lastScannedAt);
      await showSuccess("Scan queued offline. Open Offline Queue to sync it.");
    } catch (err) {
      await showError(getActionErrorMessage(err, "Unable to queue offline scan."));
    } finally {
      setQueueing(false);
    }
  };

  const resetScanner = () => {
    setResult(null);
    setError(null);
    setLastScannedToken("");
    setLastScannedAt("");
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
        {!isOnline ? (
          <View style={styles.offlineNotice}>
            <Text style={styles.warningText}>
              Offline mode: scanned QR codes will be saved and synced automatically when connection returns.
            </Text>
          </View>
        ) : null}
        <SelectField
          label="Workshop session (optional)"
          value={selectedSessionId}
          options={sessions.map((session) => ({
            label: session.workshopTitle,
            value: session.sessionId,
            description: `${session.roomName}, ${session.building} - ${session.checkinOpen ? "Open" : "Closed"}`,
          }))}
          placeholder="Scan without selecting a session"
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
          disabled={loading || queueing || !lastScannedToken}
          variant="secondary"
        />
      </Card>
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

function OfflineQueueScreen({
  syncing,
  refreshVersion,
  onSync,
}: {
  syncing: boolean;
  refreshVersion: number;
  onSync: () => Promise<void>;
}) {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [rejectedQueue, setRejectedQueue] = useState<OfflineQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showError, showSuccess, showWarning } = useNotification();

  const refreshQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const [activeItems, rejectedItems] = await Promise.all([
        getOfflineQueue(),
        getRejectedOfflineQueue(),
      ]);
      setQueue(activeItems);
      setRejectedQueue(rejectedItems);
    } catch (err) {
      setQueue([]);
      setRejectedQueue([]);
      setError(err instanceof Error ? err.message : "Unable to load offline queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshQueue();
  }, [refreshVersion]);

  const pendingCount = queue.filter((item) => item.status === "PENDING_SYNC").length;
  const retryCount = queue.filter((item) => item.status === "SYNC_FAILED").length;
  const rejectedCount = rejectedQueue.length;
  const clearableCount = retryCount + rejectedQueue.length;

  const sync = async () => {
    setError(null);
    try {
      await onSync();
      await refreshQueue();
    } catch (err) {
      setQueue(await getOfflineQueue());
      await showError(getActionErrorMessage(err, "Unable to sync offline queue."));
    }
  };

  const clearQueue = async () => {
    setClearConfirmVisible(false);
    setError(null);
    try {
      const result = await clearOldOfflineQueueItems();
      setQueue(result.queue);
      setRejectedQueue(result.rejectedQueue);
      await showSuccess("Offline queue cleared.");
    } catch (err) {
      await showError(getActionErrorMessage(err, "Unable to clear offline queue."));
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
            <Text style={styles.body}>
              {pendingCount} pending, {retryCount} retryable failed, {rejectedCount} rejected
            </Text>
          </View>
          <Badge label={queue.length > 0 ? "Pending" : "Synced"} tone={queue.length > 0 ? "warning" : "success"} />
        </View>
        <Button
          label={syncing ? "Syncing..." : "Sync now"}
          onPress={sync}
          disabled={syncing || queue.length === 0}
        />
        {queue.length + rejectedQueue.length > 0 ? (
          <Button
            label="Clear Failed/Rejected"
            onPress={() => {
              if (clearableCount === 0) {
                void showWarning(
                  "Only pending unsynced check-ins are in the queue. Sync them before clearing old items.",
                  "Nothing to Clear",
                );
                return;
              }
              setClearConfirmVisible(true);
            }}
            variant="secondary"
            disabled={syncing}
          />
        ) : null}
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
                <Text style={styles.actionType}>QR check-in</Text>
                <Text style={styles.itemTitle}>{item.studentName}</Text>
                <Text style={styles.meta}>{item.workshopTitle}</Text>
                <Text style={styles.meta}>Scanned at {item.scannedAt}</Text>
                {item.reason ? <Text style={styles.error}>{item.reason}</Text> : null}
              </View>
              <Badge label={item.status.replace("_", " ")} tone={item.status === "SYNC_FAILED" ? "danger" : "warning"} />
            </View>
            {item.status === "SYNC_FAILED" ? (
              <View style={styles.actions}>
                <Button label="Retry Sync" onPress={sync} variant="secondary" disabled={syncing} />
              </View>
            ) : null}
          </Card>
        ))
      )}
      {rejectedQueue.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Rejected check-ins</Text>
          <Text style={styles.body}>
            These were removed from the retry queue because the backend rejected them permanently.
          </Text>
        </Card>
      ) : null}
      {rejectedQueue.map((item) => (
        <Card key={item.id}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.actionType}>QR check-in</Text>
              <Text style={styles.itemTitle}>{item.studentName}</Text>
              <Text style={styles.meta}>{item.workshopTitle}</Text>
              <Text style={styles.meta}>Scanned at {item.scannedAt}</Text>
              {item.reason ? <Text style={styles.error}>{item.reason}</Text> : null}
            </View>
            <Badge label="REJECTED" tone="danger" />
          </View>
        </Card>
      ))}
      <ConfirmClearQueueModal
        visible={clearConfirmVisible}
        onCancel={() => setClearConfirmVisible(false)}
        onConfirm={clearQueue}
      />
    </View>
  );
}

function ConfirmClearQueueModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Card>
            <Text style={styles.title}>Clear offline queue?</Text>
            <Text style={styles.body}>
              This will remove old offline queue items from this device. This action cannot be undone.
            </Text>
            <Text style={styles.warningText}>
              Pending unsynced check-ins are kept. Rejected and retry-failed local items are removed.
            </Text>
            <View style={styles.actions}>
              <Button label="Cancel" onPress={onCancel} variant="secondary" />
              <Button label="Clear" onPress={onConfirm} variant="danger" />
            </View>
          </Card>
        </View>
      </View>
    </Modal>
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
  bannerRow: {
    alignItems: "center",
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
  offlineNotice: {
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    marginTop: spacing.lg,
  },
  actionType: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
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
  warningText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    alignSelf: "center",
    maxWidth: 520,
    width: "100%",
  },
});

function toBackendTimestamp(date: Date) {
  return date.toISOString().slice(0, 19);
}

function getRawPreview(raw: string) {
  const value = raw.trim();
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
