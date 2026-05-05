import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { ConfirmActionModal } from "../../components/ConfirmActionModal";
import { FeeBadge, WorkshopStatusBadge } from "../../components/StatusBadge";
import { Badge, Button, Card, EmptyState, TabBar } from "../../components/ui";
import {
  Account,
  ManagedWorkshop,
  OrganizerStats,
  WorkshopFormValues,
  WorkshopStatus,
} from "../../models/types";
import {
  cancelWorkshop,
  createWorkshop,
  getOrganizerDashboard,
  updateWorkshop,
} from "../../services/mockWorkshopService";
import { colors, spacing } from "../../theme/theme";
import { WorkshopFormScreen } from "./WorkshopFormScreen";

type OrganizerTab = "dashboard" | "workshops" | "stats" | "profile";
type WorkshopView = "list" | "detail" | "create" | "edit";
type StatusFilter = "ALL" | WorkshopStatus;
type FeeFilter = "ALL" | "FREE" | "PAID";

export function OrganizerApp({ account }: { account: Account }) {
  const [tab, setTab] = useState<OrganizerTab>("dashboard");
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [workshops, setWorkshops] = useState<ManagedWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [workshopView, setWorkshopView] = useState<WorkshopView>("list");
  const [selectedWorkshop, setSelectedWorkshop] = useState<ManagedWorkshop | null>(
    null,
  );
  const [confirmWorkshop, setConfirmWorkshop] = useState<ManagedWorkshop | null>(
    null,
  );

  useEffect(() => {
    getOrganizerDashboard().then((result) => {
      setStats(result.stats);
      setWorkshops(result.workshops);
      setLoading(false);
    });
  }, []);

  const derivedStats = useMemo(() => buildStats(workshops, stats), [workshops, stats]);

  const openWorkshops = () => {
    setTab("workshops");
    setWorkshopView("list");
    setSelectedWorkshop(null);
  };

  const handleCreate = async (values: WorkshopFormValues) => {
    const created = await createWorkshop(values);
    setWorkshops((current) => [created, ...current]);
    setMessage(`${created.title} created as ${created.status.toLowerCase()}.`);
    setWorkshopView("list");
  };

  const handleUpdate = async (values: WorkshopFormValues) => {
    if (!selectedWorkshop) {
      return;
    }
    const updated = await updateWorkshop(selectedWorkshop, values);
    setWorkshops((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setSelectedWorkshop(updated);
    setMessage(`${updated.title} updated.`);
    setWorkshopView("detail");
  };

  const handleConfirmCancel = async () => {
    if (!confirmWorkshop) {
      return;
    }
    const result = await cancelWorkshop(confirmWorkshop, "Cancelled from mobile admin demo.");
    if (result === null) {
      setWorkshops((current) =>
        current.filter((item) => item.id !== confirmWorkshop.id),
      );
      setMessage(`${confirmWorkshop.title} draft deleted.`);
    } else {
      setWorkshops((current) =>
        current.map((item) => (item.id === result.id ? result : item)),
      );
      setSelectedWorkshop(result);
      setMessage(`${result.title} cancelled. Registered students would be notified.`);
    }
    setConfirmWorkshop(null);
    setWorkshopView("list");
  };

  return (
    <View style={styles.stack}>
      <TabBar
        active={tab}
        onChange={(nextTab) => {
          setTab(nextTab);
          if (nextTab !== "workshops") {
            setWorkshopView("list");
            setSelectedWorkshop(null);
          }
        }}
        tabs={[
          { key: "dashboard", label: "Dashboard" },
          { key: "workshops", label: "Workshops" },
          { key: "stats", label: "Stats" },
          { key: "profile", label: "Profile" },
        ]}
      />
      {tab === "dashboard" ? (
        <Dashboard stats={derivedStats} onOpenWorkshops={openWorkshops} />
      ) : null}
      {tab === "workshops" ? (
        <WorkshopWorkspace
          loading={loading}
          view={workshopView}
          workshops={workshops}
          selectedWorkshop={selectedWorkshop}
          message={message}
          onClearMessage={() => setMessage(null)}
          onCreate={() => {
            setSelectedWorkshop(null);
            setWorkshopView("create");
          }}
          onBack={() => {
            setWorkshopView("list");
            setSelectedWorkshop(null);
          }}
          onView={(workshop) => {
            setSelectedWorkshop(workshop);
            setWorkshopView("detail");
          }}
          onEdit={(workshop) => {
            setSelectedWorkshop(workshop);
            setWorkshopView("edit");
          }}
          onCancelRequest={setConfirmWorkshop}
          onCreateSubmit={handleCreate}
          onEditSubmit={handleUpdate}
        />
      ) : null}
      {tab === "stats" ? (
        <RegistrationStats stats={derivedStats} workshops={workshops} />
      ) : null}
      {tab === "profile" ? <OrganizerProfile account={account} /> : null}
      <ConfirmActionModal
        visible={Boolean(confirmWorkshop)}
        workshop={confirmWorkshop}
        onCancel={() => setConfirmWorkshop(null)}
        onConfirm={handleConfirmCancel}
      />
    </View>
  );
}

function Dashboard({
  stats,
  onOpenWorkshops,
}: {
  stats: OrganizerStats;
  onOpenWorkshops: () => void;
}) {
  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>Organizer Dashboard</Text>
        <Text style={styles.body}>
          Mobile admin demo for workshop readiness, registrations, payment
          coverage, and check-in progress.
        </Text>
        <Button label="Create or manage workshops" onPress={onOpenWorkshops} />
      </Card>
      <View style={styles.grid}>
        <StatCard label="Workshops" value={stats.totalWorkshops} />
        <StatCard label="Registrations" value={stats.totalRegistrations} />
        <StatCard label="Checked in" value={stats.checkedInCount} />
        <StatCard label="Paid regs" value={stats.paidRegistrationCount} />
        <StatCard label="Cancelled" value={stats.cancelledWorkshops} danger />
      </View>
    </View>
  );
}

function WorkshopWorkspace({
  loading,
  view,
  workshops,
  selectedWorkshop,
  message,
  onClearMessage,
  onCreate,
  onBack,
  onView,
  onEdit,
  onCancelRequest,
  onCreateSubmit,
  onEditSubmit,
}: {
  loading: boolean;
  view: WorkshopView;
  workshops: ManagedWorkshop[];
  selectedWorkshop: ManagedWorkshop | null;
  message: string | null;
  onClearMessage: () => void;
  onCreate: () => void;
  onBack: () => void;
  onView: (workshop: ManagedWorkshop) => void;
  onEdit: (workshop: ManagedWorkshop) => void;
  onCancelRequest: (workshop: ManagedWorkshop) => void;
  onCreateSubmit: (values: WorkshopFormValues) => void;
  onEditSubmit: (values: WorkshopFormValues) => void;
}) {
  if (view === "create") {
    return (
      <WorkshopFormScreen
        mode="create"
        onCancel={onBack}
        onSubmit={onCreateSubmit}
      />
    );
  }

  if (view === "edit" && selectedWorkshop) {
    return (
      <WorkshopFormScreen
        mode="edit"
        workshop={selectedWorkshop}
        onCancel={() => onView(selectedWorkshop)}
        onSubmit={onEditSubmit}
      />
    );
  }

  if (view === "detail" && selectedWorkshop) {
    return (
      <OrganizerWorkshopDetail
        workshop={selectedWorkshop}
        onBack={onBack}
        onEdit={() => onEdit(selectedWorkshop)}
        onCancel={() => onCancelRequest(selectedWorkshop)}
      />
    );
  }

  return (
    <OrganizerWorkshopList
      loading={loading}
      workshops={workshops}
      message={message}
      onClearMessage={onClearMessage}
      onCreate={onCreate}
      onView={onView}
      onEdit={onEdit}
      onCancel={onCancelRequest}
    />
  );
}

function OrganizerWorkshopList({
  loading,
  workshops,
  message,
  onClearMessage,
  onCreate,
  onView,
  onEdit,
  onCancel,
}: {
  loading: boolean;
  workshops: ManagedWorkshop[];
  message: string | null;
  onClearMessage: () => void;
  onCreate: () => void;
  onView: (workshop: ManagedWorkshop) => void;
  onEdit: (workshop: ManagedWorkshop) => void;
  onCancel: (workshop: ManagedWorkshop) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [feeFilter, setFeeFilter] = useState<FeeFilter>("ALL");

  const filteredWorkshops = workshops.filter((workshop) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      workshop.title.toLowerCase().includes(normalizedQuery) ||
      workshop.speaker.toLowerCase().includes(normalizedQuery);
    const matchesStatus =
      statusFilter === "ALL" || workshop.status === statusFilter;
    const matchesFee = feeFilter === "ALL" || workshop.feeType === feeFilter;

    return matchesQuery && matchesStatus && matchesFee;
  });

  if (loading) {
    return (
      <Card>
        <Text style={styles.title}>Loading workshops...</Text>
        <Text style={styles.body}>Preparing admin workshop data.</Text>
      </Card>
    );
  }

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Text style={styles.title}>Workshop Management</Text>
            <Text style={styles.body}>
              Create, edit, publish, and cancel workshop sessions for the
              UniHub demo.
            </Text>
          </View>
          <Button label="Create Workshop" onPress={onCreate} />
        </View>
        <Text style={styles.todo}>
          UI role guards only improve user experience. Real authorization must
          be enforced by backend RBAC middleware using JWT role claims.
        </Text>
        {message ? (
          <View style={styles.messageRow}>
            <Text style={styles.success}>{message}</Text>
            <Button label="OK" onPress={onClearMessage} variant="secondary" />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Filters</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title or speaker"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <Text style={styles.filterLabel}>Status</Text>
        <TabBar
          active={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { key: "ALL", label: "All" },
            { key: "DRAFT", label: "Draft" },
            { key: "PUBLISHED", label: "Published" },
            { key: "FULL", label: "Full" },
            { key: "CANCELLED", label: "Cancelled" },
          ]}
        />
        <Text style={styles.filterLabel}>Fee</Text>
        <TabBar
          active={feeFilter}
          onChange={setFeeFilter}
          tabs={[
            { key: "ALL", label: "All" },
            { key: "FREE", label: "Free" },
            { key: "PAID", label: "Paid" },
          ]}
        />
      </Card>

      {filteredWorkshops.length === 0 ? (
        <EmptyState
          title="No workshops found"
          body="Try changing the search text or filters, or create a new workshop."
        />
      ) : (
        filteredWorkshops.map((workshop) => (
          <OrganizerWorkshopCard
            key={workshop.id}
            workshop={workshop}
            onView={() => onView(workshop)}
            onEdit={() => onEdit(workshop)}
            onCancel={() => onCancel(workshop)}
          />
        ))
      )}
    </View>
  );
}

function OrganizerWorkshopCard({
  workshop,
  onView,
  onEdit,
  onCancel,
}: {
  workshop: ManagedWorkshop;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <WorkshopStatusBadge status={workshop.status} />
        <FeeBadge feeType={workshop.feeType} />
      </View>
      <Text style={styles.workshopTitle}>{workshop.title}</Text>
      <Text style={styles.meta}>{workshop.speaker}</Text>
      <Text style={styles.meta}>
        {workshop.date}, {workshop.time} - {workshop.room}
      </Text>
      <View style={styles.metricGrid}>
        <Metric label="Capacity" value={workshop.capacity} />
        <Metric label="Registered" value={workshop.registrations} />
        <Metric label="Remaining" value={workshop.remainingSeats} />
      </View>
      <View style={styles.actions}>
        <Button label="View Detail" onPress={onView} variant="secondary" />
        <Button label="Edit" onPress={onEdit} variant="secondary" />
        <Button
          label={workshop.registrations > 0 ? "Cancel" : "Cancel/Delete"}
          onPress={onCancel}
          variant="danger"
        />
      </View>
    </Card>
  );
}

function OrganizerWorkshopDetail({
  workshop,
  onBack,
  onEdit,
  onCancel,
}: {
  workshop: ManagedWorkshop;
  onBack: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const revenue = workshop.feeType === "PAID" ? workshop.revenue : 0;

  return (
    <View style={styles.stack}>
      <Button label="Back to list" onPress={onBack} variant="secondary" />
      <Card>
        <View style={styles.rowBetween}>
          <WorkshopStatusBadge status={workshop.status} />
          <FeeBadge feeType={workshop.feeType} />
        </View>
        <Text style={styles.detailTitle}>{workshop.title}</Text>
        <Text style={styles.meta}>{workshop.speaker}</Text>
        <Text style={styles.meta}>{workshop.speakerBio}</Text>
        <Text style={styles.meta}>
          {workshop.date}, {workshop.time} - {workshop.room}
        </Text>
        <Text style={styles.body}>{workshop.description}</Text>
        <View style={styles.mapBox}>
          <Text style={styles.sectionTitle}>Room / map note</Text>
          <Text style={styles.body}>{workshop.roomHint || "No room note yet."}</Text>
        </View>
        <Text style={styles.sectionTitle}>AI summary preview</Text>
        <Text style={styles.body}>{workshop.summary}</Text>
        <View style={styles.metricGrid}>
          <Metric label="Capacity" value={workshop.capacity} />
          <Metric label="Registered" value={workshop.registrations} />
          <Metric label="Checked in" value={workshop.checkedIn} />
          <Metric label="Remaining" value={workshop.remainingSeats} />
        </View>
        <Text style={styles.revenue}>
          Revenue estimate: {revenue.toLocaleString("vi-VN")} VND
        </Text>
        <View style={styles.actions}>
          <Button label="Edit" onPress={onEdit} />
          <Button label="Cancel/Delete" onPress={onCancel} variant="danger" />
        </View>
      </Card>
    </View>
  );
}

function RegistrationStats({
  stats,
  workshops,
}: {
  stats: OrganizerStats;
  workshops: ManagedWorkshop[];
}) {
  const maxRegistrations = Math.max(
    1,
    ...workshops.map((item) => item.registrations),
  );

  return (
    <View style={styles.stack}>
      <Card>
        <Text style={styles.title}>Registration Statistics</Text>
        <Text style={styles.body}>
          {stats.totalRegistrations} total registrations across career week.
        </Text>
      </Card>
      {workshops.map((workshop) => (
        <Card key={workshop.id}>
          <Text style={styles.itemTitle}>{workshop.title}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(
                    8,
                    (workshop.registrations / maxRegistrations) * 100,
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.meta}>
            {workshop.registrations} registered - {workshop.checkedIn} checked in
          </Text>
        </Card>
      ))}
    </View>
  );
}

function OrganizerProfile({ account }: { account: Account }) {
  return (
    <Card>
      <Badge label="ORGANIZER" tone="warning" />
      <Text style={styles.title}>{account.name}</Text>
      <Text style={styles.meta}>{account.email}</Text>
      <Text style={styles.todo}>
        UI role guards only improve user experience. Real access control must
        be enforced by backend middleware/security filters using JWT role
        claims.
      </Text>
    </Card>
  );
}

function StatCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <Card>
      <Text style={[styles.statValue, danger && styles.danger]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function buildStats(
  workshops: ManagedWorkshop[],
  fallback: OrganizerStats | null,
): OrganizerStats {
  if (workshops.length === 0 && fallback) {
    return fallback;
  }

  return {
    totalWorkshops: workshops.length,
    totalRegistrations: workshops.reduce(
      (sum, item) => sum + item.registrations,
      0,
    ),
    checkedInCount: workshops.reduce((sum, item) => sum + item.checkedIn, 0),
    paidRegistrationCount: workshops
      .filter((item) => item.feeType === "PAID")
      .reduce((sum, item) => sum + item.registrations, 0),
    cancelledWorkshops: workshops.filter((item) => item.status === "CANCELLED")
      .length,
  };
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  grid: {
    gap: spacing.md,
  },
  rowBetween: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  flex: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 25,
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
    marginTop: spacing.md,
  },
  workshopTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  todo: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  success: {
    color: colors.success,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  messageRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 32,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  danger: {
    color: colors.danger,
  },
  barTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 12,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: "100%",
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  filterLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metric: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    minWidth: 104,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  mapBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  revenue: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
    marginTop: spacing.lg,
  },
});
