import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { CheckinSessionsScreen } from "./src/screens/CheckinSessionsScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OfflineSyncScreen } from "./src/screens/OfflineSyncScreen";
import { QrScannerPlaceholderScreen } from "./src/screens/QrScannerPlaceholderScreen";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>UniHub Workshop</Text>
          <Text style={styles.title}>Mobile Scaffold</Text>
          <Text style={styles.subtitle}>
            Placeholder screens for the check-in experience. Wire these to the
            backend when APIs are ready.
          </Text>
        </View>
        <View style={styles.stack}>
          <LoginScreen />
          <CheckinSessionsScreen />
          <QrScannerPlaceholderScreen />
          <OfflineSyncScreen />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f1e6",
  },
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  kicker: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: "#1f2933",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 6,
  },
  subtitle: {
    color: "#5b6770",
    fontSize: 14,
    marginTop: 8,
  },
  stack: {
    gap: 12,
  },
});
