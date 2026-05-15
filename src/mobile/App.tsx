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
        throw new Error("Tài khoản này không có quyền check-in.");
      }

      const me = await getCurrentUser(response.accessToken);
      setAccessToken(response.accessToken);
      setStaffName(me.fullName);
      setScanFeedback({
        tone: "info",
        title: "Đã đăng nhập",
        message: "Các endpoint check-in đã sẵn sàng sử dụng.",
      });
      await loadSessions(response.accessToken);
    } catch (error) {
      setAccessToken(null);
      setStaffName("");
      setLoginError(getFriendlyApiError(error, "Không đăng nhập được."));
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
      setSessionError(getFriendlyApiError(error, "Không tải được danh sách buổi check-in."));
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
              title: "Đã chấp nhận",
              message: `${response.studentName} (${response.studentId}) đã check-in thành công.`,
            }
          : {
              tone: "warning",
              title: "Trùng lượt",
              message: `Người tham dự này đã check-in lúc ${response.previousCheckedInAt ?? "một thời điểm trước đó"}.`,
            },
      );
    } catch (error) {
      setLastResult(null);
      setScanFeedback({
        tone: "error",
        title: "Bị từ chối",
        message: getFriendlyApiError(error, "Không xác thực được mã QR này."),
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
      title: "Đã lưu offline",
      message: "Lượt quét đã được lưu cục bộ với trạng thái PENDING_SYNC.",
    });
  }

  async function handleSyncQueue() {
    if (!accessToken) return;

    const pendingEvents = await getPendingOfflineEvents();
    if (pendingEvents.length === 0) {
      setScanFeedback({
        tone: "info",
        title: "Hàng đợi đã trống",
        message: "Không có sự kiện offline nào đang chờ đồng bộ.",
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
        title: "Đồng bộ hoàn tất",
        message: `Đã xử lý ${response.results.length} sự kiện offline.`,
      });
    } catch (error) {
      for (const event of pendingEvents) {
        await updateOfflineEvent(event.syncEventId, { localStatus: "FAILED" });
      }
      await refreshQueue();
      setScanFeedback({
        tone: "error",
        title: "Đồng bộ thất bại",
        message: getFriendlyApiError(error, "Hiện không đồng bộ được sự kiện offline."),
      });
    } finally {
      setSyncingQueue(false);
    }
  }

  return (
    <>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>UniHub Workshop</Text>
          <Text style={styles.title}>Check-in Mobile</Text>
          <Text style={styles.subtitle}>
            Tích hợp backend thật cho buổi học, xác thực QR và đồng bộ offline.
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
