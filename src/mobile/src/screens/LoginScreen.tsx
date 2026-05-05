import { StyleSheet, Text, View } from "react-native";
import { Account } from "../models/types";
import { colors, spacing } from "../theme/theme";
import { Button, Card } from "../components/ui";

type LoginScreenProps = {
  accounts: Account[];
  onLogin: (account: Account) => void;
};

export function LoginScreen({ accounts, onLogin }: LoginScreenProps) {
  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>Choose a sample account</Text>
        <Text style={styles.body}>
          Use role entry for the demo until the backend login flow is connected.
        </Text>
        <Text style={styles.todo}>
          TODO: Replace role selection with POST /api/auth/login. Body:
          {" { email, password }"}. Expected: accessToken, refreshToken, user,
          roles. Handle 401/403 with a clear sign-in message.
        </Text>
      </Card>
      {accounts.map((account) => (
        <Card key={account.id}>
          <View style={styles.accountRow}>
            <View style={styles.accountCopy}>
              <Text style={styles.role}>{account.label}</Text>
              <Text style={styles.name}>{account.name}</Text>
              <Text style={styles.email}>{account.email}</Text>
            </View>
            <Button label="Enter" onPress={() => onLogin(account)} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  todo: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  accountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  accountCopy: {
    flex: 1,
  },
  role: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  name: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 3,
  },
  email: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
});
