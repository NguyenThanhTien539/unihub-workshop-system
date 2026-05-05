import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "./src/components/ui";
import { Account } from "./src/models/types";
import { AuthScreens } from "./src/screens/auth/AuthScreens";
import { CheckinStaffApp } from "./src/screens/checkin/CheckinStaffApp";
import { OrganizerApp } from "./src/screens/organizer/OrganizerApp";
import { StudentApp } from "./src/screens/student/StudentApp";
import { colors, spacing } from "./src/theme/theme";

export default function App() {
  const [account, setAccount] = useState<Account | null>(null);

  const roleTitle = useMemo(() => {
    if (!account) {
      return "Mobile Demo";
    }
    if (account.role === "CHECKIN_STAFF") {
      return "Door Check-in";
    }
    if (account.role === "ORGANIZER") {
      return "Organizer Console";
    }
    return "Student Workshops";
  }, [account]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>UniHub Workshop</Text>
          <Text style={styles.title}>{roleTitle}</Text>
          <Text style={styles.subtitle}>
            Demo-ready React Native UI with local mock data and explicit backend
            TODOs for auth, registration, payment, admin, and offline check-in.
          </Text>
        </View>

        {!account ? (
          <AuthScreens onAuthenticated={setAccount} />
        ) : (
          <View style={styles.stack}>
            <View style={styles.accountBar}>
              <View style={styles.accountCopy}>
                <Text style={styles.accountLabel}>{account.label}</Text>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountEmail}>{account.email}</Text>
              </View>
              <Button
                label="Logout"
                onPress={() => setAccount(null)}
                variant="secondary"
              />
            </View>

            {account.role === "STUDENT" ? <StudentApp account={account} /> : null}
            {account.role === "CHECKIN_STAFF" ? (
              <CheckinStaffApp account={account} />
            ) : null}
            {account.role === "ORGANIZER" ? (
              <OrganizerApp account={account} />
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    marginBottom: spacing.lg,
  },
  kicker: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  stack: {
    gap: spacing.md,
  },
  accountBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  accountCopy: {
    flex: 1,
  },
  accountLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  accountName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  accountEmail: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
