import { Modal, StyleSheet, Text, View } from "react-native";
import { ManagedWorkshop } from "../models/types";
import { colors, spacing } from "../theme/theme";
import { Button, Card } from "./ui";

export function ConfirmActionModal({
  workshop,
  visible,
  onCancel,
  onConfirm,
}: {
  workshop: ManagedWorkshop | null;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!workshop) {
    return null;
  }

  const hardDelete = workshop.registrations === 0 && workshop.status === "DRAFT";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Card>
          <Text style={styles.title}>
            {hardDelete ? "Delete draft workshop?" : "Cancel workshop?"}
          </Text>
          <Text style={styles.workshopTitle}>{workshop.title}</Text>
          <Text style={styles.meta}>
            {workshop.date}, {workshop.time} - {workshop.room}
          </Text>
          <Text style={styles.meta}>{workshop.registrations} registered students</Text>
          <Text style={styles.warning}>
            This action may notify registered students and prevent new
            registrations.
          </Text>
          <View style={styles.actions}>
            <Button label="Keep Workshop" onPress={onCancel} variant="secondary" />
            <Button
              label={hardDelete ? "Confirm Delete" : "Confirm Cancel"}
              onPress={onConfirm}
              variant="danger"
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  workshopTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  warning: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
