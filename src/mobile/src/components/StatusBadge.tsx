import { StyleSheet, Text, View } from "react-native";

import { colors } from "../config/theme";
import { FeeType, WorkshopStatus } from "../models/types";

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

export function WorkshopStatusBadge({ status }: { status: WorkshopStatus }) {
  const tone =
    status === "CANCELLED" ? "danger" : status === "DRAFT" ? "warning" : "success";

  return <StatusBadge label={status} tone={tone} />;
}

export function FeeBadge({ feeType }: { feeType: FeeType }) {
  return (
    <StatusBadge
      label={feeType === "PAID" ? "Paid" : "Free"}
      tone={feeType === "PAID" ? "warning" : "success"}
    />
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
