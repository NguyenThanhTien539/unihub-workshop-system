import { StyleSheet, Text, View } from "react-native";
import { CheckinSession } from "../api/types";
import { colors, spacing } from "../config/theme";
import { formatDateTime } from "../utils/date";
import { AppButton } from "./AppButton";
import { StatusBadge } from "./StatusBadge";

type SessionCardProps = {
  session: CheckinSession;
  onStart: (session: CheckinSession) => void;
};

export function SessionCard({ session, onStart }: SessionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{session.workshopTitle}</Text>
        <StatusBadge
          label={session.checkinOpen ? "Đang mở" : "Đã đóng"}
          tone={session.checkinOpen ? "success" : "warning"}
        />
      </View>
      <Text style={styles.meta}>{session.roomName || "Chưa có phòng"}</Text>
      <Text style={styles.time}>
        {formatDateTime(session.startAt)} - {formatDateTime(session.endAt)}
      </Text>
      <View style={styles.footer}>
        <StatusBadge
          label={session.source === "LIVE" ? "Live" : session.source === "MOCK" ? "Mock" : "Cache"}
          tone={session.source === "LIVE" ? "info" : session.source === "MOCK" ? "warning" : "neutral"}
        />
        <AppButton
          title="Bắt đầu quét"
          onPress={() => onStart(session)}
          disabled={!session.checkinOpen}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  button: {
    minWidth: 126,
  },
});
