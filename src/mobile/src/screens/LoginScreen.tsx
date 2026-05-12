import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type LoginScreenProps = {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  isSignedIn: boolean;
  staffName: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onLogout: () => void;
};

export function LoginScreen({
  email,
  password,
  loading,
  error,
  isSignedIn,
  staffName,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onLogout,
}: LoginScreenProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Check-in Login</Text>
        {isSignedIn ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={onLogout}>
            <Text style={styles.secondaryButtonText}>Logout</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.description}>
        {isSignedIn
          ? `Signed in as ${staffName || "check-in staff"}.`
          : "Sign in with a check-in_staff account to access validation endpoints."}
      </Text>

      {!isSignedIn ? (
        <>
          <TextInput
            value={email}
            onChangeText={onEmailChange}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            value={password}
            onChangeText={onPasswordChange}
            style={styles.input}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor="#94a3b8"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? "Signing in..." : "Sign in"}</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
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
  description: {
    color: "#5b6770",
    fontSize: 14,
    marginTop: 8,
  },
  input: {
    borderColor: "#d7dde4",
    borderRadius: 14,
    borderWidth: 1,
    color: "#1f2933",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    marginTop: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1f2933",
    borderRadius: 999,
    marginTop: 14,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    borderColor: "#d7dde4",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
});
