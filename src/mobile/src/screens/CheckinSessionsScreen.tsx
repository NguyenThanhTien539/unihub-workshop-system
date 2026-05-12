import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CheckinSession } from "../services/checkinApi";

type CheckinSessionsScreenProps = {
  sessions: CheckinSession[];
  selectedSessionId: string;
  loading: boolean;
  error: string | null;
  onSelectSession: (sessionId: string) => void;
  onRefresh: () => void;
};

export function CheckinSessionsScreen({
  sessions,
  selectedSessionId,
  loading,
  error,
  onSelectSession,
  onRefresh,
}: CheckinSessionsScreenProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Check-in Sessions</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>{loading ? "Loading..." : "Refresh"}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {sessions.length === 0 ? (
        <Text style={styles.empty}>No sessions loaded yet.</Text>
      ) : (
        sessions.map((session) => {
          const active = session.sessionId === selectedSessionId;
          return (
            <TouchableOpacity
              key={session.sessionId}
              style={[styles.sessionCard, active ? styles.sessionCardActive : null]}
              onPress={() => onSelectSession(session.sessionId)}
            >
              <Text style={styles.sessionTitle}>{session.workshopTitle}</Text>
              <Text style={styles.sessionMeta}>
                {formatDate(session.startAt)} · {formatTime(session.startAt, session.endAt)}
              </Text>
              <Text style={styles.sessionMeta}>
                {session.roomName}, {session.building}
              </Text>
              <Text style={[styles.sessionBadge, session.checkinOpen ? styles.badgeOpen : styles.badgeClosed]}>
                {session.checkinOpen ? "CHECK-IN OPEN" : "CHECK-IN CLOSED"}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(startAt: string, endAt: string) {
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(startAt))} - ${formatter.format(new Date(endAt))}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: "#1f2933",
    fontSize: 18,
    fontWeight: "700",
  },
  refreshButton: {
    borderColor: "#d7dde4",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    marginTop: 10,
  },
  empty: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 12,
  },
  sessionCard: {
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  sessionCardActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#38bdf8",
  },
  sessionTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  sessionMeta: {
    color: "#475569",
    fontSize: 13,
    marginTop: 4,
  },
  sessionBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeOpen: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeClosed: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
  },
});
