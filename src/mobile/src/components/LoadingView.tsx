import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../config/theme";

type LoadingViewProps = {
  label?: string;
};

export function LoadingView({ label = "Đang tải..." }: LoadingViewProps) {
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
    gap: 10,
    justifyContent: "center",
    padding: 24,
  },
  text: {
    color: colors.muted,
    fontSize: 14,
  },
});
