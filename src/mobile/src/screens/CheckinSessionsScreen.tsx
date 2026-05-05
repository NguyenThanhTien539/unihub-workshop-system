import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme/theme";
import { Button, Card } from "../components/ui";

type CheckinSessionsScreenProps = {
  activeTab: "scanner" | "queue";
  onChangeTab: (tab: "scanner" | "queue") => void;
};

export function CheckinSessionsScreen({
  activeTab,
  onChangeTab,
}: CheckinSessionsScreenProps) {
  return (
    <Card>
      <Text style={styles.title}>Active session</Text>
      <Text style={styles.session}>AI Career Sprint</Text>
      <Text style={styles.meta}>Innovation Hall A2-305 - Check-in open</Text>
      <Text style={styles.todo}>
        TODO: Load staff sessions with GET /api/workshops or
        /api/checkin/sessions and cache them locally before the event.
      </Text>
      <View style={styles.tabs}>
        <Button
          label="Scanner"
          onPress={() => onChangeTab("scanner")}
          variant={activeTab === "scanner" ? "primary" : "secondary"}
        />
        <Button
          label="Offline queue"
          onPress={() => onChangeTab("queue")}
          variant={activeTab === "queue" ? "primary" : "secondary"}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  session: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  todo: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
