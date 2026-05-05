import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Account, Registration, Workshop } from "../../models/types";
import {
  getMyRegistrations,
  getWorkshops,
  registerForWorkshop,
} from "../../services/mockWorkshopService";
import { colors, spacing } from "../../theme/theme";
import { Badge, Button, Card, EmptyState, TabBar } from "../../components/ui";

type StudentTab = "home" | "registrations" | "ticket" | "profile";

export function StudentApp({ account }: { account: Account }) {
  const [tab, setTab] = useState<StudentTab>("home");
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(
    null,
  );
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    getMyRegistrations().then(setRegistrations);
  }, []);

  const confirmedRegistration = registrations.find(
    (registration) => registration.status === "CONFIRMED",
  );

  return (
    <View style={styles.stack}>
      <TabBar
        active={tab}
        onChange={(nextTab) => {
          setTab(nextTab);
          setSelectedWorkshop(null);
        }}
        tabs={[
          { key: "home", label: "Home" },
          { key: "registrations", label: "My Registrations" },
          { key: "ticket", label: "QR Ticket" },
          { key: "profile", label: "Profile" },
        ]}
      />
      {tab === "home" ? (
        selectedWorkshop ? (
          <WorkshopDetail
            account={account}
            workshop={selectedWorkshop}
            registrations={registrations}
            onBack={() => setSelectedWorkshop(null)}
            onRegistered={(registration) => {
              setRegistrations((current) => [registration, ...current]);
              setTab(registration.status === "CONFIRMED" ? "ticket" : "registrations");
            }}
          />
        ) : (
          <WorkshopList
            registrations={registrations}
            onSelectWorkshop={setSelectedWorkshop}
          />
        )
      ) : null}
      {tab === "registrations" ? (
        <MyRegistrations registrations={registrations} />
      ) : null}
      {tab === "ticket" ? (
        confirmedRegistration ? (
          <QrTicket registration={confirmedRegistration} account={account} />
        ) : (
          <EmptyState
            title="No QR ticket yet"
            body="Register for a free workshop or complete payment for a paid workshop to receive a QR ticket."
          />
        )
      ) : null}
      {tab === "profile" ? <StudentProfile account={account} /> : null}
    </View>
  );
}

function WorkshopList({
  registrations,
  onSelectWorkshop,
}: {
  registrations: Registration[];
  onSelectWorkshop: (workshop: Workshop) => void;
}) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkshops().then((items) => {
      setWorkshops(items);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>Loading workshops...</Text>
        <Text style={styles.body}>Fetching the latest seats and summaries.</Text>
      </Card>
    );
  }

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>Workshop List</Text>
        <Text style={styles.body}>
          Browse career week sessions. Payment failures never block this list.
        </Text>
      </Card>
      {workshops.map((workshop) => {
        const registration = registrations.find(
          (item) => item.workshopId === workshop.id,
        );
        return (
          <Pressable key={workshop.id} onPress={() => onSelectWorkshop(workshop)}>
            <Card>
              <View style={styles.rowBetween}>
                <Badge
                  label={
                    workshop.feeType === "FREE"
                      ? "Free"
                      : `${workshop.feeAmount.toLocaleString("vi-VN")} VND`
                  }
                  tone={workshop.feeType === "FREE" ? "success" : "warning"}
                />
                <Badge
                  label={registration?.status ?? workshop.status}
                  tone={
                    registration?.status === "CONFIRMED"
                      ? "success"
                      : workshop.status === "FULL"
                        ? "danger"
                        : "neutral"
                  }
                />
              </View>
              <Text style={styles.workshopTitle}>{workshop.title}</Text>
              <Text style={styles.meta}>{workshop.speaker}</Text>
              <Text style={styles.meta}>
                {workshop.date}, {workshop.time} - {workshop.room}
              </Text>
              <Text style={styles.summary}>{workshop.summary}</Text>
              <Text style={styles.seats}>
                {workshop.remainingSeats} of {workshop.capacity} seats left
              </Text>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

function WorkshopDetail({
  account,
  workshop,
  registrations,
  onBack,
  onRegistered,
}: {
  account: Account;
  workshop: Workshop;
  registrations: Registration[];
  onBack: () => void;
  onRegistered: (registration: Registration) => void;
}) {
  const existing = useMemo(
    () => registrations.find((item) => item.workshopId === workshop.id),
    [registrations, workshop.id],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async () => {
    setLoading(true);
    setError(null);
    try {
      onRegistered(
        await registerForWorkshop(workshop, account.studentId ?? account.id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.stack}>
      <Button label="Back to workshops" onPress={onBack} variant="secondary" />
      <Card>
        <View style={styles.rowBetween}>
          <Badge label={workshop.feeType} tone={workshop.feeType === "FREE" ? "success" : "warning"} />
          <Badge label={`${workshop.remainingSeats} seats left`} />
        </View>
        <Text style={styles.detailTitle}>{workshop.title}</Text>
        <Text style={styles.meta}>{workshop.speaker}</Text>
        <Text style={styles.meta}>{workshop.speakerTitle}</Text>
        <Text style={styles.meta}>
          {workshop.date}, {workshop.time}
        </Text>
        <Text style={styles.meta}>Room {workshop.room}</Text>
        <View style={styles.mapBox}>
          <Text style={styles.sectionTitle}>Room / Map</Text>
          <Text style={styles.body}>{workshop.roomHint}</Text>
        </View>
        <Text style={styles.sectionTitle}>AI Summary</Text>
        <Text style={styles.body}>{workshop.summary}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {existing ? (
          <RegistrationNotice registration={existing} />
        ) : (
          <Button
            label={loading ? "Registering..." : "Register for workshop"}
            onPress={register}
            disabled={
              loading ||
              workshop.status === "FULL" ||
              workshop.status === "CANCELLED"
            }
          />
        )}
      </Card>
    </View>
  );
}

function MyRegistrations({ registrations }: { registrations: Registration[] }) {
  if (registrations.length === 0) {
    return (
      <EmptyState
        title="No registrations"
        body="Your registered workshops and payment states will appear here."
      />
    );
  }

  return (
    <View style={styles.stack}>
      {registrations.map((registration) => (
        <Card key={registration.id}>
          <Badge
            label={registration.status}
            tone={registration.status === "CONFIRMED" ? "success" : "warning"}
          />
          <Text style={styles.workshopTitle}>{registration.workshopTitle}</Text>
          <Text style={styles.body}>{registration.message}</Text>
          <Text style={styles.notification}>{registration.notification}</Text>
        </Card>
      ))}
    </View>
  );
}

function QrTicket({
  registration,
  account,
}: {
  registration: Registration;
  account: Account;
}) {
  return (
    <Card>
      <Badge label="Confirmed ticket" tone="success" />
      <Text style={styles.detailTitle}>{registration.workshopTitle}</Text>
      <Text style={styles.body}>Student: {account.name}</Text>
      <View style={styles.qrBox}>
        <Text style={styles.qrText}>QR</Text>
        <Text style={styles.qrToken}>{registration.qrToken}</Text>
      </View>
      <Text style={styles.notification}>{registration.notification}</Text>
    </Card>
  );
}

function RegistrationNotice({ registration }: { registration: Registration }) {
  return (
    <View style={styles.stateBox}>
      <Text
        style={[
          styles.stateTitle,
          registration.status === "CONFIRMED"
            ? styles.successText
            : styles.warningText,
        ]}
      >
        {registration.status === "CONFIRMED"
          ? "Registration confirmed"
          : "Payment temporarily unavailable"}
      </Text>
      <Text style={styles.body}>{registration.message}</Text>
    </View>
  );
}

function StudentProfile({ account }: { account: Account }) {
  return (
    <Card>
      <Badge label="STUDENT" tone="success" />
      <Text style={styles.detailTitle}>{account.name}</Text>
      <Text style={styles.meta}>{account.email}</Text>
      <Text style={styles.meta}>Student ID: {account.studentId}</Text>
      <Text style={styles.todo}>
        UI role guards only improve user experience. Real access control must
        be enforced by backend middleware/security filters using JWT role
        claims.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
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
  detailTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
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
  seats: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
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
    fontWeight: "900",
  },
  mapBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    marginVertical: spacing.lg,
    padding: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    marginVertical: spacing.md,
  },
  stateBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  successText: {
    color: colors.success,
  },
  warningText: {
    color: colors.warning,
  },
  qrBox: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.ink,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 170,
    marginVertical: spacing.lg,
    padding: spacing.lg,
  },
  qrText: {
    color: colors.ink,
    fontSize: 48,
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
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.md,
  },
  todo: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
