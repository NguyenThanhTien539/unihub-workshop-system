import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Account } from "../../models/types";
import { login } from "../../services/authService";
import { colors, spacing } from "../../theme/theme";
import {
  getActionErrorMessage,
  useNotification,
} from "../../components/NotificationModal";
import { Button, Card, Field } from "../../components/ui";

export function AuthScreens({ onAuthenticated }: { onAuthenticated: (account: Account) => void }) {
  return <LoginPanel onAuthenticated={onAuthenticated} />;
}

function LoginPanel({
  onAuthenticated,
}: {
  onAuthenticated: (account: Account) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useNotification();

  const submit = async () => {
    setLoading(true);
    try {
      const account = await login(email, password);
      await showSuccess(`Signed in as ${account.name}.`);
      onAuthenticated(account);
    } catch (err) {
      await showError(getActionErrorMessage(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.body}>
          Sign in with your UniHub account.
        </Text>
        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button
            label={loading ? "Signing in..." : "Login"}
            onPress={submit}
            disabled={loading}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.xl,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  form: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
});
