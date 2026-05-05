import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Account, Role } from "../../models/types";
import { sampleAccounts } from "../../sampleData/mockData";
import {
  loginWithSampleAccount,
  registerSampleAccount,
} from "../../services/mockAuthService";
import { colors, spacing } from "../../theme/theme";
import { Badge, Button, Card, Field, TabBar } from "../../components/ui";

type AuthMode = "login" | "register";

export function AuthScreens({ onAuthenticated }: { onAuthenticated: (account: Account) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");

  return mode === "login" ? (
    <LoginPanel
      onAuthenticated={onAuthenticated}
      onShowRegister={() => setMode("register")}
    />
  ) : (
    <RegisterPanel
      onAuthenticated={onAuthenticated}
      onShowLogin={() => setMode("login")}
    />
  );
}

function LoginPanel({
  onAuthenticated,
  onShowRegister,
}: {
  onAuthenticated: (account: Account) => void;
  onShowRegister: () => void;
}) {
  const [email, setEmail] = useState("student@unihub.test");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      onAuthenticated(await loginWithSampleAccount(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.body}>
          Sign in with a sample account to open the role-specific mobile demo.
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
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={loading ? "Signing in..." : "Login"}
            onPress={login}
            disabled={loading}
          />
        </View>
        <Pressable onPress={onShowRegister}>
          <Text style={styles.link}>Create a demo account</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Sample accounts</Text>
        <Text style={styles.todo}>
          TODO: Replace local sample account validation with real backend call:
          POST /api/auth/login. Body: {"{ email, password }"}. Expected
          response: accessToken, refreshToken, user role.
        </Text>
        <View style={styles.accountList}>
          {sampleAccounts.map((account) => (
            <Pressable
              key={account.id}
              onPress={() => {
                setEmail(account.email);
                setPassword(account.password);
              }}
              style={styles.sampleRow}
            >
              <View style={styles.sampleCopy}>
                <Text style={styles.sampleName}>{account.name}</Text>
                <Text style={styles.sampleEmail}>{account.email}</Text>
              </View>
              <Badge label={account.role} />
            </Pressable>
          ))}
        </View>
      </Card>
    </View>
  );
}

function RegisterPanel({
  onAuthenticated,
  onShowLogin,
}: {
  onAuthenticated: (account: Account) => void;
  onShowLogin: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const register = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const account = await registerSampleAccount({
        name,
        email,
        password,
        confirmPassword,
        role,
      });
      setMessage("Demo account created. Opening your role workspace.");
      onAuthenticated(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Text style={styles.title}>Register</Text>
      <Text style={styles.body}>
        Demo-only registration for evaluator flows. Production student accounts
        may still be created from controlled seed data or CSV import.
      </Text>
      <View style={styles.form}>
        <Field label="Full name" value={name} onChangeText={setName} />
        <Field
          label="Email or student ID"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Field
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <Text style={styles.fieldLabel}>Role</Text>
        <TabBar
          active={role}
          onChange={setRole}
          tabs={[
            { key: "STUDENT", label: "Student" },
            { key: "CHECKIN_STAFF", label: "Staff" },
            { key: "ORGANIZER", label: "Organizer" },
          ]}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Button
          label={loading ? "Creating..." : "Register"}
          onPress={register}
          disabled={loading}
        />
      </View>
      <Pressable onPress={onShowLogin}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
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
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.lg,
    textAlign: "center",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  todo: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  accountList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sampleRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  sampleCopy: {
    flex: 1,
  },
  sampleName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  sampleEmail: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
  },
  success: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800",
  },
});
