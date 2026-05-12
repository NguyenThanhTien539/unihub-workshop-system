import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuthStore } from "../auth/authStore";
import { AppButton } from "../components/AppButton";
import { AppTextInput } from "../components/AppTextInput";
import { ErrorView } from "../components/ErrorView";
import { colors } from "../config/theme";
import { getFriendlyErrorMessage } from "../utils/errors";

export function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const bootstrapError = useAuthStore((state) => state.bootstrapError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(bootstrapError);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    setError(null);
    setEmailError(trimmedEmail ? null : "Nhap email.");
    setPasswordError(password ? null : "Nhap mat khau.");

    if (!trimmedEmail || !password) {
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedEmail, password);
    } catch (submitError) {
      setError(getFriendlyErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.kicker}>UniHub Workshop</Text>
          <Text style={styles.title}>Check-in Staff</Text>
          <Text style={styles.subtitle}>Dang nhap de quet QR va dong bo diem danh.</Text>

          {error ? <ErrorView message={error} /> : null}

          <View style={styles.form}>
            <AppTextInput
              autoComplete="email"
              error={emailError}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="checkin@university.edu.vn"
              value={email}
            />
            <AppTextInput
              autoComplete="password"
              error={passwordError}
              label="Mat khau"
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              value={password}
            />
            <AppButton title="Dang nhap" onPress={handleSubmit} loading={isSubmitting} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 14,
  },
});
