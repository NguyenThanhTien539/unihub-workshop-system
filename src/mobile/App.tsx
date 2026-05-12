import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { CheckinSessionsScreen } from "./src/screens/CheckinSessionsScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OfflineSyncScreen } from "./src/screens/OfflineSyncScreen";
import { QrScannerPlaceholderScreen } from "./src/screens/QrScannerPlaceholderScreen";
import { enqueueOfflineEvent, getPendingOfflineEvents, listQueuedEvents, updateOfflineEvent, type OfflineCheckinEvent } from "./src/services/checkinQueue";
import {
  getCurrentUser,
  listCheckinSessions,
  loginCheckin,
  syncCheckins,
  validateCheckin,
  type CheckinSession,
  type CheckinSyncItemResponse,
  type CheckinValidateResponse,
} from "./src/services/checkinApi";
import { getFriendlyApiError } from "./src/services/apiClient";

type ScanFeedback = {
  tone: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
};

export default function App() {
  const [email, setEmail] = useState("checkin@university.edu.vn");
  const [password, setPassword] = useState("Password123!");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [lastResult, setLastResult] = useState<CheckinValidateResponse | null>(null);
  const [queue, setQueue] = useState<OfflineCheckinEvent[]>([]);
  const [syncingQueue, setSyncingQueue] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  useEffect(() => {
    void refreshQueue();
  }, []);

  async function refreshQueue() {
    setQueue(await listQueuedEvents());
  }

  async function handleLogin() {
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await loginCheckin(email, password);
      const roles = response.user.roles.map((role) => role.toLowerCase());
      if (!roles.includes("checkin_staff")) {
        throw new Error("This account does not have check-in access.");
      }

      const me = await getCurrentUser(response.accessToken);
      setAccessToken(response.accessToken);
      setStaffName(me.fullName);
      setScanFeedback({
        tone: "info",
        title: "Signed in",
        message: "Check-in endpoints are now ready to use.",
      });
      await loadSessions(response.accessToken);
    } catch (error) {
      setAccessToken(null);
      setStaffName("");
      setLoginError(getFriendlyApiError(error, "Unable to sign in."));
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadSessions(token = accessToken) {
    if (!token) return;

    setSessionsLoading(true);
    setSessionError(null);

    try {
      const response = await listCheckinSessions(token);
      setSessions(response);
      setSelectedSessionId((current) => current || response[0]?.sessionId || "");
    } catch (error) {
      setSessionError(getFriendlyApiError(error, "Unable to load check-in sessions."));
    } finally {
      setSessionsLoading(false);
    }
  }

  async function handleValidateOnline() {
    if (!accessToken || !selectedSessionId || !qrToken.trim()) return;

    setScanSubmitting(true);
    setScanFeedback(null);

    try {
      const response = await validateCheckin(accessToken, {
        sessionId: selectedSessionId,
        qrToken: qrToken.trim(),
        scannedAt: new Date().toISOString().slice(0, 19),
      });
      setLastResult(response);
      setScanFeedback(
        response.result === "ACCEPTED"
          ? {
              tone: "success",
              title: "Accepted",
              message: `${response.studentName} (${response.studentId}) checked in successfully.`,
            }
          : {
              tone: "warning",
              title: "Duplicate",
              message: `This attendee was already checked in at ${response.previousCheckedInAt ?? "an earlier time"}.`,
            },
      );
    } catch (error) {
      setLastResult(null);
      setScanFeedback({
        tone: "error",
        title: "Rejected",
        message: getFriendlyApiError(error, "Unable to validate this QR token."),
      });
    } finally {
      setScanSubmitting(false);
    }
  }

  async function handleQueueOffline() {
    if (!selectedSessionId || !qrToken.trim()) return;

    const event: OfflineCheckinEvent = {
      syncEventId: createSyncEventId(),
      sessionId: selectedSessionId,
      qrToken: qrToken.trim(),
      scannedAt: new Date().toISOString().slice(0, 19),
      deviceId: "mobile-preview",
      createdAt: new Date().toISOString(),
      localStatus: "PENDING_SYNC",
    };

    await enqueueOfflineEvent(event);
    await refreshQueue();
    setScanFeedback({
      tone: "info",
      title: "Queued offline",
      message: "The scan was saved locally with status PENDING_SYNC.",
    });
  }

  async function handleSyncQueue() {
    if (!accessToken) return;

    const pendingEvents = await getPendingOfflineEvents();
    if (pendingEvents.length === 0) {
      setScanFeedback({
        tone: "info",
        title: "Queue is clean",
        message: "There are no pending offline events to sync.",
      });
      return;
    }

    setSyncingQueue(true);

    for (const event of pendingEvents) {
      await updateOfflineEvent(event.syncEventId, { localStatus: "SYNCING" });
    }
    await refreshQueue();

    try {
      const response = await syncCheckins(
        accessToken,
        pendingEvents.map(({ localStatus, createdAt, backendErrorCode, backendResult, ...event }) => event),
      );

      for (const item of response.results) {
        await updateOfflineEvent(item.syncEventId, mapSyncResult(item));
      }

      await refreshQueue();
      setScanFeedback({
        tone: "success",
        title: "Sync complete",
        message: `Processed ${response.results.length} offline event(s).`,
      });
    } catch (error) {
      for (const event of pendingEvents) {
        await updateOfflineEvent(event.syncEventId, { localStatus: "FAILED" });
      }
      await refreshQueue();
      setScanFeedback({
        tone: "error",
        title: "Sync failed",
        message: getFriendlyApiError(error, "Unable to sync offline events right now."),
      });
    } finally {
      setSyncingQueue(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>UniHub Workshop</Text>
          <Text style={styles.title}>Check-in Mobile</Text>
          <Text style={styles.subtitle}>
            Live backend integration for sessions, QR validation, and offline sync staging.
          </Text>
        </View>

        <View style={styles.stack}>
          <LoginScreen
            email={email}
            password={password}
            loading={loginLoading}
            error={loginError}
            isSignedIn={Boolean(accessToken)}
            staffName={staffName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleLogin}
            onLogout={() => {
              setAccessToken(null);
              setStaffName("");
              setSessions([]);
              setSelectedSessionId("");
              setScanFeedback(null);
              setLastResult(null);
            }}
          />

          <CheckinSessionsScreen
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            loading={sessionsLoading}
            error={sessionError}
            onSelectSession={setSelectedSessionId}
            onRefresh={() => void loadSessions()}
          />

          <QrScannerPlaceholderScreen
            selectedSession={selectedSession}
            qrToken={qrToken}
            scanSubmitting={scanSubmitting}
            feedback={scanFeedback}
            lastResult={lastResult}
            onQrTokenChange={setQrToken}
            onValidate={() => void handleValidateOnline()}
            onQueueOffline={() => void handleQueueOffline()}
            onReset={() => {
              setQrToken("");
              setLastResult(null);
              setScanFeedback(null);
            }}
          />

          <OfflineSyncScreen
            events={queue}
            syncing={syncingQueue}
            onSync={() => void handleSyncQueue()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createSyncEventId() {
  return `sync-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function mapSyncResult(item: CheckinSyncItemResponse): Partial<OfflineCheckinEvent> {
  if (item.result === "ACCEPTED") {
    return {
      localStatus: "SYNCED",
      backendResult: item.result,
      backendErrorCode: item.errorCode,
    };
  }

  if (item.result === "DUPLICATE" || item.result === "ALREADY_SYNCED") {
    return {
      localStatus: "CONFLICT",
      backendResult: item.result,
      backendErrorCode: item.errorCode,
    };
  }

  return {
    localStatus: "FAILED",
    backendResult: item.result,
    backendErrorCode: item.errorCode,
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f1e6",
  },
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  kicker: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: "#1f2933",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 6,
  },
  subtitle: {
    color: "#5b6770",
    fontSize: 14,
    marginTop: 8,
  },
  stack: {
    gap: 12,
  },
});
