import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "./src/components/ui";
import { Account } from "./src/models/types";
import { AuthScreens } from "./src/screens/auth/AuthScreens";
import { CheckinStaffApp } from "./src/screens/checkin/CheckinStaffApp";
import { OrganizerApp } from "./src/screens/organizer/OrganizerApp";
import { StudentApp } from "./src/screens/student/StudentApp";
import { logout } from "./src/services/authService";
import { colors, spacing } from "./src/theme/theme";

export default function App() {
  const [account, setAccount] = useState<Account | null>(null);

  const roleTitle = useMemo(() => {
    if (!account) {
      return "Sign in";
    }
    if (account.role === "CHECKIN_STAFF") {
      return "Door Check-in";
    }
    if (account.role === "ORGANIZER") {
      return "Organizer Console";
    }
    return "Student Workshops";
  }, [account]);

  const signOut = async () => {
    const token = account?.refreshToken;
    setAccount(null);
    try {
      await logout(token);
    } catch {
      await logout(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>UniHub Workshop</Text>
          <Text style={styles.title}>{roleTitle}</Text>
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
                onPress={signOut}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
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
  stack: {
    gap: spacing.xl,
  },
  accountBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    justifyContent: "space-between",
    padding: spacing.xl,
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
