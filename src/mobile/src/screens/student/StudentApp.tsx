import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Account, Workshop } from "../../models/types";
import {
  getCurrentWeekWorkshops,
} from "../../services/workshopService";
import { colors, spacing } from "../../theme/theme";
import { Badge, Button, Card, EmptyState, TabBar } from "../../components/ui";

type StudentTab = "home" | "profile";

export function StudentApp({ account }: { account: Account }) {
  const [tab, setTab] = useState<StudentTab>("home");
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(
    null,
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
          { key: "profile", label: "Profile" },
        ]}
      />
      {tab === "home" ? (
        selectedWorkshop ? (
          <WorkshopDetail
            workshop={selectedWorkshop}
            onBack={() => setSelectedWorkshop(null)}
          />
        ) : (
          <WorkshopList onSelectWorkshop={setSelectedWorkshop} />
        )
      ) : null}
      {tab === "profile" ? <StudentProfile account={account} /> : null}
    </View>
  );
}

function WorkshopList({
  onSelectWorkshop,
}: {
  onSelectWorkshop: (workshop: Workshop) => void;
}) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkshops = async () => {
    setLoading(true);
    setError(null);
    try {
      setWorkshops(await getCurrentWeekWorkshops());
    } catch (err) {
      setWorkshops([]);
      setError(err instanceof Error ? err.message : "Unable to load this week's workshops.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkshops();
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
        <View style={styles.rowBetween}>
          <Text style={styles.title}>This Week's Workshops</Text>
          <Button label="Refresh" onPress={refreshWorkshops} variant="secondary" />
        </View>
      </Card>
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Button label="Retry" onPress={refreshWorkshops} variant="secondary" />
        </Card>
      ) : workshops.length === 0 ? (
        <EmptyState title="No workshops scheduled this week" body="Check again later for newly published sessions." />
      ) : workshops.map((workshop) => {
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
                  label={workshop.status}
                  tone={
                    workshop.status === "FULL"
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
  workshop,
  onBack,
}: {
  workshop: Workshop;
  onBack: () => void;
}) {
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
          <Text style={styles.body}>{workshop.roomHint || "No room note available."}</Text>
          {workshop.roomMapUrl ? <Text style={styles.linkText}>{workshop.roomMapUrl}</Text> : null}
        </View>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.body}>{workshop.summary}</Text>
      </Card>
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
    gap: spacing.xl,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
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
    lineHeight: 24,
    marginTop: spacing.lg,
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    marginTop: spacing.lg,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  summary: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.lg,
  },
  seats: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.lg,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  mapBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    marginVertical: spacing.xl,
    padding: spacing.xl,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    marginVertical: spacing.lg,
  },
  linkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
