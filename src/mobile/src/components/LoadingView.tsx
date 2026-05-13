import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../config/theme";

type LoadingViewProps = {
  label?: string;
};

export function LoadingView({ label = "Dang tai..." }: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl,
  },
  text: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
