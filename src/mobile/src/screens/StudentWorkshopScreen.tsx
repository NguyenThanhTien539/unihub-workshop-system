import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Registration, Workshop } from "../models/types";
import { getWorkshops, registerForWorkshop } from "../services/mockApi";
import { colors, spacing } from "../theme/theme";
import { Badge, Button, Card } from "../components/ui";

type StudentWorkshopScreenProps = {
  studentId: string;
  selectedWorkshop: Workshop | null;
  registration: Registration | null;
  onSelectWorkshop: (workshop: Workshop | null) => void;
  onRegistration: (registration: Registration | null) => void;
};

export function StudentWorkshopScreen({
  studentId,
  selectedWorkshop,
  registration,
  onSelectWorkshop,
  onRegistration,
}: StudentWorkshopScreenProps) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWorkshops()
      .then(setWorkshops)
      .catch(() => setError("Unable to load workshops. Showing cached data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>Loading workshops...</Text>
        <Text style={styles.body}>Preparing the latest schedule and seats.</Text>
      </Card>
    );
  }

  if (selectedWorkshop) {
    return (
      <WorkshopDetail
        studentId={studentId}
        workshop={selectedWorkshop}
        registration={registration}
        onBack={() => {
          onSelectWorkshop(null);
          onRegistration(null);
        }}
        onRegistration={onRegistration}
      />
    );
  }

  return (
    <View style={styles.stack}>
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}
      <Card>
        <Text style={styles.title}>Workshop list</Text>
        <Text style={styles.body}>
          Browse remains available even if payment or AI providers are degraded.
        </Text>
      </Card>
      {workshops.map((workshop) => (
        <Pressable
          key={workshop.id}
          onPress={() => onSelectWorkshop(workshop)}
          style={styles.pressable}
        >
          <Card>
            <View style={styles.cardHeader}>
              <Badge
                label={
                  workshop.feeType === "FREE"
                    ? "Free"
                    : `${workshop.feeAmount.toLocaleString("vi-VN")} VND`
                }
                tone={workshop.feeType === "FREE" ? "success" : "warning"}
              />
              <Badge
                label={`${workshop.remainingSeats} seats left`}
                tone={workshop.remainingSeats > 0 ? "neutral" : "danger"}
              />
            </View>
            <Text style={styles.workshopTitle}>{workshop.title}</Text>
            <Text style={styles.meta}>{workshop.speaker}</Text>
            <Text style={styles.meta}>
              {workshop.time} - {workshop.room}
            </Text>
            <Text style={styles.summary}>{workshop.summary}</Text>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

function WorkshopDetail({
  studentId,
  workshop,
  registration,
  onBack,
  onRegistration,
}: {
  studentId: string;
  workshop: Workshop;
  registration: Registration | null;
  onBack: () => void;
  onRegistration: (registration: Registration | null) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async () => {
    setSubmitting(true);
    setError(null);
    try {
      onRegistration(await registerForWorkshop(workshop, studentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.stack}>
      <Button label="Back to list" onPress={onBack} variant="secondary" />
      <Card>
        <View style={styles.cardHeader}>
          <Badge
            label={workshop.feeType === "FREE" ? "Free" : "Paid"}
            tone={workshop.feeType === "FREE" ? "success" : "warning"}
          />
          <Badge
            label={`${workshop.remainingSeats}/${workshop.capacity} available`}
          />
        </View>
        <Text style={styles.detailTitle}>{workshop.title}</Text>
        <Text style={styles.meta}>Speaker: {workshop.speaker}</Text>
        <Text style={styles.meta}>Time: {workshop.time}</Text>
        <Text style={styles.meta}>Room: {workshop.room}</Text>
        <Text style={styles.sectionTitle}>AI summary</Text>
        <Text style={styles.body}>{workshop.summary}</Text>
        <View style={styles.mapBox}>
          <Text style={styles.mapTitle}>Room map</Text>
          <Text style={styles.mapText}>{workshop.roomHint}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {registration ? (
          <RegistrationState registration={registration} />
        ) : (
          <Button
            label={workshop.remainingSeats > 0 ? "Register" : "Full"}
            onPress={register}
            disabled={submitting || workshop.remainingSeats <= 0}
          />
        )}
      </Card>
    </View>
  );
}

function RegistrationState({ registration }: { registration: Registration }) {
  if (registration.status === "PENDING_PAYMENT") {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.warningTitle}>Payment temporarily unavailable</Text>
        <Text style={styles.body}>{registration.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.stateBox}>
      <Text style={styles.successTitle}>Registration confirmed</Text>
      <Text style={styles.body}>{registration.message}</Text>
      <View style={styles.qrBox}>
        <Text style={styles.qrText}>QR</Text>
        <Text style={styles.qrToken}>{registration.qrToken}</Text>
      </View>
      <Text style={styles.notification}>
        Notification: Confirmation sent to in-app inbox and email queue.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  pressable: {
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  workshopTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800",
    marginTop: spacing.md,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  summary: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    marginTop: spacing.lg,
  },
  mapBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    marginVertical: spacing.lg,
    padding: spacing.lg,
  },
  mapTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  mapText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  stateBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  successTitle: {
    color: colors.success,
    fontSize: 17,
    fontWeight: "800",
  },
  warningTitle: {
    color: colors.warning,
    fontSize: 17,
    fontWeight: "800",
  },
  qrBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.ink,
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 150,
    justifyContent: "center",
    padding: spacing.lg,
  },
  qrText: {
    color: colors.ink,
    fontSize: 44,
    fontWeight: "900",
  },
  qrToken: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  notification: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
});
