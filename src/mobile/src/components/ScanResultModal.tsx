import { Modal, StyleSheet, Text, View } from "react-native";
import { CheckinResult } from "../api/types";
import { colors, spacing } from "../config/theme";
import { AppButton } from "./AppButton";
import { StatusBadge } from "./StatusBadge";

type ScanResultModalProps = {
  visible: boolean;
  result: {
    result: CheckinResult;
    studentName?: string;
    studentCode?: string;
    registrationId?: string;
    message?: string;
    syncEventId?: string;
  } | null;
  onScanNext: () => void;
  onClose: () => void;
};

const resultLabel: Record<CheckinResult, string> = {
  ACCEPTED: "Check-in thanh cong",
  DUPLICATE: "Da check-in",
  REJECTED: "Bi tu choi",
  ALREADY_SYNCED: "Da dong bo",
  PENDING_SYNC: "Cho dong bo",
};

const resultTone: Record<CheckinResult, "success" | "warning" | "danger" | "info"> = {
  ACCEPTED: "success",
  DUPLICATE: "warning",
  REJECTED: "danger",
  ALREADY_SYNCED: "info",
  PENDING_SYNC: "info",
};

export function ScanResultModal({ visible, result, onScanNext, onClose }: ScanResultModalProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {result ? (
            <>
              <StatusBadge label={resultLabel[result.result]} tone={resultTone[result.result]} />
              <Text style={styles.title}>{resultLabel[result.result]}</Text>
              {result.studentName ? <Text style={styles.name}>{result.studentName}</Text> : null}
              {result.studentCode ? <Text style={styles.meta}>MSSV: {result.studentCode}</Text> : null}
              {result.registrationId ? <Text style={styles.meta}>Registration: {result.registrationId}</Text> : null}
              {result.syncEventId ? <Text style={styles.meta}>Sync event: {result.syncEventId}</Text> : null}
              {result.message ? <Text style={styles.message}>{result.message}</Text> : null}
              <View style={styles.actions}>
                <AppButton title="Quet tiep" onPress={onScanNext} style={styles.action} />
                <AppButton title="Danh sach" onPress={onClose} variant="secondary" style={styles.action} />
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.46)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  message: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
  },
});
