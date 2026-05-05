import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { CheckinResult } from "../models/types";
import { verifyCheckin } from "../services/mockApi";
import { colors, spacing } from "../theme/theme";
import { Badge, Button, Card } from "../components/ui";

export function QrScannerPlaceholderScreen() {
  const [token, setToken] = useState("valid-demo-ticket");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = async (nextToken = token) => {
    setLoading(true);
    setResult(await verifyCheckin(nextToken));
    setLoading(false);
  };

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>QR scanner</Text>
        <View style={styles.scannerFrame}>
          <Text style={styles.scannerText}>Scan area</Text>
        </View>
        <Text style={styles.body}>
          Camera integration can be added later. For demo, enter a token or use
          quick result states.
        </Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          style={styles.input}
          placeholder="valid-demo-ticket"
        />
        <Button
          label={loading ? "Checking..." : "Mock scan"}
          onPress={() => scan()}
          disabled={loading}
        />
      </Card>
      <View style={styles.quickGrid}>
        <Button label="Valid" onPress={() => scan("valid-demo-ticket")} />
        <Button
          label="Used"
          onPress={() => scan("used-demo-ticket")}
          variant="secondary"
        />
        <Button
          label="Invalid"
          onPress={() => scan("invalid-demo-ticket")}
          variant="secondary"
        />
        <Button
          label="Offline"
          onPress={() => scan("offline-demo-ticket")}
          variant="secondary"
        />
      </View>
      {result ? <ResultCard result={result} /> : null}
    </View>
  );
}

function ResultCard({ result }: { result: CheckinResult }) {
  const tone =
    result.kind === "VALID"
      ? "success"
      : result.kind === "INVALID"
        ? "danger"
        : "warning";

  return (
    <Card>
      <Badge label={result.kind.replace("_", " ")} tone={tone} />
      <Text style={styles.resultTitle}>{result.title}</Text>
      {result.studentName ? (
        <Text style={styles.meta}>
          {result.studentName} - {result.studentId}
        </Text>
      ) : null}
      <Text style={styles.body}>{result.detail}</Text>
    </Card>
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
  scannerFrame: {
    alignItems: "center",
    backgroundColor: "#101820",
    borderRadius: 8,
    height: 220,
    justifyContent: "center",
    marginTop: spacing.md,
  },
  scannerText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
});
