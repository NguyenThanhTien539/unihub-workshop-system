import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Account, Registration, Workshop } from "../../models/types";
import {
  getMyRegistrations,
  getWorkshopDetail,
  getWorkshops,
} from "../../services/workshopService";
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
    getMyRegistrations().then(setRegistrations).catch(() => setRegistrations([]));
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
            body="Confirmed registration tickets will appear here when registration data is available."
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
    getWorkshops()
      .then(setWorkshops)
      .catch(() => setWorkshops([]))
      .finally(() => setLoading(false));
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
      </Card>
      {workshops.length === 0 ? (
        <EmptyState title="No workshops found" body="No published workshops are available." />
      ) : workshops.map((workshop) => {
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
}: {
  account: Account;
  workshop: Workshop;
  registrations: Registration[];
  onBack: () => void;
}) {
  const existing = useMemo(
    () => registrations.find((item) => item.workshopId === workshop.id),
    [registrations, workshop.id],
  );
  const [detail, setDetail] = useState(workshop);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingDetail(true);
    setError(null);
    getWorkshopDetail(workshop.id)
      .then(setDetail)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load workshop detail.");
      })
      .finally(() => setLoadingDetail(false));
  }, [workshop.id]);

  return (
    <View style={styles.stack}>
      <Button label="Back to workshops" onPress={onBack} variant="secondary" />
      <Card>
        {loadingDetail ? <Text style={styles.body}>Loading workshop detail...</Text> : null}
        <View style={styles.rowBetween}>
          <Badge label={detail.feeType} tone={detail.feeType === "FREE" ? "success" : "warning"} />
          <Badge label={`${detail.remainingSeats} seats left`} />
        </View>
        <Text style={styles.detailTitle}>{detail.title}</Text>
        <Text style={styles.meta}>{detail.speaker}</Text>
        <Text style={styles.meta}>{detail.speakerTitle}</Text>
        <Text style={styles.meta}>
          {detail.date}, {detail.time}
        </Text>
        <Text style={styles.meta}>Room {detail.room}</Text>
        <View style={styles.mapBox}>
          <Text style={styles.sectionTitle}>Room / Map</Text>
          <Text style={styles.body}>{detail.roomHint || "No room note available."}</Text>
        </View>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.body}>{detail.summary}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {existing ? (
          <RegistrationNotice registration={existing} />
        ) : (
          <Text style={styles.unavailable}>
            Registration is not available from the current backend API.
          </Text>
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
          : "Payment pending"}
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
  unavailable: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
