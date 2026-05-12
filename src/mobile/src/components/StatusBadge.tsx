import { StyleSheet, Text, View } from "react-native";
import { colors } from "../config/theme";

type StatusBadgeProps = {
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      <Text style={[styles.text, styles[`${tone}Text`]]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
  },
  success: {
    backgroundColor: colors.successSoft,
  },
  warning: {
    backgroundColor: colors.warningSoft,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  info: {
    backgroundColor: colors.infoSoft,
  },
  neutral: {
    backgroundColor: colors.surfaceMuted,
  },
  successText: {
    color: colors.success,
  },
  warningText: {
    color: colors.warning,
  },
  dangerText: {
    color: colors.danger,
  },
  infoText: {
    color: colors.info,
  },
  neutralText: {
    color: colors.muted,
  },
});
