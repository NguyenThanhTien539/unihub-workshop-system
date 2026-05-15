import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { CheckinSession, CheckinValidateResponse } from "../services/checkinApi";

type Feedback = {
  tone: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
};

type QrScannerPlaceholderScreenProps = {
  selectedSession: CheckinSession | null;
  qrToken: string;
  scanSubmitting: boolean;
  feedback: Feedback | null;
  lastResult: CheckinValidateResponse | null;
  onQrTokenChange: (value: string) => void;
  onValidate: () => void;
  onQueueOffline: () => void;
  onReset: () => void;
};

export function QrScannerPlaceholderScreen({
  selectedSession,
  qrToken,
  scanSubmitting,
  feedback,
  lastResult,
  onQrTokenChange,
  onValidate,
  onQueueOffline,
  onReset,
}: QrScannerPlaceholderScreenProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Xác thực QR thủ công</Text>
      <Text style={styles.description}>
        Dùng phương án này khi chưa cài quét camera. Dán mã QR và gửi đến `/api/checkin/validate`.
      </Text>

      <View style={styles.sessionBox}>
        <Text style={styles.sessionLabel}>Buổi học đã chọn</Text>
        <Text style={styles.sessionValue}>
          {selectedSession
            ? `${selectedSession.workshopTitle} · ${selectedSession.roomName}`
            : "Hãy chọn buổi học ở phía trên trước."}
        </Text>
      </View>

      <TextInput
        multiline
        numberOfLines={5}
        value={qrToken}
        onChangeText={onQrTokenChange}
        style={styles.input}
        placeholder="Dán mã QR vào đây"
        placeholderTextColor="#94a3b8"
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, !selectedSession || !qrToken.trim() ? styles.disabledButton : null]}
          onPress={onValidate}
          disabled={!selectedSession || !qrToken.trim() || scanSubmitting}
        >
          <Text style={styles.primaryButtonText}>{scanSubmitting ? "Đang xác thực..." : "Xác thực online"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, !selectedSession || !qrToken.trim() ? styles.disabledButton : null]}
          onPress={onQueueOffline}
          disabled={!selectedSession || !qrToken.trim()}
        >
          <Text style={styles.secondaryButtonText}>Lưu offline</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onReset}>
          <Text style={styles.secondaryButtonText}>Quét tiếp</Text>
        </TouchableOpacity>
      </View>

      {feedback ? (
        <View style={[styles.feedbackCard, feedback.tone === "success" ? styles.feedbackSuccess : feedback.tone === "warning" ? styles.feedbackWarning : feedback.tone === "error" ? styles.feedbackError : styles.feedbackInfo]}>
          <Text style={styles.feedbackTitle}>{feedback.title}</Text>
          <Text style={styles.feedbackMessage}>{feedback.message}</Text>
          {lastResult ? (
            <Text style={styles.feedbackMeta}>
              {lastResult.studentName} · {lastResult.studentId}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    color: "#1f2933",
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    color: "#5b6770",
    fontSize: 14,
    marginTop: 8,
  },
  sessionBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    marginTop: 12,
    padding: 12,
  },
  sessionLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sessionValue: {
    color: "#0f172a",
    fontSize: 14,
    marginTop: 6,
  },
  input: {
    borderColor: "#d7dde4",
    borderRadius: 16,
    borderWidth: 1,
    color: "#1f2933",
    marginTop: 12,
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  actions: {
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1f2933",
    borderRadius: 999,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#d7dde4",
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  feedbackCard: {
    borderRadius: 18,
    marginTop: 14,
    padding: 14,
  },
  feedbackSuccess: {
    backgroundColor: "#dcfce7",
  },
  feedbackWarning: {
    backgroundColor: "#fef3c7",
  },
  feedbackError: {
    backgroundColor: "#fee2e2",
  },
  feedbackInfo: {
    backgroundColor: "#e0f2fe",
  },
  feedbackTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackMessage: {
    color: "#334155",
    fontSize: 14,
    marginTop: 6,
  },
  feedbackMeta: {
    color: "#475569",
    fontSize: 13,
    marginTop: 8,
  },
});
