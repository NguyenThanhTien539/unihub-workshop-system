import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { getCheckinSessions } from "../api/checkinApi";
import { CheckinSession } from "../api/types";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppButton } from "../components/AppButton";
import { ErrorView } from "../components/ErrorView";
import { LoadingView } from "../components/LoadingView";
import { SessionCard } from "../components/SessionCard";
import { StatusBadge } from "../components/StatusBadge";
import { colors } from "../config/theme";
import { getCachedSessions, upsertSessions } from "../db/sessionDao";
import { useNetworkStore } from "../network/networkStore";
import { getFriendlyErrorMessage } from "../utils/errors";

type Props = NativeStackScreenProps<RootStackParamList, "Sessions">;

export function CheckinSessionsScreen({ navigation }: Props) {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [sessions, setSessions] = useState<CheckinSession[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isRefreshing, setRefreshing] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setWarning(null);
      setError(null);

      try {
        if (isOnline) {
          try {
            const liveSessions = await getCheckinSessions();
            await upsertSessions(liveSessions);
            setSessions(liveSessions);
            return;
          } catch (apiError) {
            const cached = await getCachedSessions();
            if (cached.length > 0) {
              setSessions(cached);
              setWarning(`Dang hien thi cache. ${getFriendlyErrorMessage(apiError)}`);
              return;
            }

            throw apiError;
          }
        }

        const cached = await getCachedSessions();
        setSessions(cached);
        if (cached.length === 0) {
          setWarning("Chua co session offline. Hay ket noi mang de tai danh sach lan dau.");
        }
      } catch (loadError) {
        setError(getFriendlyErrorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isOnline],
  );

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  function openScanner(session: CheckinSession) {
    navigation.navigate("Scanner", { session });
  }

  if (isLoading) {
    return <LoadingView label="Dang tai sessions..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadSessions(true)} />}
      >
        <View style={styles.topbar}>
          <View>
            <Text style={styles.title}>Check-in sessions</Text>
            <Text style={styles.subtitle}>Chon session dang truc.</Text>
          </View>
          <StatusBadge label={isOnline ? "Online" : "Offline"} tone={isOnline ? "success" : "warning"} />
        </View>

        <View style={styles.actions}>
          <AppButton title="Dong bo" onPress={() => navigation.navigate("OfflineSync")} variant="secondary" style={styles.actionButton} />
          <AppButton title="Tai khoan" onPress={() => navigation.navigate("Profile")} variant="secondary" style={styles.actionButton} />
        </View>

        {warning ? (
          <View style={styles.warning}>
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        ) : null}

        {error ? <ErrorView message={error} actionLabel="Thu lai" onAction={() => loadSessions()} /> : null}

        <View style={styles.list}>
          {sessions.map((session) => (
            <SessionCard key={session.sessionId} session={session} onStart={openScanner} />
          ))}
        </View>

        {sessions.length === 0 && !error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Khong co session</Text>
            <Text style={styles.emptyText}>Ket noi mang de tai danh sach session truoc khi check-in offline.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    gap: 14,
    padding: 16,
  },
  topbar: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: "#f3c46d",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: 12,
  },
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
