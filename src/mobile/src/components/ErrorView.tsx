import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "./AppButton";
import { colors } from "../config/theme";

type ErrorViewProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorView({ title = "Co loi", message, actionLabel, onAction }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <AppButton title={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#f4b4ae",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  title: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "800",
  },
  message: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
});
