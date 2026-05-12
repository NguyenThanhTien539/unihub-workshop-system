import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuthStore } from "../auth/authStore";
import { AppButton } from "../components/AppButton";
import { StatusBadge } from "../components/StatusBadge";
import { colors } from "../config/theme";
import { countPendingEvents } from "../db/offlineEventDao";
import { useNetworkStore } from "../network/networkStore";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoggingOut, setLoggingOut] = useState(false);

  const refreshPending = useCallback(async () => {
    setPendingCount(await countPendingEvents());
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  async function confirmLogout() {
    const pending = await countPendingEvents();
    const doLogout = async () => {
      setLoggingOut(true);
      await logout();
      setLoggingOut(false);
    };

    if (pending > 0) {
      Alert.alert(
        "Con du lieu chua dong bo",
        "Du lieu local se duoc giu lai va chi dong bo khi dang nhap lai bang tai khoan check-in staff.",
        [
          { text: "Huy", style: "cancel" },
          { text: "Dang xuat", style: "destructive", onPress: doLogout },
        ],
      );
      return;
    }

    await doLogout();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>{user?.fullName ?? "Check-in Staff"}</Text>
            <StatusBadge label={isOnline ? "Online" : "Offline"} tone={isOnline ? "success" : "warning"} />
          </View>
          <Text style={styles.meta}>{user?.email}</Text>
          <Text style={styles.meta}>Roles: {user?.roles.join(", ")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Local sync</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Pending / failed</Text>
            <Text style={styles.metricValue}>{pendingCount}</Text>
          </View>
          <AppButton title="Mo man hinh dong bo" onPress={() => navigation.navigate("OfflineSync")} variant="secondary" />
        </View>

        <AppButton title="Dang xuat" onPress={confirmLogout} loading={isLoggingOut} variant="danger" />
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  metricRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  metricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
  },
});
